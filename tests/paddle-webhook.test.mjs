import test from 'node:test';
import assert from 'node:assert/strict';
import { validSignature } from '../supabase/functions/paddle-webhook/signature.mjs';

const secret = 'local-test-secret-only';
const encoder = new TextEncoder();
async function sign(raw, ts = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prefix = encoder.encode(`${ts}:`);
  const data = new Uint8Array(prefix.length + raw.length);
  data.set(prefix); data.set(raw, prefix.length);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  return `ts=${ts};h1=${Array.from(digest, x => x.toString(16).padStart(2, '0')).join('')}`;
}
test('signatures reject tampering, wrong secrets, expired timestamps, and missing headers', async () => {
  const body = encoder.encode('{"data":"résumé"}');
  const header = await sign(body, 1000);
  assert.equal(await validSignature(body, header, secret, 1000), true);
  assert.equal(await validSignature(encoder.encode('{}'), header, secret, 1000), false);
  assert.equal(await validSignature(body, header, 'wrong', 1000), false);
  assert.equal(await validSignature(body, header, secret, 1301), false);
  assert.equal(await validSignature(body, null, secret, 1000), false);
});
test('handler authenticates, persists duplicates once, and returns retryable failures', async () => {
  let handler;
  const variables = { PADDLE_WEBHOOK_SECRET: secret, SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'local-test-service-key', PADDLE_ENVIRONMENT: 'sandbox' };
  globalThis.Deno = { env: { get: name => variables[name] }, serve: fn => { handler = fn; } };
  await import('../supabase/functions/paddle-webhook/index.ts');
  const originalFetch = globalThis.fetch;
  const inbox = new Map();
  let unavailable = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://example.invalid/rest/v1/paddle_webhook_events?on_conflict=environment,event_id');
    assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
    if (unavailable) return new Response('', { status: 500 });
    const row = JSON.parse(options.body);
    // Exact insert contract for the applied event inbox schema.
    assert.deepEqual(Object.keys(row).sort(), ['environment', 'event_id', 'event_type', 'occurred_at', 'payload']);
    assert.equal(row.environment, 'sandbox');
    assert.equal(row.event_id, row.payload.event_id);
    assert.equal(row.event_type, row.payload.event_type);
    assert.equal(row.occurred_at, row.payload.occurred_at);
    assert.ok(Number.isFinite(Date.parse(row.occurred_at)));
    const key = `${row.environment}:${row.event_id}`;
    if (!inbox.has(key)) inbox.set(key, row);
    return new Response(null, { status: 201 });
  };
  try {
    const body = encoder.encode(JSON.stringify({ event_id: 'evt_localtest', event_type: 'transaction.completed',
      occurred_at: new Date().toISOString(), data: { id: 'txn_localtest' } }));
    const signature = await sign(body);
    const request = header => new Request('https://example.invalid/webhook', {
      method: 'POST', body, headers: { 'Paddle-Signature': header },
    });
    assert.equal((await handler(request('invalid'))).status, 401);
    assert.equal(inbox.size, 0);
    assert.equal((await handler(request(signature))).status, 200);
    assert.equal((await handler(request(signature))).status, 200);
    assert.equal(inbox.size, 1);
    const methodResponse = await handler(new Request('https://example.invalid/webhook'));
    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get('Allow'), 'POST');
    for (const invalid of ['{', 'null', '[]', '{}']) {
      const raw = encoder.encode(invalid);
      assert.equal((await handler(new Request('https://example.invalid/webhook', {
        method: 'POST', body: raw, headers: { 'Paddle-Signature': await sign(raw) },
      }))).status, 400);
    }
    const ignored = encoder.encode(JSON.stringify({ event_id: 'evt_ignored', event_type: 'customer.created',
      occurred_at: new Date().toISOString(), data: { id: 'ctm_test' } }));
    assert.equal((await handler(new Request('https://example.invalid/webhook', {
      method: 'POST', body: ignored, headers: { 'Paddle-Signature': await sign(ignored) },
    }))).status, 200);
    assert.equal(inbox.size, 1);
    assert.equal((await handler(new Request('https://example.invalid/webhook', {
      method: 'POST', body: new Uint8Array(1024 * 1024 + 1),
    }))).status, 413);
    unavailable = true;
    assert.equal((await handler(request(signature))).status, 503);
    delete variables.PADDLE_WEBHOOK_SECRET;
    assert.equal((await handler(request(signature))).status, 503);
  } finally { globalThis.fetch = originalFetch; delete globalThis.Deno; }
});
