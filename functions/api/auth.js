export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await request.json();
    const { type, username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username and password required' }), { status: 400 });
    }

    const USER_KEY = `user:${username}`;

    // 密码哈希函数
    const hashPassword = async (pwd, salt) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // 生成加密密钥（基于密码派生，用于数据加密）
    const deriveEncryptionKey = async (pwd, salt) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(pwd + salt + 'encryption');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    if (type === 'register') {
      const existing = await env.PASSWORD_KV.get(USER_KEY);
      if (existing) {
        return new Response(JSON.stringify({ success: false, message: 'User already exists' }), { status: 409 });
      }

      const salt = crypto.randomUUID();
      const hash = await hashPassword(password, salt);

      await env.PASSWORD_KV.put(USER_KEY, JSON.stringify({ hash, salt, createdAt: Date.now() }));
      
      return new Response(JSON.stringify({ success: true, message: 'Registered successfully' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (type === 'login') {
      const userDataStr = await env.PASSWORD_KV.get(USER_KEY);
      if (!userDataStr) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
      }

      const userData = JSON.parse(userDataStr);
      const hash = await hashPassword(password, userData.salt);

      if (hash !== userData.hash) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), { status: 401 });
      }

      // 创建会话
      const token = crypto.randomUUID();
      const encryptionKey = await deriveEncryptionKey(password, userData.salt);
      
      // 存储会话信息（包含加密密钥）
      await env.PASSWORD_KV.put(`session:${token}`, JSON.stringify({
        username,
        encryptionKey,
        createdAt: Date.now()
      }), { expirationTtl: 86400 });

      return new Response(JSON.stringify({ 
        success: true, 
        data: { token, username }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid type' }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500 });
  }
}
