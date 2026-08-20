import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import ForgotPassword from './views/ForgotPassword.vue'
import Dashboard from './views/DashboardEnhanced.vue'
import TaskCenter from './views/TaskCenterEnhanced.vue'
import SmartInput from './views/SmartInputEnhanced.vue'
import Growth from './views/GrowthEnhanced.vue'
import WorkLibrary from './views/WorkLibraryEnhanced.vue'
import CareCenter from './views/CareCenterEnhanced.vue'
import Toolbox from './views/Toolbox.vue'
import CapabilityCenter from './views/CapabilityCenter.vue'
import Profile from './views/Profile.vue'

const router = createRouter({ history: location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(), routes: [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/forgot-password', component: ForgotPassword, meta: { public: true } },
  { path: '/', component: Dashboard },
  { path: '/tasks', component: TaskCenter },
  { path: '/smart-input', component: SmartInput },
  { path: '/growth', component: Growth },
  { path: '/capabilities', component: CapabilityCenter },
  { path: '/work-library', component: WorkLibrary },
  { path: '/care', component: CareCenter },
  { path: '/toolbox', component: Toolbox },
  { path: '/profile', component: Profile, meta: { title: '个人设置' } }
] })
router.beforeEach((to) => {
  const loggedIn = Boolean(localStorage.getItem('xinhuo_token'))
  let user = null
  try { user = JSON.parse(localStorage.getItem('xinhuo_user') || 'null') } catch {}
  if (!to.meta.public && !loggedIn) return '/login'
  if (to.path === '/login' && loggedIn) return '/'
  if (to.path === '/growth' && user?.role === 'mentor') return '/'
})
export default router

