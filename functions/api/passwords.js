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

// 加密工具函数
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data, encryptionKey, salt) {
  const key = await deriveKey(encryptionKey, salt);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(JSON.stringify(data))
  );
  
  return {
    iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
    data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('')
  };
}

async function decryptData(encryptedObj, encryptionKey, salt) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.data) {
    return null;
  }
  
  const key = await deriveKey(encryptionKey, salt);
  const iv = new Uint8Array(encryptedObj.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  const data = new Uint8Array(encryptedObj.data.match(/.{2}/g).map(byte => parseInt(byte, 16)));
  
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('未授权访问，请先登录', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token.length < 10) {
    return errorResponse('无效的认证令牌', 401, 'INVALID_TOKEN');
  }
  
  // 检查 KV 绑定
  if (!env || !env.PASSWORD_KV) {
    console.error('PASSWORD_KV binding is not configured');
    return errorResponse(
      '服务配置错误：KV 存储未绑定，请检查 Cloudflare Pages 的 KV 绑定配置',
      500,
      'KV_NOT_BOUND'
    );
  }

  // 验证会话并获取用户信息
  let sessionData;
  try {
    sessionData = await env.PASSWORD_KV.get(`session:${token}`, { type: 'json' });
  } catch (kvError) {
    console.error('KV read error during session validation:', kvError);
    return errorResponse('存储服务暂时不可用，请稍后重试', 503, 'KV_READ_ERROR');
  }

  let username;
  let encryptionKey;
  
  if (sessionData && sessionData.username) {
    // 新格式的会话数据
    username = sessionData.username;
    encryptionKey = sessionData.encryptionKey;
  } else {
    // 兼容旧格式（直接存储username字符串）
    try {
      username = await env.PASSWORD_KV.get(`session:${token}`);
    } catch (kvError) {
      console.error('KV read error during legacy session validation:', kvError);
      return errorResponse('存储服务暂时不可用，请稍后重试', 503, 'KV_READ_ERROR');
    }
    
    if (!username) {
      return errorResponse('会话已过期或无效，请重新登录', 401, 'SESSION_EXPIRED');
    }
    encryptionKey = token; // 旧格式使用token作为加密密钥
  }

  const KEY = `data:${username}`;
  
  let userDataStr;
  try {
    userDataStr = await env.PASSWORD_KV.get(`user:${username}`);
  } catch (kvError) {
    console.error('KV read error during user data fetch:', kvError);
    return errorResponse('存储服务暂时不可用，请稍后重试', 503, 'KV_READ_ERROR');
  }
  
  let userData;
  try {
    userData = userDataStr ? JSON.parse(userDataStr) : { salt: 'default-salt' };
  } catch (parseError) {
    console.error('User data parse error:', parseError);
    userData = { salt: 'default-salt' };
  }
  const salt = userData.salt;

  try {
    if (request.method === 'GET') {
      let encryptedData;
      try {
        encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      } catch (kvError) {
        console.error('KV read error during GET:', kvError);
        return errorResponse('获取数据失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
      }
      
      // 如果是加密数据，解密它
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        try {
          const decrypted = await decryptData(encryptedData, encryptionKey, salt);
          return jsonResponse({ success: true, data: decrypted || [] });
        } catch (decryptError) {
          console.error('Decryption error:', decryptError);
          return errorResponse('数据解密失败，可能是密钥不匹配', 500, 'DECRYPT_ERROR');
        }
      }
      
      // 兼容旧的未加密数据
      return jsonResponse({ success: true, data: encryptedData || [] });
    }

    if (request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        return errorResponse('请求体格式错误，需要有效的 JSON', 400, 'INVALID_JSON');
      }
      
      // 处理批量导入
      if (body.action === 'import') {
        const importData = body.data;
        if (!Array.isArray(importData)) {
          return errorResponse('导入数据格式错误，需要数组', 400, 'INVALID_IMPORT_DATA');
        }
        
        if (importData.length === 0) {
          return errorResponse('导入数据为空', 400, 'EMPTY_IMPORT_DATA');
        }
        
        if (importData.length > 1000) {
          return errorResponse('单次导入不能超过 1000 条记录', 400, 'IMPORT_LIMIT_EXCEEDED');
        }
        
        let encryptedData;
        try {
          encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        } catch (kvError) {
          console.error('KV read error during import:', kvError);
          return errorResponse('导入失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
        }
        
        let list = [];
        
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        const newItems = importData.map(item => ({
          platform: String(item.platform || '').slice(0, 200),
          account: String(item.account || '').slice(0, 200),
          password: String(item.password || '').slice(0, 500),
          remark: String(item.remark || '').slice(0, 1000),
          category: String(item.category || 'general').slice(0, 50),
          id: crypto.randomUUID(),
          updatedAt: Date.now(),
          createdAt: Date.now()
        }));
        
        list.push(...newItems);
        
        try {
          const encrypted = await encryptData(list, encryptionKey, salt);
          await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
        } catch (kvError) {
          console.error('KV write error during import:', kvError);
          return errorResponse('导入失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
        }
        
        return jsonResponse({ success: true, imported: newItems.length });
      }
      
      // 处理导出
      if (body.action === 'export') {
        let encryptedData;
        try {
          encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        } catch (kvError) {
          console.error('KV read error during export:', kvError);
          return errorResponse('导出失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
        }
        
        let list = [];
        
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        // 导出时移除敏感的内部字段
        const exportData = list.map(({ id, updatedAt, createdAt, ...rest }) => rest);
        
        return jsonResponse({ success: true, data: exportData });
      }

      // 添加新密码
      const newItem = body;
      if (!newItem.platform || !newItem.account || !newItem.password) {
        return errorResponse('平台、账号和密码不能为空', 400, 'MISSING_FIELDS');
      }

      let encryptedData;
      try {
        encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      } catch (kvError) {
        console.error('KV read error during add:', kvError);
        return errorResponse('添加失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
      }
      
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const item = {
        platform: String(newItem.platform).slice(0, 200),
        account: String(newItem.account).slice(0, 200),
        password: String(newItem.password).slice(0, 500),
        remark: String(newItem.remark || '').slice(0, 1000),
        category: String(newItem.category || 'general').slice(0, 50),
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
        createdAt: Date.now()
      };
      
      list.push(item);
      
      try {
        const encrypted = await encryptData(list, encryptionKey, salt);
        await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
      } catch (kvError) {
        console.error('KV write error during add:', kvError);
        return errorResponse('添加失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
      }
      
      return jsonResponse({ success: true, data: item });
    }

    if (request.method === 'PUT') {
      let updateItem;
      try {
        updateItem = await request.json();
      } catch (parseError) {
        return errorResponse('请求体格式错误，需要有效的 JSON', 400, 'INVALID_JSON');
      }
      
      if (!updateItem.id) {
        return errorResponse('缺少记录 ID', 400, 'MISSING_ID');
      }

      let encryptedData;
      try {
        encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      } catch (kvError) {
        console.error('KV read error during update:', kvError);
        return errorResponse('更新失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
      }
      
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const index = list.findIndex(i => i.id === updateItem.id);
      
      if (index === -1) {
        return errorResponse('记录不存在', 404, 'NOT_FOUND');
      }

      list[index] = { ...list[index], ...updateItem, updatedAt: Date.now() };
      
      try {
        const encrypted = await encryptData(list, encryptionKey, salt);
        await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
      } catch (kvError) {
        console.error('KV write error during update:', kvError);
        return errorResponse('更新失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
      }

      return jsonResponse({ success: true });
    }

    if (request.method === 'DELETE') {
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        return errorResponse('请求体格式错误，需要有效的 JSON', 400, 'INVALID_JSON');
      }
      
      const { id, permanent, action: deleteAction } = body;
      
      const TRASH_KEY = `trash:${username}`;
      
      // 获取回收站数据
      const getTrashList = async () => {
        try {
          const encryptedTrash = await env.PASSWORD_KV.get(TRASH_KEY, { type: 'json' });
          if (encryptedTrash && encryptedTrash.iv && encryptedTrash.data) {
            return await decryptData(encryptedTrash, encryptionKey, salt) || [];
          } else if (Array.isArray(encryptedTrash)) {
            return encryptedTrash;
          }
          return [];
        } catch (kvError) {
          console.error('KV read error during trash fetch:', kvError);
          throw new Error('KV_READ_ERROR');
        }
      };
      
      // 保存回收站数据
      const saveTrashList = async (trashList) => {
        try {
          const encrypted = await encryptData(trashList, encryptionKey, salt);
          await env.PASSWORD_KV.put(TRASH_KEY, JSON.stringify(encrypted));
        } catch (kvError) {
          console.error('KV write error during trash save:', kvError);
          throw new Error('KV_WRITE_ERROR');
        }
      };
      
      // 获取回收站列表
      if (deleteAction === 'getTrash') {
        try {
          const trashList = await getTrashList();
          return jsonResponse({ success: true, data: trashList });
        } catch (err) {
          return errorResponse('获取回收站失败，存储服务暂时不可用', 503, err.message);
        }
      }
      
      // 从回收站恢复
      if (deleteAction === 'restore') {
        if (!id) {
          return errorResponse('缺少记录 ID', 400, 'MISSING_ID');
        }
        
        let trashList;
        try {
          trashList = await getTrashList();
        } catch (err) {
          return errorResponse('恢复失败，存储服务暂时不可用', 503, err.message);
        }
        
        const itemIndex = trashList.findIndex(i => i.id === id);
        
        if (itemIndex === -1) {
          return errorResponse('回收站中未找到该记录', 404, 'NOT_FOUND_IN_TRASH');
        }
        
        const item = trashList[itemIndex];
        delete item.deletedAt;
        
        // 从回收站移除
        trashList.splice(itemIndex, 1);
        
        try {
          await saveTrashList(trashList);
        } catch (err) {
          return errorResponse('恢复失败，存储服务暂时不可用', 503, err.message);
        }
        
        // 添加回主列表
        let encryptedData;
        try {
          encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        } catch (kvError) {
          console.error('KV read error during restore:', kvError);
          return errorResponse('恢复失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
        }
        
        let list = [];
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        list.push(item);
        
        try {
          const encrypted = await encryptData(list, encryptionKey, salt);
          await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
        } catch (kvError) {
          console.error('KV write error during restore:', kvError);
          return errorResponse('恢复失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
        }
        
        return jsonResponse({ success: true });
      }
      
      // 清空回收站
      if (deleteAction === 'emptyTrash') {
        try {
          await env.PASSWORD_KV.delete(TRASH_KEY);
        } catch (kvError) {
          console.error('KV delete error during empty trash:', kvError);
          return errorResponse('清空回收站失败，存储服务暂时不可用', 503, 'KV_DELETE_ERROR');
        }
        return jsonResponse({ success: true });
      }
      
      // 永久删除单个项目
      if (permanent) {
        if (!id) {
          return errorResponse('缺少记录 ID', 400, 'MISSING_ID');
        }
        
        let trashList;
        try {
          trashList = await getTrashList();
        } catch (err) {
          return errorResponse('删除失败，存储服务暂时不可用', 503, err.message);
        }
        
        const initialLength = trashList.length;
        trashList = trashList.filter(i => i.id !== id);
        
        if (trashList.length === initialLength) {
          return errorResponse('记录不存在', 404, 'NOT_FOUND');
        }
        
        try {
          await saveTrashList(trashList);
        } catch (err) {
          return errorResponse('删除失败，存储服务暂时不可用', 503, err.message);
        }
        
        return jsonResponse({ success: true });
      }
      
      // 移动到回收站（软删除）
      if (!id) {
        return errorResponse('缺少记录 ID', 400, 'MISSING_ID');
      }

      let encryptedData;
      try {
        encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      } catch (kvError) {
        console.error('KV read error during soft delete:', kvError);
        return errorResponse('删除失败，存储服务暂时不可用', 503, 'KV_READ_ERROR');
      }
      
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const itemIndex = list.findIndex(i => i.id === id);
      
      if (itemIndex === -1) {
        return errorResponse('记录不存在', 404, 'NOT_FOUND');
      }
      
      // 移动到回收站
      const deletedItem = { ...list[itemIndex], deletedAt: Date.now() };
      list.splice(itemIndex, 1);
      
      let trashList;
      try {
        trashList = await getTrashList();
      } catch (err) {
        return errorResponse('删除失败，存储服务暂时不可用', 503, err.message);
      }
      
      trashList.push(deletedItem);
      
      // 保存两个列表
      try {
        const encrypted = await encryptData(list, encryptionKey, salt);
        await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
        await saveTrashList(trashList);
      } catch (kvError) {
        console.error('KV write error during soft delete:', kvError);
        return errorResponse('删除失败，存储服务暂时不可用', 503, 'KV_WRITE_ERROR');
      }

      return jsonResponse({ success: true });
    }

    return errorResponse('不支持的请求方法', 405, 'METHOD_NOT_ALLOWED');

  } catch (err) {
    console.error('Unexpected error in passwords:', err);
    return errorResponse('服务器内部错误，请稍后重试', 500, 'INTERNAL_ERROR');
  }
}
