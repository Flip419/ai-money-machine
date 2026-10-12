import { validSignature } from './signature.mjs';

const respond = (status: number, message: string) => new Response(message, {
  status, headers: status === 405 ? { Allow: 'POST' } : undefined,
});
const maxBodyBytes = 1024 * 1024;

async function readBody(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
  return raw;
}
const events = new Set([
  'transaction.completed', 'transaction.payment_failed',
  'subscription.created', 'subscription.activated', 'subscription.updated',
  'subscription.past_due', 'subscription.paused', 'subscription.resumed',
  'subscription.canceled', 'adjustment.created', 'adjustment.updated',
]);

Deno.serve(async request => {
  if (request.method !== 'POST') return respond(405, 'Method not allowed');
  const secret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const environment = Deno.env.get('PADDLE_ENVIRONMENT');
  if (!secret || !url || !serviceKey || !['sandbox', 'live'].includes(environment ?? '')) {
    return respond(503, 'Webhook configuration unavailable');
  }
  try {
    // Limit streamed bytes before buffering; verify before parsing/re-serialization.
    const raw = await readBody(request);
    if (raw === null) return respond(413, 'Payload too large');
    if (!await validSignature(raw, request.headers.get('Paddle-Signature'), secret)) {
      return respond(401, 'Invalid signature');
    }
    let event;
    try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
    catch { return respond(400, 'Invalid event'); }
    if (!event || typeof event !== 'object' || Array.isArray(event)
      || typeof event.event_id !== 'string' || !/^evt_[a-z0-9]+$/.test(event.event_id)
      || typeof event.event_type !== 'string' || !event.data || typeof event.data !== 'object'
      || Array.isArray(event.data) || typeof event.occurred_at !== 'string'
      || !Number.isFinite(Date.parse(event.occurred_at))) return respond(400, 'Invalid event');
    if (!events.has(event.event_type)) return respond(200, 'Ignored event');
    // Atomic unique-key insert: acknowledge duplicates, never overwrite prior events.
    // The durable inbox is NOT fulfillment. No premium access is granted here.
    const result = await fetch(`${url}/rest/v1/paddle_webhook_events?on_conflict=environment,event_id`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
      headers: {
        apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ environment, event_id: event.event_id,
        event_type: event.event_type, occurred_at: event.occurred_at, payload: event }),
    });
    // A failed persistence attempt must trigger Paddle's retry rather than lose an event.
    if (!result.ok) return respond(503, 'Event persistence unavailable');
    return respond(200, 'Accepted');
  } catch {
    // Do not disclose payloads, secrets, database errors, or authorization headers.
    return respond(503, 'Event processing unavailable');
  }
});
