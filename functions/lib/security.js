export const SESSION_TTL = 86400;
export const HASH_ITERATIONS = 100000;
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: HASH_ITERATIONS }, key, 256));
}
export function equalHash(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...headers
  } });
}
export function mutationAllowed(request) {
  return request.headers.get('Origin') === new URL(request.url).origin &&
    request.headers.get('X-PM-Request') === '1' &&
    request.headers.get('Content-Type')?.split(';')[0].trim() === 'application/json';
}
export function sessionToken(request) {
  const cookie = (request.headers.get('Cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith('pm_session='));
  const token = cookie?.slice('pm_session='.length);
  return /^[a-f0-9-]{36}$/.test(token || '') ? token : null;
}
export function sessionCookie(request, token, maxAge = SESSION_TTL) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `pm_session=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
export async function readSession(request, kv) {
  const token = sessionToken(request);
  if (!token) return null;
  const session = await kv.get(`session:v2:${token}`, { type: 'json' });
  if (!session || typeof session.username !== 'string' || !/^[a-f0-9]{64}$/.test(session.encryptionKey || '') ||
      !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
  return session;
}
// KV is eventually consistent: best-effort only. Also configure edge rate limiting.
export async function allowAuthAttempt(request, kv, username) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const bucket = Math.floor(Date.now() / 900000);
  for (const [scope, value, limit] of [['ip', ip, 30], ['user', username, 10]]) {
    const key = `auth-limit:${scope}:${bucket}:${await sha256(value)}`;
    const count = Number(await kv.get(key) || 0);
    if (count >= limit) return false;
    await kv.put(key, String(count + 1), { expirationTtl: 1800 });
  }
  return true;
}
