// 统一响应格式
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

// 错误响应
const errorResponse = (message, status = 400, code = 'ERROR') => {
  return jsonResponse({ success: false, message, code }, status);
};

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

// 验证用户名格式
const validateUsername = (username) => {
  if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
    return '用户名长度需在 3-50 个字符之间';
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return '用户名只能包含字母、数字、下划线和中文';
  }
  return null;
};

// 验证密码强度
const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 6) {
    return '密码长度至少 6 个字符';
  }
  if (password.length > 100) {
    return '密码长度不能超过 100 个字符';
  }
  return null;
};

export async function onRequest(context) {
  const { request, env } = context;
  
  // 检查请求方法
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  // 检查 KV 绑定是否存在
  if (!env || !env.PASSWORD_KV) {
    console.error('PASSWORD_KV binding is not configured');
    return errorResponse(
      '服务配置错误：KV 存储未绑定，请检查 Cloudflare Pages 的 KV 绑定配置',
      500,
      'KV_NOT_BOUND'
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse('请求体格式错误，需要有效的 JSON', 400, 'INVALID_JSON');
  }

  const { type, username, password } = body;

  // 验证必填字段
  if (!username || !password) {
    return errorResponse('用户名和密码不能为空', 400, 'MISSING_FIELDS');
  }

  // 验证用户名格式
  const usernameError = validateUsername(username);
  if (usernameError) {
    return errorResponse(usernameError, 400, 'INVALID_USERNAME');
  }

  // 验证密码格式
  const passwordError = validatePassword(password);
  if (passwordError) {
    return errorResponse(passwordError, 400, 'INVALID_PASSWORD');
  }

  const USER_KEY = `user:${username}`;

  try {
    if (type === 'register') {
      let existing;
      try {
        existing = await env.PASSWORD_KV.get(USER_KEY);
      } catch (kvError) {
        console.error('KV read error during registration:', kvError);
        return errorResponse('存储服务暂时不可用，请稍后重试', 503, 'KV_READ_ERROR');
      }

      if (existing) {
        return errorResponse('用户名已存在', 409, 'USER_EXISTS');
      }

      const salt = crypto.randomUUID();
      const hash = await hashPassword(password, salt);

      try {
        await env.PASSWORD_KV.put(USER_KEY, JSON.stringify({ hash, salt, createdAt: Date.now() }));
      } catch (kvError) {
        console.error('KV write error during registration:', kvError);
        return errorResponse('注册失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
      }
      
      return jsonResponse({ success: true, message: '注册成功' });
    }

    if (type === 'login') {
      let userDataStr;
      try {
        userDataStr = await env.PASSWORD_KV.get(USER_KEY);
      } catch (kvError) {
        console.error('KV read error during login:', kvError);
        return errorResponse('存储服务暂时不可用，请稍后重试', 503, 'KV_READ_ERROR');
      }

      if (!userDataStr) {
        return errorResponse('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
      }

      let userData;
      try {
        userData = JSON.parse(userDataStr);
      } catch (parseError) {
        console.error('User data parse error:', parseError);
        return errorResponse('用户数据损坏，请联系管理员', 500, 'DATA_CORRUPTED');
      }

      const hash = await hashPassword(password, userData.salt);

      if (hash !== userData.hash) {
        return errorResponse('用户名或密码错误', 401, 'INVALID_CREDENTIALS');
      }

      // 创建会话
      const token = crypto.randomUUID();
      const encryptionKey = await deriveEncryptionKey(password, userData.salt);
      
      try {
        // 存储会话信息（包含加密密钥）
        await env.PASSWORD_KV.put(`session:${token}`, JSON.stringify({
          username,
          encryptionKey,
          createdAt: Date.now()
        }), { expirationTtl: 86400 });
      } catch (kvError) {
        console.error('KV write error during session creation:', kvError);
        return errorResponse('登录失败，会话创建失败', 503, 'SESSION_CREATE_ERROR');
      }

      return jsonResponse({ 
        success: true, 
        data: { token, username }
      });
    }

    return errorResponse('无效的操作类型，请使用 register 或 login', 400, 'INVALID_TYPE');

  } catch (err) {
    console.error('Unexpected error in auth:', err);
    return errorResponse(
      '服务器内部错误，请稍后重试',
      500,
      'INTERNAL_ERROR'
    );
  }
}
