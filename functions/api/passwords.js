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
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!env.PASSWORD_KV) {
    return new Response(JSON.stringify({ success: false, message: 'Server misconfigured: PASSWORD_KV not bound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 验证会话并获取用户信息
  let sessionData = await env.PASSWORD_KV.get(`session:${token}`, { type: 'json' });
  let username;
  let encryptionKey;
  
  if (sessionData && sessionData.username) {
    // 新格式的会话数据
    username = sessionData.username;
    encryptionKey = sessionData.encryptionKey;
  } else {
    // 兼容旧格式（直接存储username字符串）
    username = await env.PASSWORD_KV.get(`session:${token}`);
    if (!username) {
      return new Response(JSON.stringify({ success: false, message: 'Session expired or invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    encryptionKey = token; // 旧格式使用token作为加密密钥
  }

  const KEY = `data:${username}`;
  const userDataStr = await env.PASSWORD_KV.get(`user:${username}`);
  const userData = userDataStr ? JSON.parse(userDataStr) : { salt: 'default-salt' };
  const salt = userData.salt;

  try {
    if (request.method === 'GET') {
      const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      
      // 如果是加密数据，解密它
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        const decrypted = await decryptData(encryptedData, encryptionKey, salt);
        return new Response(JSON.stringify({ success: true, data: decrypted || [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 兼容旧的未加密数据
      return new Response(JSON.stringify({ success: true, data: encryptedData || [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      
      // 处理批量导入
      if (body.action === 'import') {
        const importData = body.data;
        if (!Array.isArray(importData)) {
          return new Response(JSON.stringify({ success: false, message: 'Invalid import data' }), { status: 400 });
        }
        
        const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        let list = [];
        
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        const newItems = importData.map(item => ({
          platform: item.platform || '',
          account: item.account || '',
          password: item.password || '',
          remark: item.remark || '',
          category: item.category || 'general',
          id: crypto.randomUUID(),
          updatedAt: Date.now(),
          createdAt: Date.now()
        }));
        
        list.push(...newItems);
        const encrypted = await encryptData(list, encryptionKey, salt);
        await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
        
        return new Response(JSON.stringify({ success: true, imported: newItems.length }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 处理导出
      if (body.action === 'export') {
        const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        let list = [];
        
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        // 导出时移除敏感的内部字段
        const exportData = list.map(({ id, updatedAt, createdAt, ...rest }) => rest);
        
        return new Response(JSON.stringify({ success: true, data: exportData }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 添加新密码
      const newItem = body;
      if (!newItem.platform || !newItem.account || !newItem.password) {
        return new Response(JSON.stringify({ success: false, message: 'Missing fields' }), { status: 400 });
      }

      const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const item = {
        ...newItem,
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
        createdAt: Date.now()
      };
      
      list.push(item);
      const encrypted = await encryptData(list, encryptionKey, salt);
      await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
      
      return new Response(JSON.stringify({ success: true, data: item }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'PUT') {
      const updateItem = await request.json();
      if (!updateItem.id) {
        return new Response(JSON.stringify({ success: false, message: 'Missing ID' }), { status: 400 });
      }

      const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const index = list.findIndex(i => i.id === updateItem.id);
      
      if (index === -1) {
        return new Response(JSON.stringify({ success: false, message: 'Item not found' }), { status: 404 });
      }

      list[index] = { ...list[index], ...updateItem, updatedAt: Date.now() };
      const encrypted = await encryptData(list, encryptionKey, salt);
      await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'DELETE') {
      const body = await request.json();
      const { id, permanent, action: deleteAction } = body;
      
      const TRASH_KEY = `trash:${username}`;
      
      // 获取回收站数据
      const getTrashList = async () => {
        const encryptedTrash = await env.PASSWORD_KV.get(TRASH_KEY, { type: 'json' });
        if (encryptedTrash && encryptedTrash.iv && encryptedTrash.data) {
          return await decryptData(encryptedTrash, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedTrash)) {
          return encryptedTrash;
        }
        return [];
      };
      
      // 保存回收站数据
      const saveTrashList = async (trashList) => {
        const encrypted = await encryptData(trashList, encryptionKey, salt);
        await env.PASSWORD_KV.put(TRASH_KEY, JSON.stringify(encrypted));
      };
      
      // 获取回收站列表
      if (deleteAction === 'getTrash') {
        const trashList = await getTrashList();
        return new Response(JSON.stringify({ success: true, data: trashList }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 从回收站恢复
      if (deleteAction === 'restore') {
        if (!id) {
          return new Response(JSON.stringify({ success: false, message: 'Missing ID' }), { status: 400 });
        }
        
        let trashList = await getTrashList();
        const itemIndex = trashList.findIndex(i => i.id === id);
        
        if (itemIndex === -1) {
          return new Response(JSON.stringify({ success: false, message: 'Item not found in trash' }), { status: 404 });
        }
        
        const item = trashList[itemIndex];
        delete item.deletedAt;
        
        // 从回收站移除
        trashList.splice(itemIndex, 1);
        await saveTrashList(trashList);
        
        // 添加回主列表
        const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
        let list = [];
        if (encryptedData && encryptedData.iv && encryptedData.data) {
          list = await decryptData(encryptedData, encryptionKey, salt) || [];
        } else if (Array.isArray(encryptedData)) {
          list = encryptedData;
        }
        
        list.push(item);
        const encrypted = await encryptData(list, encryptionKey, salt);
        await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 清空回收站
      if (deleteAction === 'emptyTrash') {
        await env.PASSWORD_KV.delete(TRASH_KEY);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 永久删除单个项目
      if (permanent) {
        if (!id) {
          return new Response(JSON.stringify({ success: false, message: 'Missing ID' }), { status: 400 });
        }
        
        let trashList = await getTrashList();
        const initialLength = trashList.length;
        trashList = trashList.filter(i => i.id !== id);
        
        if (trashList.length === initialLength) {
          return new Response(JSON.stringify({ success: false, message: 'Item not found' }), { status: 404 });
        }
        
        await saveTrashList(trashList);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 移动到回收站（软删除）
      if (!id) {
        return new Response(JSON.stringify({ success: false, message: 'Missing ID' }), { status: 400 });
      }

      const encryptedData = await env.PASSWORD_KV.get(KEY, { type: 'json' });
      let list = [];
      
      if (encryptedData && encryptedData.iv && encryptedData.data) {
        list = await decryptData(encryptedData, encryptionKey, salt) || [];
      } else if (Array.isArray(encryptedData)) {
        list = encryptedData;
      }
      
      const itemIndex = list.findIndex(i => i.id === id);
      
      if (itemIndex === -1) {
        return new Response(JSON.stringify({ success: false, message: 'Item not found' }), { status: 404 });
      }
      
      // 移动到回收站
      const deletedItem = { ...list[itemIndex], deletedAt: Date.now() };
      list.splice(itemIndex, 1);
      
      let trashList = await getTrashList();
      trashList.push(deletedItem);
      
      // 保存两个列表
      const encrypted = await encryptData(list, encryptionKey, salt);
      await env.PASSWORD_KV.put(KEY, JSON.stringify(encrypted));
      await saveTrashList(trashList);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), { status: 405 });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
