import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest as auth } from '../functions/api/auth.js';
import { onRequest as passwords } from '../functions/api/passwords.js';
import { sha256, passwordHash } from '../functions/lib/security.js';

class KV {
  values = new Map();
  async get(key, options) { const value = this.values.get(key); return value === undefined ? null : options?.type === 'json' ? JSON.parse(value) : value; }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { this.values.delete(key); }
}
function request(path, method = 'GET', body, cookie, extra = {}) {
  const headers = { Origin: 'https://vault.test', 'Content-Type': 'application/json', 'X-PM-Request': '1', ...extra };
  if (cookie) headers.Cookie = cookie;
  return new Request('https://vault.test/api/' + path, { method, headers, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
}
const call = (handler, kv, req) => handler({ request: req, env: { PASSWORD_KV: kv } });
async function login(kv, username = 'alice', password = 'long-password-123') {
  const res = await call(auth, kv, request('auth', 'POST', { type: 'login', username, password }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('Set-Cookie'), /HttpOnly; SameSite=Strict; Max-Age=86400; Secure/);
  assert.equal((await res.json()).data.token, undefined);
  return res.headers.get('Set-Cookie').split(';')[0];
}
test('register, cookie session, CRUD, isolation, rotation, expiry and logout', async () => {
  const kv = new KV();
  for (const username of ['alice', 'bob']) {
    const res = await call(auth, kv, request('auth', 'POST', { type: 'register', username, password: 'long-password-123' }));
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(await kv.get('user:' + username)).algorithm, 'pbkdf2-sha256');
  }
  const cookie = await login(kv);
  const info = await call(auth, kv, request('auth', 'GET', null, cookie));
  assert.equal((await info.json()).data.username, 'alice');
  assert.equal(info.headers.get('Cache-Control'), 'no-store');
  const added = await call(passwords, kv, request('passwords', 'POST', { platform: 'test', account: 'alice', password: 'secret' }, cookie));
  assert.equal(added.status, 200);
  const item = (await added.json()).data;
  assert.ok(!String(await kv.get('data:alice')).includes('secret'));
  const read = await call(passwords, kv, request('passwords', 'GET', null, cookie));
  assert.equal((await read.json()).data[0].password, 'secret');
  assert.equal((await call(passwords, kv, request('passwords', 'PUT', { ...item, password: 'changed' }, cookie))).status, 200);
  const bob = await login(kv, 'bob');
  assert.deepEqual((await (await call(passwords, kv, request('passwords', 'GET', null, bob))).json()).data, []);
  assert.equal((await call(passwords, kv, request('passwords', 'DELETE', { id: item.id }, cookie))).status, 200);
  const rotated = await call(auth, kv, request('auth', 'POST', { type: 'login', username: 'alice', password: 'long-password-123' }, cookie));
  assert.equal(rotated.status, 200);
  assert.equal((await call(auth, kv, request('auth', 'GET', null, cookie))).status, 401);
  const current = rotated.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await call(auth, kv, request('auth', 'POST', { type: 'logout' }, current))).status, 200);
  assert.equal((await call(passwords, kv, request('passwords', 'GET', null, current))).status, 401);
  const key = 'session:v2:' + bob.split('=')[1];
  const session = JSON.parse(await kv.get(key));
  await kv.put(key, JSON.stringify({ ...session, expiresAt: Date.now() - 1 }));
  assert.equal((await call(auth, kv, request('auth', 'GET', null, bob))).status, 401);
});
test('legacy hash upgrades without changing salt or losing encrypted vault', async () => {
  const kv = new KV();
  const password = 'oldpwd', salt = 'original-salt';
  await kv.put('user:alice', JSON.stringify({ salt, hash: await sha256(password + salt) }));
  // Construct actual ciphertext with the original derivation, independent of the new handler.
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(await sha256(password + salt + 'encryption')), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify([{ password: 'saved-secret' }])));
  const encoded = JSON.stringify({ iv: Buffer.from(iv).toString('hex'), data: Buffer.from(cipher).toString('hex') });
  await kv.put('data:alice', encoded);
  const cookie = await login(kv, 'alice', password);
  const user = JSON.parse(await kv.get('user:alice'));
  assert.equal(user.salt, salt);
  assert.equal(user.hash, await passwordHash(password, salt));
  assert.equal(await kv.get('data:alice'), encoded);
  const res = await call(passwords, kv, request('passwords', 'GET', null, cookie));
  assert.equal((await res.json()).data[0].password, 'saved-secret');
});
test('reject CSRF, malformed JSON, weak new passwords, bad credentials and old bearer tokens', async () => {
  const kv = new KV();
  assert.equal((await call(auth, kv, request('auth', 'POST', {}, null, { Origin: 'https://evil.test' }))).status, 403);
  assert.equal((await call(auth, kv, request('auth', 'POST', null))).status, 400);
  assert.equal((await call(auth, kv, request('auth', 'POST', { type: 'register', username: 'alice', password: '123456' }))).status, 400);
  assert.equal((await call(auth, kv, request('auth', 'POST', { type: 'login', username: 'alice', password: 'wrong-password' }))).status, 401);
  await kv.put('session:old-token', JSON.stringify({ username: 'alice' }));
  assert.equal((await call(passwords, kv, request('passwords', 'GET', null, null, { Authorization: 'Bearer old-token' }))).status, 401);
  assert.equal((await call(passwords, kv, request('passwords', 'DELETE', {}, null, { 'X-PM-Request': '' }))).status, 403);
});
test('throttles repeated attempts and fails closed when storage is unavailable', async () => {
  const kv = new KV();
  const body = { type: 'login', username: 'alice', password: 'wrong-password' };
  for (let i = 0; i < 10; i++) assert.equal((await call(auth, kv, request('auth', 'POST', body))).status, 401);
  assert.equal((await call(auth, kv, request('auth', 'POST', body))).status, 429);
  kv.get = async () => { throw new Error('offline'); };
  assert.equal((await call(auth, kv, request('auth', 'POST', body))).status, 503);
});
test('corrupt ciphertext is never silently replaced by an empty vault', async () => {
  const kv = new KV();
  await call(auth, kv, request('auth', 'POST', { type: 'register', username: 'alice', password: 'long-password-123' }));
  const cookie = await login(kv);
  const corrupt = JSON.stringify({ iv: '00'.repeat(12), data: '00'.repeat(32) });
  await kv.put('data:alice', corrupt);
  assert.equal((await call(passwords, kv, request('passwords', 'GET', null, cookie))).status, 500);
  assert.equal((await call(passwords, kv, request('passwords', 'POST', { platform: 'x', account: 'y', password: 'z' }, cookie))).status, 500);
  assert.equal(await kv.get('data:alice'), corrupt);
});
