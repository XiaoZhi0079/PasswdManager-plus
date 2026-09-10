<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Edit, Delete, CopyDocument, Refresh, Search, View, Hide, 
  Download, Upload, Key, Moon, Sunny, DeleteFilled, RefreshLeft
} from '@element-plus/icons-vue'
import axios from 'axios'

const emit = defineEmits(['logout'])

const items = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref()
const searchQuery = ref('')
const visiblePasswords = reactive({})
const selectedCategory = ref('all')
const isDarkMode = ref(false)
const importDialogVisible = ref(false)
const importText = ref('')
const generatorDialogVisible = ref(false)
const trashDialogVisible = ref(false)
const trashItems = ref([])
const trashLoading = ref(false)

// 密码生成器设置
const generatorSettings = reactive({
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true
})
const generatedPassword = ref('')

const form = reactive({
  platform: '',
  account: '',
  password: '',
  remark: '',
  categories: ['general'], // 支持多分类
  expiryDays: 0,
  customExpiryDate: null
})

// 过期天数选项
const expiryOptions = [
  { value: 0, label: '永不过期' },
  { value: 30, label: '30天' },
  { value: 365, label: '1年' },
  { value: -1, label: '自定义时间' }
]

// 计算密码过期状态
const getExpiryStatus = (item) => {
  let expiryDate = null
  
  // 优先使用自定义过期时间
  if (item.customExpiryDate) {
    expiryDate = new Date(item.customExpiryDate)
  } else if (item.expiryDays && item.expiryDays > 0) {
    const createdAt = item.passwordChangedAt || item.createdAt
    expiryDate = new Date(createdAt + item.expiryDays * 24 * 60 * 60 * 1000)
  }
  
  if (!expiryDate) {
    return { status: 'none', label: '', color: '' }
  }
  
  const now = new Date()
  const daysLeft = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
  
  if (daysLeft <= 0) {
    return { status: 'expired', label: '已过期', color: '#f56c6c', daysLeft: 0 }
  } else if (daysLeft <= 7) {
    return { status: 'warning', label: `${daysLeft}天后过期`, color: '#e6a23c', daysLeft }
  } else if (daysLeft <= 30) {
    return { status: 'soon', label: `${daysLeft}天后过期`, color: '#409eff', daysLeft }
  }
  return { status: 'ok', label: `${daysLeft}天后过期`, color: '#67c23a', daysLeft }
}

// 统计过期密码数量
const expiredCount = computed(() => {
  return items.value.filter(item => {
    const status = getExpiryStatus(item)
    return status.status === 'expired' || status.status === 'warning'
  }).length
})

const currentId = ref('')

const categories = ref([
  { value: 'all', label: '全部', icon: '📁', isSystem: true },
  { value: 'general', label: '通用', icon: '🌐', isSystem: false },
  { value: 'social', label: '社交', icon: '💬', isSystem: false },
  { value: 'finance', label: '金融', icon: '💰', isSystem: false },
  { value: 'work', label: '工作', icon: '💼', isSystem: false },
  { value: 'shopping', label: '购物', icon: '🛒', isSystem: false },
  { value: 'gaming', label: '游戏', icon: '🎮', isSystem: false },
  { value: 'other', label: '其他', icon: '📌', isSystem: false }
])

// 自定义标签相关
const customCategoryDialogVisible = ref(false)
const customCategoryForm = reactive({
  label: '',
  icon: '🏷️'
})

// 常用emoji列表
const emojiList = [
  '🏷️', '📂', '🔑', '🖥️', '📱', '🌍', '☁️', '🔒', '📧', '🎓',
  '🏠', '🚗', '✈️', '🏦', '💳', '📺', '🎵', '📷', '🛠️', '⚙️',
  '🔧', '💡', '📝', '📊', '🗂️', '💻', '🖨️', '📡', '🔌', '💾',
  '🎯', '⭐', '❤️', '🔥', '💎', '🎁', '🏆', '🎪', '🎨', '🎬'
]

// 从localStorage加载自定义标签
const loadCustomCategories = () => {
  const saved = localStorage.getItem('pm_custom_categories')
  if (saved) {
    try {
      const custom = JSON.parse(saved)
      custom.forEach(cat => {
        if (!categories.value.find(c => c.value === cat.value)) {
          categories.value.push({ ...cat, isSystem: false })
        }
      })
    } catch (e) {}
  }
}

// 保存自定义标签到localStorage
const saveCustomCategories = () => {
  const custom = categories.value.filter(c => !c.isSystem)
  localStorage.setItem('pm_custom_categories', JSON.stringify(custom))
}

// 添加自定义标签
const addCustomCategory = () => {
  if (!customCategoryForm.label.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  
  const value = 'custom_' + Date.now()
  categories.value.push({
    value,
    label: customCategoryForm.label.trim(),
    icon: customCategoryForm.icon,
    isSystem: false
  })
  
  saveCustomCategories()
  customCategoryDialogVisible.value = false
  customCategoryForm.label = ''
  customCategoryForm.icon = '🏷️'
  ElMessage.success('标签添加成功')
}

// 删除自定义标签
const deleteCustomCategory = (cat) => {
  const count = items.value.filter(item => item.category === cat.value).length
  let message = `确定要删除标签「${cat.label}」吗？`
  
  if (count > 0) {
    message = `标签「${cat.label}」下还有 ${count} 个密码，删除后这些密码将变为"通用"分类。确定删除吗？`
  }
  
  ElMessageBox.confirm(
    message,
    '删除标签',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: count > 0 ? 'warning' : 'info' }
  ).then(() => {
    // 将该标签下的密码改为通用
    if (count > 0) {
      items.value.forEach(item => {
        if (item.category === cat.value) {
          item.category = 'general'
        }
      })
    }
    
    const index = categories.value.findIndex(c => c.value === cat.value)
    if (index > -1) {
      categories.value.splice(index, 1)
      saveCustomCategories()
      if (selectedCategory.value === cat.value) {
        selectedCategory.value = 'all'
      }
      ElMessage.success('标签已删除')
    }
  })
}

const rules = reactive({
  platform: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
})

const api = axios.create({
  baseURL: '/api',
  headers: {
    'X-PM-Request': '1'
  }
})

api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401) emit('logout')
  return Promise.reject(error)
})

// 密码强度计算
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '无', color: '#909399' }
  
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 2
  
  if (score <= 2) return { score: 25, label: '弱', color: '#f56c6c' }
  if (score <= 4) return { score: 50, label: '中', color: '#e6a23c' }
  if (score <= 6) return { score: 75, label: '强', color: '#409eff' }
  return { score: 100, label: '极强', color: '#67c23a' }
}

const formPasswordStrength = computed(() => getPasswordStrength(form.password))

// 生成随机密码
const generatePassword = () => {
  const { length, uppercase, lowercase, numbers, symbols } = generatorSettings
  let chars = ''
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (numbers) chars += '0123456789'
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  if (!chars) {
    ElMessage.warning('请至少选择一种字符类型')
    return
  }
  
  let password = ''
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length]
  }
  generatedPassword.value = password
}

const useGeneratedPassword = () => {
  form.password = generatedPassword.value
  generatorDialogVisible.value = false
  ElMessage.success('密码已填入')
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/passwords')
    if (res.data.success && res.data.data) {
      items.value = res.data.data
    } else {
      ElMessage.error(res.data.message || '获取数据失败')
    }
  } catch (error) {
    if (error.response?.status === 401) {
      ElMessage.error('会话已过期，请重新登录')
      emit('logout')
    } else if (error.response?.status === 500) {
      ElMessage.error(`服务器错误: ${error.response?.data?.message || '请稍后重试'}`)
    } else if (error.code === 'ERR_NETWORK') {
      ElMessage.error('网络连接失败，请检查网络后重试')
    } else {
      ElMessage.error(`请求失败: ${error.message || '未知错误'}`)
    }
  } finally {
    loading.value = false
  }
}

// 获取密码的分类列表（兼容旧数据）
const getItemCategories = (item) => {
  if (item.categories && Array.isArray(item.categories)) {
    return item.categories
  }
  return item.category ? [item.category] : ['general']
}

const filteredItems = computed(() => {
  let result = items.value
  
  if (selectedCategory.value !== 'all') {
    result = result.filter(item => {
      const cats = getItemCategories(item)
      return cats.includes(selectedCategory.value)
    })
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      item.platform.toLowerCase().includes(query) || 
      item.account.toLowerCase().includes(query) ||
      (item.remark && item.remark.toLowerCase().includes(query))
    )
  }
  
  return result
})

const categoryStats = computed(() => {
  const stats = {}
  categories.value.forEach(cat => {
    if (cat.value === 'all') {
      stats[cat.value] = items.value.length
    } else {
      stats[cat.value] = items.value.filter(item => {
        const cats = getItemCategories(item)
        return cats.includes(cat.value)
      }).length
    }
  })
  return stats
})

const togglePasswordVisibility = (id) => {
  visiblePasswords[id] = !visiblePasswords[id]
}

const handleAdd = () => {
  dialogType.value = 'add'
  currentId.value = ''
  form.platform = ''
  form.account = ''
  form.password = ''
  form.remark = ''
  form.categories = ['general']
  form.expiryDays = 0
  form.customExpiryDate = null
  dialogVisible.value = true
}

const handleEdit = (row) => {
  dialogType.value = 'edit'
  currentId.value = row.id
  form.platform = row.platform
  form.account = row.account
  form.password = row.password
  form.remark = row.remark || ''
  // 兼容旧数据（单分类）和新数据（多分类）
  form.categories = row.categories || (row.category ? [row.category] : ['general'])
  form.expiryDays = row.expiryDays || 0
  form.customExpiryDate = row.customExpiryDate || null
  if (row.customExpiryDate) {
    form.expiryDays = -1
  }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这条密码记录吗？删除后可在回收站恢复。',
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      const res = await api.delete('/passwords', { data: { id: row.id } })
      if (res.data.success) {
        ElMessage.success('已移至回收站')
        fetchData()
      } else {
        ElMessage.error(res.data.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error(`删除失败: ${error.response?.data?.message || error.message || '请稍后重试'}`)
    }
  })
}

// 回收站功能
const fetchTrash = async () => {
  trashLoading.value = true
  try {
    const res = await api.delete('/passwords', { data: { action: 'getTrash' } })
    if (res.data.success) {
      trashItems.value = res.data.data || []
    } else {
      ElMessage.error(res.data.message || '获取回收站失败')
    }
  } catch (error) {
    ElMessage.error(`获取回收站失败: ${error.response?.data?.message || error.message}`)
  } finally {
    trashLoading.value = false
  }
}

const openTrash = () => {
  trashDialogVisible.value = true
  fetchTrash()
}

const restoreItem = async (item) => {
  try {
    const res = await api.delete('/passwords', { data: { id: item.id, action: 'restore' } })
    if (res.data.success) {
      ElMessage.success('恢复成功')
      fetchTrash()
      fetchData()
    } else {
      ElMessage.error(res.data.message || '恢复失败')
    }
  } catch (error) {
    ElMessage.error(`恢复失败: ${error.response?.data?.message || error.message}`)
  }
}

const permanentDelete = (item) => {
  ElMessageBox.confirm(
    '确定要永久删除这条记录吗？此操作不可恢复！',
    '永久删除',
    {
      confirmButtonText: '永久删除',
      cancelButtonText: '取消',
      type: 'error',
    }
  ).then(async () => {
    try {
      const res = await api.delete('/passwords', { data: { id: item.id, permanent: true } })
      if (res.data.success) {
        ElMessage.success('已永久删除')
        fetchTrash()
      } else {
        ElMessage.error(res.data.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error(`删除失败: ${error.response?.data?.message || error.message}`)
    }
  })
}

const emptyTrash = () => {
  if (trashItems.value.length === 0) {
    ElMessage.info('回收站已经是空的')
    return
  }
  
  ElMessageBox.confirm(
    `确定要清空回收站吗？将永久删除 ${trashItems.value.length} 条记录，此操作不可恢复！`,
    '清空回收站',
    {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'error',
    }
  ).then(async () => {
    try {
      const res = await api.delete('/passwords', { data: { action: 'emptyTrash' } })
      if (res.data.success) {
        ElMessage.success('回收站已清空')
        trashItems.value = []
      } else {
        ElMessage.error(res.data.message || '清空失败')
      }
    } catch (error) {
      ElMessage.error(`清空失败: ${error.response?.data?.message || error.message}`)
    }
  })
}

const formatDeleteTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const submitForm = async (formEl) => {
  if (!formEl) return
  await formEl.validate(async (valid) => {
    if (valid) {
      try {
        const payload = { 
          ...form, 
          id: currentId.value,
          expiryDays: form.expiryDays === -1 ? 0 : form.expiryDays,
          customExpiryDate: form.expiryDays === -1 ? form.customExpiryDate : null
        }
        const method = dialogType.value === 'add' ? 'post' : 'put'
        const res = await api[method]('/passwords', payload)
        
        if (res.data.success) {
          ElMessage.success(dialogType.value === 'add' ? '添加成功' : '更新成功')
          dialogVisible.value = false
          fetchData()
        } else {
          ElMessage.error(res.data.message || '操作失败')
        }
      } catch (error) {
        const action = dialogType.value === 'add' ? '添加' : '更新'
        ElMessage.error(`${action}失败: ${error.response?.data?.message || error.message}`)
      }
    }
  })
}

const copyToClipboard = (text, type = '内容') => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(`${type}已复制到剪贴板`)
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 导出功能
const handleExport = async () => {
  try {
    const res = await api.post('/passwords', { action: 'export' })
    if (res.data.success) {
      const dataStr = JSON.stringify(res.data.data, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `passwords_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      ElMessage.success(`导出成功，共 ${res.data.data.length} 条记录`)
    } else {
      ElMessage.error(res.data.message || '导出失败')
    }
  } catch (error) {
    ElMessage.error(`导出失败: ${error.response?.data?.message || error.message}`)
  }
}

// 导入功能
const handleImport = async () => {
  let data
  try {
    data = JSON.parse(importText.value)
  } catch (e) {
    ElMessage.error('JSON格式错误，请检查数据格式')
    return
  }
  
  if (!Array.isArray(data)) {
    ElMessage.error('导入数据格式错误，需要JSON数组')
    return
  }
  
  if (data.length === 0) {
    ElMessage.warning('导入数据为空')
    return
  }
  
  try {
    const res = await api.post('/passwords', { action: 'import', data })
    if (res.data.success) {
      ElMessage.success(`成功导入 ${res.data.imported} 条记录`)
      importDialogVisible.value = false
      importText.value = ''
      fetchData()
    } else {
      ElMessage.error(res.data.message || '导入失败')
    }
  } catch (error) {
    ElMessage.error(`导入失败: ${error.response?.data?.message || error.message}`)
  }
}

const handleFileImport = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      importText.value = e.target.result
    }
    reader.readAsText(file)
  }
}

// 暗色模式
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark', isDarkMode.value)
  localStorage.setItem('pm_dark_mode', isDarkMode.value)
}

// 获取分类图标
const getCategoryIcon = (category) => {
  const cat = categories.value.find(c => c.value === category)
  return cat ? cat.icon : '📁'
}

// 获取分类颜色
const getCategoryColor = (category) => {
  const colors = {
    general: '#409eff',
    social: '#67c23a',
    finance: '#e6a23c',
    work: '#909399',
    shopping: '#f56c6c',
    gaming: '#9c27b0',
    other: '#00bcd4'
  }
  // 自定义标签使用随机但固定的颜色
  if (category && category.startsWith('custom_')) {
    const hash = category.split('_')[1] || '0'
    const hue = parseInt(hash) % 360
    return `hsl(${hue}, 60%, 50%)`
  }
  return colors[category] || '#409eff'
}

onMounted(() => {
  loadCustomCategories()
  fetchData()
  // 恢复暗色模式设置
  const savedDarkMode = localStorage.getItem('pm_dark_mode')
  if (savedDarkMode === 'true') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
})
</script>

<template>
  <div class="manager-container" :class="{ 'dark-mode': isDarkMode }">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchQuery"
          placeholder="搜索密码..."
          :prefix-icon="Search"
          size="large"
          clearable
          class="search-input"
        />
      </div>
      <div class="toolbar-right">
        <el-badge :value="expiredCount" :hidden="expiredCount === 0" type="danger" class="expiry-badge">
          <el-tooltip content="回收站" placement="bottom">
            <el-button :icon="DeleteFilled" circle @click="openTrash" />
          </el-tooltip>
        </el-badge>
        <el-tooltip content="刷新" placement="bottom">
          <el-button :icon="Refresh" circle @click="fetchData" />
        </el-tooltip>
        <el-tooltip content="导入" placement="bottom">
          <el-button :icon="Upload" circle @click="importDialogVisible = true" />
        </el-tooltip>
        <el-tooltip content="导出" placement="bottom">
          <el-button :icon="Download" circle @click="handleExport" />
        </el-tooltip>
        <el-tooltip :content="isDarkMode ? '浅色模式' : '深色模式'" placement="bottom">
          <el-button :icon="isDarkMode ? Sunny : Moon" circle @click="toggleDarkMode" />
        </el-tooltip>
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          添加密码
        </el-button>
      </div>
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <div 
        v-for="cat in categories" 
        :key="cat.value"
        class="category-tab"
        :class="{ active: selectedCategory === cat.value }"
        @click="selectedCategory = cat.value"
        @contextmenu.prevent="!cat.isSystem && deleteCustomCategory(cat)"
      >
        <span class="cat-icon">{{ cat.icon }}</span>
        <span class="cat-label">{{ cat.label }}</span>
        <span class="cat-count">{{ categoryStats[cat.value] || 0 }}</span>
        <span v-if="!cat.isSystem" class="cat-delete" @click.stop="deleteCustomCategory(cat)">×</span>
      </div>
      <!-- 添加标签按钮 -->
      <div class="category-tab add-category" @click="customCategoryDialogVisible = true">
        <span class="cat-icon">➕</span>
        <span class="cat-label">添加</span>
      </div>
    </div>

    <!-- 密码列表 -->
    <div v-loading="loading" class="content-wrapper">
      <el-row :gutter="20">
        <el-col 
          :xs="24" :sm="12" :md="8" :lg="6" 
          v-for="item in filteredItems" 
          :key="item.id" 
          class="card-col"
        >
          <div 
            class="password-card" 
            :class="{ 
              'expired': getExpiryStatus(item).status === 'expired',
              'warning': getExpiryStatus(item).status === 'warning'
            }"
            :style="{ '--category-color': getCategoryColor(item.category) }"
          >
            <div class="card-header">
              <div class="platform-info">
                <div class="platform-avatar" :style="{ background: getCategoryColor(getItemCategories(item)[0]) }">
                  {{ item.platform.charAt(0).toUpperCase() }}
                </div>
                <div class="platform-details">
                  <span class="platform-name">{{ item.platform }}</span>
                  <span class="platform-category">
                    <template v-for="(cat, idx) in getItemCategories(item).slice(0, 2)" :key="cat">
                      {{ getCategoryIcon(cat) }}{{ categories.find(c => c.value === cat)?.label || '通用' }}<template v-if="idx < Math.min(getItemCategories(item).length, 2) - 1">、</template>
                    </template>
                    <template v-if="getItemCategories(item).length > 2">
                      +{{ getItemCategories(item).length - 2 }}
                    </template>
                  </span>
                </div>
              </div>
              <el-dropdown trigger="click">
                <el-button link class="more-btn">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :icon="Edit" @click="handleEdit(item)">编辑</el-dropdown-item>
                    <el-dropdown-item :icon="Delete" class="danger-item" @click="handleDelete(item)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            
            <div class="card-body">
              <div class="info-row">
                <span class="info-label">账号</span>
                <div class="info-value">
                  <span class="value-text">{{ item.account }}</span>
                  <el-button link size="small" @click="copyToClipboard(item.account, '账号')">
                    <el-icon><CopyDocument /></el-icon>
                  </el-button>
                </div>
              </div>
              
              <div class="info-row">
                <span class="info-label">密码</span>
                <div class="info-value">
                  <span class="value-text password-mask">
                    {{ visiblePasswords[item.id] ? item.password : '••••••••••••' }}
                  </span>
                  <div class="value-actions">
                    <el-button link size="small" @click="togglePasswordVisibility(item.id)">
                      <el-icon><component :is="visiblePasswords[item.id] ? Hide : View" /></el-icon>
                    </el-button>
                    <el-button link size="small" @click="copyToClipboard(item.password, '密码')">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>

              <div class="password-strength-bar">
                <div 
                  class="strength-fill" 
                  :style="{ 
                    width: getPasswordStrength(item.password).score + '%',
                    background: getPasswordStrength(item.password).color 
                  }"
                ></div>
              </div>
              
              <div class="info-row remark-row" v-if="item.remark">
                <span class="info-label">备注</span>
                <p class="remark-text">{{ item.remark }}</p>
              </div>

              <!-- 过期状态 -->
              <div class="expiry-status" v-if="getExpiryStatus(item).status !== 'none'">
                <span 
                  class="expiry-tag" 
                  :class="'expiry-' + getExpiryStatus(item).status"
                  :style="{ background: getExpiryStatus(item).color + '20', color: getExpiryStatus(item).color }"
                >
                  ⏰ {{ getExpiryStatus(item).label }}
                </span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-empty v-if="!loading && filteredItems.length === 0" description="暂无密码记录">
        <el-button type="primary" @click="handleAdd">添加第一个密码</el-button>
      </el-empty>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加密码' : '编辑密码'"
      width="480px"
      destroy-on-close
      class="form-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="平台名称" prop="platform">
          <el-input v-model="form.platform" placeholder="如：Google、淘宝" />
        </el-form-item>
        
        <el-form-item label="分类（可多选）">
          <el-select 
            v-model="form.categories" 
            multiple 
            placeholder="选择分类" 
            style="width: 100%"
            collapse-tags
            collapse-tags-tooltip
          >
            <el-option 
              v-for="cat in categories.filter(c => c.value !== 'all')" 
              :key="cat.value" 
              :label="cat.icon + ' ' + cat.label" 
              :value="cat.value" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="账号/邮箱" prop="account">
          <el-input v-model="form.account" placeholder="username@example.com" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password">
          <div class="password-input-wrapper">
            <el-input v-model="form.password" show-password placeholder="输入密码" />
            <el-button type="primary" link @click="generatorDialogVisible = true">
              <el-icon><Key /></el-icon> 生成
            </el-button>
          </div>
          <div class="password-strength">
            <div class="strength-bar">
              <div 
                class="strength-fill" 
                :style="{ 
                  width: formPasswordStrength.score + '%',
                  background: formPasswordStrength.color 
                }"
              ></div>
            </div>
            <span class="strength-label" :style="{ color: formPasswordStrength.color }">
              {{ formPasswordStrength.label }}
            </span>
          </div>
        </el-form-item>
        
        <el-form-item label="备注（可选）" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="添加备注信息..." />
        </el-form-item>

        <el-form-item label="密码有效期" prop="expiryDays">
          <el-select v-model="form.expiryDays" placeholder="选择有效期" style="width: 100%">
            <el-option 
              v-for="opt in expiryOptions" 
              :key="opt.value" 
              :label="opt.label" 
              :value="opt.value" 
            />
          </el-select>
          <div class="expiry-hint" v-if="form.expiryDays > 0">
            密码将在 {{ form.expiryDays }} 天后提醒更换
          </div>
          
          <!-- 自定义时间选择器 -->
          <div class="custom-expiry-picker" v-if="form.expiryDays === -1">
            <el-date-picker
              v-model="form.customExpiryDate"
              type="datetime"
              placeholder="选择过期时间"
              format="YYYY年MM月DD日 HH:mm"
              value-format="x"
              :disabled-date="(date) => date < new Date()"
              style="width: 100%; margin-top: 8px;"
            />
            <div class="expiry-hint" v-if="form.customExpiryDate">
              密码将在 {{ new Date(form.customExpiryDate).toLocaleString('zh-CN') }} 过期
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm(formRef)">保存</el-button>
      </template>
    </el-dialog>

    <!-- 密码生成器对话框 -->
    <el-dialog
      v-model="generatorDialogVisible"
      title="密码生成器"
      width="400px"
      class="generator-dialog"
    >
      <div class="generator-content">
        <div class="generated-password-display">
          <span class="generated-text">{{ generatedPassword || '点击生成按钮' }}</span>
          <el-button v-if="generatedPassword" link @click="copyToClipboard(generatedPassword, '密码')">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
        
        <div class="generator-options">
          <div class="option-row">
            <span>密码长度</span>
            <el-slider v-model="generatorSettings.length" :min="8" :max="32" show-input />
          </div>
          <div class="option-row">
            <el-checkbox v-model="generatorSettings.uppercase">大写字母 (A-Z)</el-checkbox>
          </div>
          <div class="option-row">
            <el-checkbox v-model="generatorSettings.lowercase">小写字母 (a-z)</el-checkbox>
          </div>
          <div class="option-row">
            <el-checkbox v-model="generatorSettings.numbers">数字 (0-9)</el-checkbox>
          </div>
          <div class="option-row">
            <el-checkbox v-model="generatorSettings.symbols">特殊符号 (!@#$...)</el-checkbox>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="generatePassword">
          <el-icon><Refresh /></el-icon> 生成密码
        </el-button>
        <el-button type="primary" :disabled="!generatedPassword" @click="useGeneratedPassword">
          使用此密码
        </el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入密码"
      width="500px"
      class="import-dialog"
    >
      <div class="import-content">
        <el-alert 
          title="导入格式说明" 
          type="info" 
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        >
          <template #default>
            JSON数组格式，每项包含：platform, account, password, remark(可选), category(可选)
          </template>
        </el-alert>
        
        <div class="file-upload">
          <input type="file" accept=".json" @change="handleFileImport" id="file-input" hidden />
          <el-button @click="document.getElementById('file-input').click()">
            <el-icon><Upload /></el-icon> 选择文件
          </el-button>
        </div>
        
        <el-input
          v-model="importText"
          type="textarea"
          :rows="10"
          placeholder='[{"platform": "Google", "account": "user@gmail.com", "password": "xxx", "category": "general"}]'
        />
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :disabled="!importText">导入</el-button>
      </template>
    </el-dialog>

    <!-- 回收站对话框 -->
    <el-dialog
      v-model="trashDialogVisible"
      title="回收站"
      width="600px"
      class="trash-dialog"
    >
      <div class="trash-content" v-loading="trashLoading">
        <div v-if="trashItems.length === 0" class="trash-empty">
          <el-empty description="回收站是空的" :image-size="80" />
        </div>
        
        <div v-else class="trash-list">
          <div v-for="item in trashItems" :key="item.id" class="trash-item">
            <div class="trash-item-info">
              <div class="trash-avatar" :style="{ background: getCategoryColor(item.category) }">
                {{ item.platform.charAt(0).toUpperCase() }}
              </div>
              <div class="trash-details">
                <span class="trash-platform">{{ item.platform }}</span>
                <span class="trash-account">{{ item.account }}</span>
                <span class="trash-time">删除于 {{ formatDeleteTime(item.deletedAt) }}</span>
              </div>
            </div>
            <div class="trash-actions">
              <el-tooltip content="恢复" placement="top">
                <el-button type="success" :icon="RefreshLeft" circle size="small" @click="restoreItem(item)" />
              </el-tooltip>
              <el-tooltip content="永久删除" placement="top">
                <el-button type="danger" :icon="Delete" circle size="small" @click="permanentDelete(item)" />
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="trashDialogVisible = false">关闭</el-button>
        <el-button type="danger" @click="emptyTrash" :disabled="trashItems.length === 0">
          <el-icon><Delete /></el-icon> 清空回收站
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加自定义标签对话框 -->
    <el-dialog
      v-model="customCategoryDialogVisible"
      title="添加自定义标签"
      width="400px"
      class="custom-category-dialog"
    >
      <div class="custom-category-form">
        <div class="form-item">
          <label>标签名称</label>
          <el-input v-model="customCategoryForm.label" placeholder="输入标签名称" maxlength="10" show-word-limit />
        </div>
        
        <div class="form-item">
          <label>选择图标</label>
          <div class="emoji-grid">
            <span 
              v-for="emoji in emojiList" 
              :key="emoji"
              class="emoji-item"
              :class="{ selected: customCategoryForm.icon === emoji }"
              @click="customCategoryForm.icon = emoji"
            >
              {{ emoji }}
            </span>
          </div>
        </div>
        
        <div class="preview-tag">
          预览：<span class="tag-preview">{{ customCategoryForm.icon }} {{ customCategoryForm.label || '标签名称' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="customCategoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addCustomCategory">添加标签</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.manager-container {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  max-width: 1400px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.manager-container.dark-mode {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.toolbar-left {
  flex: 1;
  min-width: 200px;
  max-width: 400px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  background: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-tab:hover {
  border-color: #409eff;
  transform: translateY(-2px);
}

.category-tab.active {
  background: linear-gradient(135deg, #409eff, #3b82f6);
  border-color: transparent;
  color: white;
}

.category-tab.active .cat-count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.category-tab .cat-delete {
  display: none;
  margin-left: 4px;
  width: 16px;
  height: 16px;
  line-height: 14px;
  text-align: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  font-size: 12px;
  cursor: pointer;
}

.category-tab:hover .cat-delete {
  display: inline-block;
}

.category-tab .cat-delete:hover {
  background: #f56c6c;
  color: white;
}

.category-tab.add-category {
  border-style: dashed;
  opacity: 0.7;
}

.category-tab.add-category:hover {
  opacity: 1;
  border-color: #409eff;
}

.cat-icon {
  font-size: 16px;
}

.cat-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.category-tab.active .cat-label {
  color: white;
}

.cat-count {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  color: var(--text-secondary);
}

/* 密码卡片 */
.card-col {
  margin-bottom: 20px;
}

.password-card {
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
}

.password-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--category-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.platform-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.platform-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}

.platform-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.platform-name {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-category {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.more-btn {
  color: var(--text-secondary);
}

.more-btn:hover {
  color: #409eff;
}

.card-body {
  padding: 16px;
}

.info-row {
  margin-bottom: 12px;
}

.info-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  font-weight: 600;
}

.info-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 8px;
}

.value-text {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 13px;
  color: var(--text-primary);
  word-break: break-all;
}

.password-mask {
  letter-spacing: 2px;
}

.value-actions {
  display: flex;
  gap: 4px;
}

.password-strength-bar {
  height: 3px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  margin: 8px 0;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.remark-row {
  margin-top: 8px;
}

.remark-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 8px;
}

/* 过期状态样式 */
.expiry-status {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.expiry-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.expiry-expired {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.expiry-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.custom-expiry-picker {
  margin-top: 4px;
}

.expiry-badge {
  margin-right: 0;
}

/* 过期卡片边框 */
.password-card.expired {
  border-color: #f56c6c;
}

.password-card.warning {
  border-color: #e6a23c;
}

/* 对话框样式 */
.password-input-wrapper {
  display: flex;
  gap: 8px;
  width: 100%;
}

.password-input-wrapper .el-input {
  flex: 1;
}

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

.strength-label {
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
}

/* 密码生成器 */
.generated-password-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f3f4f6;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  min-height: 56px;
}

.generated-text {
  font-family: 'SF Mono', 'Roboto Mono', monospace;
  font-size: 16px;
  word-break: break-all;
  color: #1f2937;
}

.generator-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.option-row .el-slider {
  flex: 1;
}

/* 导入对话框 */
.import-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-upload {
  margin-bottom: 8px;
}

/* 危险操作 */
.danger-item {
  color: #f56c6c !important;
}

/* 回收站样式 */
.trash-content {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
}

.trash-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trash-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.trash-item:hover {
  background: var(--bg-secondary);
  box-shadow: var(--shadow-sm);
}

.trash-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.trash-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.trash-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.trash-platform {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trash-account {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trash-time {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
  margin-top: 2px;
}

.trash-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 自定义标签对话框 */
.custom-category-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.custom-category-form .form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-category-form label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.emoji-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.emoji-item:hover {
  background: var(--bg-secondary);
  transform: scale(1.1);
}

.emoji-item.selected {
  background: #409eff;
  box-shadow: 0 0 0 2px #409eff40;
}

.preview-tag {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  text-align: center;
  color: var(--text-secondary);
}

.tag-preview {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  margin-left: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .toolbar-left {
    max-width: none;
  }
  
  .toolbar-right {
    justify-content: flex-end;
  }
  
  .category-tabs {
    gap: 6px;
  }
  
  .category-tab {
    padding: 8px 12px;
  }
  
  .cat-label {
    display: none;
  }
}

/* 暗色模式下的Element Plus组件 */
.dark-mode :deep(.el-input__wrapper) {
  background: var(--bg-tertiary);
  box-shadow: none;
}

.dark-mode :deep(.el-input__inner) {
  color: var(--text-primary);
}

.dark-mode :deep(.el-button--default) {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.dark-mode :deep(.el-card) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.dark-mode :deep(.el-dialog) {
  background: var(--bg-secondary);
}

.dark-mode :deep(.el-dialog__title) {
  color: var(--text-primary);
}
</style>
