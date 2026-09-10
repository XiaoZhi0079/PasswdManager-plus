<script setup>
import { ref, reactive, computed } from 'vue'
import { Lock, User, View, Hide } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const emit = defineEmits(['login'])

const isRegister = ref(false)
const loading = ref(false)
const showPassword = ref(false)
const form = reactive({
  username: '',
  password: ''
})

// 密码强度计算（注册时显示）
const passwordStrength = computed(() => {
  if (!form.password || !isRegister.value) return null
  
  let score = 0
  if (form.password.length >= 8) score += 1
  if (form.password.length >= 12) score += 1
  if (/[a-z]/.test(form.password)) score += 1
  if (/[A-Z]/.test(form.password)) score += 1
  if (/[0-9]/.test(form.password)) score += 1
  if (/[^a-zA-Z0-9]/.test(form.password)) score += 2
  
  if (score <= 2) return { score: 25, label: '弱', color: '#f56c6c' }
  if (score <= 4) return { score: 50, label: '中', color: '#e6a23c' }
  if (score <= 6) return { score: 75, label: '强', color: '#409eff' }
  return { score: 100, label: '极强', color: '#67c23a' }
})

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写所有字段')
    return
  }

  if (form.username.length < 3) {
    ElMessage.warning('用户名至少3个字符')
    return
  }

  const minLength = isRegister.value ? 12 : 6
  if (form.password.length < minLength) {
    ElMessage.warning(`密码至少${minLength}个字符`)
    return
  }

  loading.value = true
  try {
    const type = isRegister.value ? 'register' : 'login'
    const res = await axios.post('/api/auth', {
      type,
      username: form.username,
      password: form.password
    }, { headers: { 'X-PM-Request': '1' } })

    if (res.data.success) {
      if (isRegister.value) {
        ElMessage.success('注册成功！请登录')
        isRegister.value = false
        form.password = ''
      } else {
        ElMessage.success('登录成功')
        form.password = ''
        emit('login', res.data.data.username)
      }
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error('用户名或密码错误')
    } else if (error.response?.status === 409) {
      ElMessage.error('用户名已存在，请换一个')
    } else if (error.response?.status === 400) {
      ElMessage.error(error.response?.data?.message || '请求参数错误')
    } else if (error.code === 'ERR_NETWORK') {
      ElMessage.error('网络连接失败，请检查网络')
    } else {
      ElMessage.error(error.response?.data?.message || '操作失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  form.username = ''
  form.password = ''
}
</script>

<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <div class="login-container">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo-wrapper">
            <div class="logo-icon">🔐</div>
          </div>
          <h1 class="brand-title">密码管理器</h1>
          <p class="brand-subtitle">安全存储，轻松管理您的所有密码</p>
          
          <div class="features">
            <div class="feature-item">
              <span class="feature-icon">🔒</span>
              <span>AES-256 加密存储</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">☁️</span>
              <span>云端同步，随时访问</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🎯</span>
              <span>智能分类管理</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📤</span>
              <span>便捷导入导出</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="form-section">
        <div class="form-wrapper">
          <div class="form-header">
            <h2>{{ isRegister ? '创建账户' : '欢迎回来' }}</h2>
            <p>{{ isRegister ? '注册一个新账户开始使用' : '登录您的账户继续' }}</p>
          </div>

          <form @submit.prevent="handleSubmit" class="login-form">
            <div class="form-group">
              <label>用户名</label>
              <div class="input-wrapper">
                <el-icon class="input-icon"><User /></el-icon>
                <input 
                  v-model="form.username" 
                  type="text" 
                  placeholder="请输入用户名"
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-group">
              <label>密码</label>
              <div class="input-wrapper">
                <el-icon class="input-icon"><Lock /></el-icon>
                <input 
                  v-model="form.password" 
                  :type="showPassword ? 'text' : 'password'" 
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  @keyup.enter="handleSubmit"
                />
                <el-icon class="toggle-password" @click="showPassword = !showPassword">
                  <component :is="showPassword ? Hide : View" />
                </el-icon>
              </div>
              
              <!-- 密码强度指示器（仅注册时显示） -->
              <div v-if="passwordStrength" class="password-strength">
                <div class="strength-bar">
                  <div 
                    class="strength-fill" 
                    :style="{ 
                      width: passwordStrength.score + '%',
                      background: passwordStrength.color 
                    }"
                  ></div>
                </div>
                <span class="strength-label" :style="{ color: passwordStrength.color }">
                  密码强度：{{ passwordStrength.label }}
                </span>
              </div>
            </div>

            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>{{ isRegister ? '注册' : '登录' }}</span>
            </button>
          </form>

          <div class="form-footer">
            <span>{{ isRegister ? '已有账户？' : '还没有账户？' }}</span>
            <button type="button" class="toggle-btn" @click="toggleMode">
              {{ isRegister ? '立即登录' : '立即注册' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
}

.circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 30%;
  background: rgba(255, 255, 255, 0.05);
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 900px;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  position: relative;
  z-index: 1;
}

/* 品牌区域 */
.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-content {
  text-align: center;
}

.logo-wrapper {
  margin-bottom: 24px;
}

.logo-icon {
  font-size: 64px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 14px;
  opacity: 0.8;
  margin: 0 0 32px;
  line-height: 1.5;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  opacity: 0.9;
}

.feature-icon {
  font-size: 20px;
}

/* 表单区域 */
.form-section {
  flex: 1;
  padding: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-wrapper {
  width: 100%;
  max-width: 320px;
}

.form-header {
  margin-bottom: 32px;
}

.form-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px;
}

.form-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #9ca3af;
  font-size: 18px;
}

.input-wrapper input {
  width: 100%;
  padding: 14px 44px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s ease;
  outline: none;
}

.input-wrapper input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-wrapper input::placeholder {
  color: #9ca3af;
}

.toggle-password {
  position: absolute;
  right: 14px;
  color: #9ca3af;
  cursor: pointer;
  font-size: 18px;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #667eea;
}

/* 密码强度 */
.password-strength {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-label {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 表单底部 */
.form-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.toggle-btn {
  background: none;
  border: none;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
}

.toggle-btn:hover {
  text-decoration: underline;
}

/* 响应式 */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    max-width: 400px;
  }
  
  .brand-section {
    padding: 32px;
  }
  
  .features {
    display: none;
  }
  
  .form-section {
    padding: 32px;
  }
}
</style>
