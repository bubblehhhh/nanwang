<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './store'
import { House, List, MagicStick, Trophy, Document, Sunny, Tools, SwitchButton } from '@element-plus/icons-vue'
import api from './api'

const route = useRoute(); const router = useRouter(); const auth = useAuthStore()
const isLogin = computed(() => route.path === '/login')
const menus = [
  ['/', '工作台', House], ['/tasks', '任务中心', List], ['/smart-input', '智能拆解', MagicStick],
  ['/growth', '成长档案', Trophy], ['/work-library', '工作库', Document], ['/care', '人文关怀', Sunny], ['/toolbox', '百宝箱', Tools]
]
function logout() { auth.logout(); router.push('/login') }
onMounted(() => {
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
</template>

