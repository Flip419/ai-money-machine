// Shared by Deno and the Node tests. Never log headers or signing secrets.
export async function validSignature(raw, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = header.split(';').map(part => part.trim().split('='));
  const timestamps = parts.filter(([key]) => key === 'ts');
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1])) return false;
  const timestamp = timestamps[0][1];
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  const signatures = parts.filter(([key, value]) => key === 'h1' && /^[a-fA-F0-9]{64}$/.test(value));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const prefix = encoder.encode(`${timestamp}:`);
  const message = new Uint8Array(prefix.length + raw.length);
  message.set(prefix);
  message.set(raw, prefix.length);
  for (const [, hex] of signatures) {
    const bytes = Uint8Array.from(hex.match(/../g), byte => parseInt(byte, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, message)) return true;
  }
  return false;
}
