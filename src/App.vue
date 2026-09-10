<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import LoginForm from './components/LoginForm.vue'
import PasswordManager from './components/PasswordManager.vue'

const authenticated = ref(false)
const checking = ref(true)
const username = ref('')

onMounted(async () => {
  localStorage.removeItem('pm_token')
  localStorage.removeItem('pm_username')
  try {
    const res = await axios.get('/api/auth')
    handleLogin(res.data.data.username)
  } catch (error) {
    if (error.response?.status !== 401) ElMessage.error('无法确认登录状态，请稍后重试')
  } finally { checking.value = false }
})

const handleLogin = (user) => {
  username.value = user
  authenticated.value = true
}

const clearSession = () => {
  authenticated.value = false
  username.value = ''
  localStorage.removeItem('pm_token')
  localStorage.removeItem('pm_username')
  localStorage.removeItem('pm_dark_mode')
  document.documentElement.classList.remove('dark')
}
const handleLogout = async () => {
  try {
    await axios.post('/api/auth', { type: 'logout' }, { headers: { 'X-PM-Request': '1' } })
    clearSession()
  } catch { ElMessage.error('退出失败，会话尚未注销，请重试') }
}
</script>

<template>
  <div class="app-root">
    <div v-if="checking" role="status">正在确认登录状态…</div>
    <LoginForm v-else-if="!authenticated" @login="handleLogin" />
    <div v-else class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <div class="logo">
            <span class="logo-icon">🔐</span>
            <span class="logo-text">密码管理器</span>
          </div>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="user-menu">
              <div class="user-avatar">
                <el-icon><User /></el-icon>
              </div>
              <span class="user-name">{{ username || '用户' }}</span>
              <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="app-main">
        <PasswordManager @logout="clearSession" />
      </main>
    </div>
  </div>
</template>

<script>
import { User, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
export default {
  components: { User, ArrowDown, SwitchButton }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html.dark {
  color-scheme: dark;
}

html.dark body {
  background-color: #0f172a;
}

body {
  background-color: #f8fafc;
  transition: background-color 0.3s ease;
}
</style>

<style scoped>
.app-root {
  min-height: 100vh;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 64px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
}

:global(html.dark) .app-header {
  background: #1e293b;
  border-color: #334155;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.5px;
}

:global(html.dark) .logo-text {
  color: #f1f5f9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu:hover {
  background: #f1f5f9;
}

:global(html.dark) .user-menu:hover {
  background: #334155;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

:global(html.dark) .user-name {
  color: #e2e8f0;
}

.dropdown-arrow {
  color: #9ca3af;
  font-size: 12px;
}

.app-main {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
  }
  
  .logo-text {
    display: none;
  }
  
  .user-name {
    display: none;
  }
  
  .app-main {
    padding: 16px;
  }
}
</style>
