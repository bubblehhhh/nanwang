<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './store'
import { House, List, MagicStick, Trophy, Document, Sunny, Tools, SwitchButton, Aim } from '@element-plus/icons-vue'
import api, { errorText, unwrap } from './api'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore()
const isLogin = computed(() => route.path === '/login')
const keyDialog = ref(false); const apiKey = ref(''); const keySaving = ref(false)
const menus = [
  ['/', '工作台', House], ['/tasks', '任务中心', List], ['/smart-input', '智能拆解', MagicStick],
  ['/capabilities', '能力培养', Aim], ['/growth', '成长档案', Trophy], ['/work-library', '工作库', Document], ['/care', '人文关怀', Sunny], ['/toolbox', '百宝箱', Tools]
]
function logout() { auth.logout(); router.push('/login') }
async function checkAiKey() {
  try { const data = unwrap(await api.get('/health')); keyDialog.value = !data.aiConfigured } catch { keyDialog.value = false }
}
async function saveAiKey() {
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey.value.trim())) return ElMessage.warning('请输入有效的DeepSeek API密钥')
  keySaving.value = true
  try { await api.post('/settings/ai-key', { apiKey: apiKey.value.trim() }); apiKey.value = ''; keyDialog.value = false; ElMessage.success('密钥已保存到后端') }
  catch (error) { ElMessage.error(errorText(error)) }
  finally { keySaving.value = false }
}
onMounted(() => {
  checkAiKey()
  window.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd' && auth.loggedIn) {
      await api.post('/admin/reset'); localStorage.removeItem('xinhuo_modules'); location.reload()
    }
  })
})
</script>

<template>
  <router-view v-if="isLogin" />
  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">⚡</span><div><b>南方电网</b><small>南网·薪火</small></div></div>
      <nav>
        <router-link v-for="[path,label,icon] in menus" :key="path" :to="path"><el-icon><component :is="icon" /></el-icon><span>{{ label }}</span></router-link>
      </nav>
      <div class="sidebar-foot"><div class="mini-avatar">{{ auth.user?.avatar }}</div><div><b>{{ auth.user?.name }}</b><small>{{ auth.user?.roleName }} · {{ auth.user?.position }}</small></div><el-button text circle @click="logout"><el-icon><SwitchButton /></el-icon></el-button></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div><span class="crumb">南网·薪火</span><span>/</span><b>{{ route.meta.title || menus.find(m => m[0] === route.path)?.[1] }}</b></div><div class="top-actions"><el-tag type="success" effect="plain">系统运行正常</el-tag><span>{{ new Date().toLocaleDateString('zh-CN', { month:'long', day:'numeric', weekday:'short' }) }}</span></div></header>
      <router-view />
      <div class="watermark">南方电网公司 内部信息系统　涉密终端 请勿外泄</div>
    </main>
  </div>
  <el-dialog v-model="keyDialog" title="首次配置 AI 服务" width="460" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" append-to-body>
    <p class="key-setup-tip">请输入 DeepSeek API 密钥。密钥仅保存在本机后端，设置成功后不再提示。</p>
    <el-input v-model="apiKey" type="password" show-password autocomplete="new-password" placeholder="sk-..." @keyup.enter="saveAiKey"/>
    <template #footer><el-button type="primary" :loading="keySaving" :disabled="!apiKey.trim()" @click="saveAiKey">保存并继续</el-button></template>
  </el-dialog>
</template>

