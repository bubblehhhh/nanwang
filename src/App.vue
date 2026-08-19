<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './store'
import { House, List, MagicStick, Trophy, Document, Sunny, Tools, SwitchButton, Aim } from '@element-plus/icons-vue'
import api, { errorText, unwrap } from './api'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore()
const isLogin = computed(() => route.path === '/login')
const keyDialog = ref(false); const apiKey = ref(''); const keySaving = ref(false); const replacingKey = ref(false); const quotaDialog = ref(false)
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
  try { await api.request({method:replacingKey.value?'put':'post',url:'/settings/ai-key',data:{apiKey:apiKey.value.trim()}}); apiKey.value = ''; keyDialog.value = false; replacingKey.value=false; ElMessage.success('密钥已验证并保存到后端') }
  catch (error) { ElMessage.error(errorText(error)) }
  finally { keySaving.value = false }
}
function showQuotaDialog(){quotaDialog.value=true}
function replaceKey(){quotaDialog.value=false;replacingKey.value=true;apiKey.value='';keyDialog.value=true}
onMounted(() => {
  checkAiKey()
  window.addEventListener('xinhuo-ai-quota',showQuotaDialog)
  window.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd' && auth.loggedIn) {
      await api.post('/admin/reset'); localStorage.removeItem('xinhuo_modules'); location.reload()
    }
  })
})
onBeforeUnmount(()=>window.removeEventListener('xinhuo-ai-quota',showQuotaDialog))
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
  <el-dialog v-model="quotaDialog" title="AI 服务额度不足" width="460" append-to-body><el-alert title="当前 DeepSeek 密钥账户余额不足，本次操作已自动使用本地规则完成。" type="warning" :closable="false" show-icon/><p class="key-setup-tip">选择稍后处理后，本次不再打扰；下一次调用 AI 时会再次提醒。</p><template #footer><el-button @click="quotaDialog=false">稍后处理</el-button><el-button type="primary" @click="replaceKey">更换新密钥</el-button></template></el-dialog>
  <el-dialog v-model="keyDialog" :title="replacingKey?'更换 DeepSeek 密钥':'首次配置 AI 服务'" width="460" :close-on-click-modal="replacingKey" :close-on-press-escape="replacingKey" :show-close="replacingKey" append-to-body @closed="replacingKey=false">
    <p class="key-setup-tip">{{replacingKey?'新密钥会先在后端验证认证状态和账户余额，通过后才会替换当前密钥。':'请输入 DeepSeek API 密钥。密钥仅保存在本机后端，设置成功后不再提示。'}}</p>
    <el-input v-model="apiKey" type="password" show-password autocomplete="new-password" placeholder="sk-..." @keyup.enter="saveAiKey"/>
    <template #footer><el-button v-if="replacingKey" @click="keyDialog=false">取消</el-button><el-button type="primary" :loading="keySaving" :disabled="!apiKey.trim()" @click="saveAiKey">{{replacingKey?'验证并更换':'保存并继续'}}</el-button></template>
  </el-dialog>
</template>

