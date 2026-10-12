import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthController } from '../auth-controller.mjs';
import { requireAuthenticatedUser } from '../supabase/functions/_shared/auth.ts';

const userId = '11111111-1111-4111-8111-111111111111';
test('auth restores sessions, signs in/up/out and observes auth transitions', async () => {
  let listener;
  let signedOut;
  const rendered = [];
  const calls = [];
  const auth = {
    onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() {} } } }; },
    async getSession() { return { data: { session: { user: { id: userId } } }, error: null }; },
    async signInWithPassword(input) { calls.push(input); listener('SIGNED_IN', { user: { id: userId } }); return { error: null }; },
    async signUp(input) { calls.push(input); return { data: { session: null }, error: null }; },
    async signOut(input) { signedOut = input; listener('SIGNED_OUT', null); return { error: null }; },
  };
  const controller = createAuthController({ auth }, user => rendered.push(user));
  await controller.initialize();
  assert.equal(rendered.at(-1).id, userId);
  assert.equal(await controller.signIn('example@example.invalid', 'test-password'), 'Signed in.');
  assert.match(await controller.signUp('example@example.invalid', 'test-password', 'https://example.invalid/app/'), /confirm/);
  assert.equal(calls[1].options.emailRedirectTo, 'https://example.invalid/app/');
  await controller.signOut();
  assert.deepEqual(signedOut, { scope: 'local' });
  assert.equal(rendered.at(-1), null);
  controller.dispose();
});
test('stale restoration cannot undo a newer sign-out; auth errors propagate', async () => {
  let listener, resolveSession;
  const rendered = [];
  const auth = {
    onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() {} } } }; },
    getSession() { return new Promise(resolve => { resolveSession = resolve; }); },
    async signInWithPassword() { return { error: new Error('rejected') }; },
  };
  const controller = createAuthController({ auth }, user => rendered.push(user));
  const restoring = controller.initialize();
  listener('SIGNED_OUT', null);
  resolveSession({ data: { session: { user: { id: userId } } }, error: null });
  await restoring;
  assert.deepEqual(rendered, [null]);
  await assert.rejects(controller.signIn('x', 'y'), /rejected/);
});
test('backend identity comes only from verified Auth response, never request body', async () => {
  const request = new Request('https://example.invalid/checkout', {
    method: 'POST', headers: { Authorization: 'Bearer local-test-token' },
    body: JSON.stringify({ user_id: 'attacker', email: 'attacker@example.invalid' }),
  });
  let requests = 0;
  const result = await requireAuthenticatedUser(request, { url: 'https://project.example.invalid', anonKey: 'public-test-key' }, async (url, options) => {
    requests++;
    assert.equal(url, 'https://project.example.invalid/auth/v1/user');
    assert.equal(options.headers.Authorization, 'Bearer local-test-token');
    return Response.json({ id: userId });
  });
  assert.deepEqual(result, { id: userId });
  assert.equal(requests, 1);
  await assert.rejects(requireAuthenticatedUser(new Request('https://example.invalid'), { url: '', anonKey: '' }), e => e.status === 401);
  await assert.rejects(requireAuthenticatedUser(request, { url: '', anonKey: '' }, async () => new Response('', { status: 401 })), e => e.status === 401);
  await assert.rejects(requireAuthenticatedUser(request, { url: '', anonKey: '' }, async () => Response.json({ id: userId, is_anonymous: true })), e => e.status === 401);
  await assert.rejects(requireAuthenticatedUser(request, { url: '', anonKey: '' }, async () => { throw new Error('offline'); }), e => e.status === 503);
});
