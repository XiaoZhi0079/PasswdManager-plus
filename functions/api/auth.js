import { json, sha256, passwordHash, equalHash, HASH_ITERATIONS, SESSION_TTL,
  mutationAllowed, sessionToken, sessionCookie, readSession, allowAuthAttempt } from '../lib/security.js';

const error = (message, status, code) => json({ success: false, message, code }, status);

export async function onRequest({ request, env }) {
  if (!['GET', 'POST'].includes(request.method)) return error('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  if (request.method === 'POST' && !mutationAllowed(request)) return error('请求来源或格式不受信任', 403, 'CSRF_REJECTED');
  if (!env?.PASSWORD_KV) return error('服务配置错误：KV 存储未绑定', 500, 'KV_NOT_BOUND');
  const kv = env.PASSWORD_KV;
  try {
    if (request.method === 'GET') {
      const session = await readSession(request, kv);
      return session ? json({ success: true, data: { username: session.username } }) : error('请重新登录', 401, 'SESSION_EXPIRED');
    }
    let body;
    try { body = await request.json(); } catch { return error('请求体格式错误', 400, 'INVALID_JSON'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('请求体格式错误', 400, 'INVALID_JSON');
    const { type, username, password } = body;
    if (type === 'logout') {
      const token = sessionToken(request);
      if (token) await kv.delete(`session:v2:${token}`);
      return json({ success: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
    }
    if (!['register', 'login'].includes(type)) return error('无效的操作类型', 400, 'INVALID_TYPE');
    if (typeof username !== 'string' || !/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,50}$/.test(username)) return error('用户名格式不正确', 400, 'INVALID_USERNAME');
    const minLength = type === 'register' ? 12 : 6;
    if (typeof password !== 'string' || password.length < minLength || password.length > 100) return error(`密码长度需为 ${minLength}-100 个字符`, 400, 'INVALID_PASSWORD');
    if (!await allowAuthAttempt(request, kv, username)) return json({ success: false, message: '尝试过于频繁，请稍后重试', code: 'RATE_LIMITED' }, 429, { 'Retry-After': '900' });
    const key = `user:${username}`;
    const user = await kv.get(key, { type: 'json' });
    if (type === 'register') {
      if (user) return error('用户名已存在', 409, 'USER_EXISTS');
      const salt = crypto.randomUUID();
      const hash = await passwordHash(password, salt);
      await kv.put(key, JSON.stringify({ hash, salt, algorithm: 'pbkdf2-sha256', iterations: HASH_ITERATIONS, createdAt: Date.now() }));
      return json({ success: true, message: '注册成功' });
    }
    if (!user) {
      await passwordHash(password, 'nonexistent-user');
      return error('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
    }
    if (typeof user.salt !== 'string' || typeof user.hash !== 'string' ||
        (user.algorithm && (user.algorithm !== 'pbkdf2-sha256' || user.iterations !== HASH_ITERATIONS))) {
      return error('用户数据格式不受支持', 500, 'DATA_CORRUPTED');
    }
    const hash = user.algorithm ? await passwordHash(password, user.salt) : await sha256(password + user.salt);
    if (!equalHash(hash, user.hash)) return error('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
    if (!user.algorithm) {
      // Preserve salt and vault key derivation so old ciphertext remains readable.
      await kv.put(key, JSON.stringify({ ...user, hash: await passwordHash(password, user.salt), algorithm: 'pbkdf2-sha256', iterations: HASH_ITERATIONS }));
    }
    const token = crypto.randomUUID();
    const encryptionKey = await sha256(password + user.salt + 'encryption');
    const now = Date.now();
    await kv.put(`session:v2:${token}`, JSON.stringify({ username, encryptionKey, createdAt: now, expiresAt: now + SESSION_TTL * 1000 }), { expirationTtl: SESSION_TTL });
    const previous = sessionToken(request);
    if (previous) await kv.delete(`session:v2:${previous}`);
    return json({ success: true, data: { username } }, 200, { 'Set-Cookie': sessionCookie(request, token) });
  } catch {
    return error('认证服务暂时不可用，请稍后重试', 503, 'AUTH_SERVICE_ERROR');
  }
}
