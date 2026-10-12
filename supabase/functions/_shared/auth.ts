// Reuse in future checkout/customer endpoints. Never authorize from request bodies.
export async function requireAuthenticatedUser(
  request: Request,
  config: { url: string; anonKey: string },
  fetcher: typeof fetch = fetch,
): Promise<{ id: string }> {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !/^Bearer [^\s]+$/i.test(authorization)) {
    throw new Response('Authentication required', { status: 401 });
  }
  let result: Response;
  try {
    // Supabase Auth verifies validity/expiry. Decoding JWT claims locally is insufficient.
    result = await fetcher(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.anonKey, Authorization: authorization },
    });
  } catch { throw new Response('Authentication unavailable', { status: 503 }); }
  if (!result.ok) {
    throw new Response(result.status >= 500 ? 'Authentication unavailable' : 'Invalid session', {
      status: result.status >= 500 ? 503 : 401,
    });
  }
  let user;
  try { user = await result.json(); }
  catch { throw new Response('Authentication unavailable', { status: 503 }); }
  if (typeof user.id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
      || user.is_anonymous === true) {
    throw new Response('Invalid session', { status: 401 });
  }
  return { id: user.id };
}
