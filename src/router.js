import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import TaskCenter from './views/TaskCenterEnhanced.vue'
import SmartInput from './views/SmartInput.vue'
import Growth from './views/Growth.vue'
import WorkLibrary from './views/WorkLibrary.vue'
import CareCenter from './views/CareCenter.vue'
import Toolbox from './views/Toolbox.vue'
import CapabilityCenter from './views/CapabilityCenter.vue'

const router = createRouter({ history: location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(), routes: [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/', component: Dashboard },
  { path: '/tasks', component: TaskCenter },
  { path: '/smart-input', component: SmartInput },
  { path: '/growth', component: Growth },
  { path: '/capabilities', component: CapabilityCenter },
  { path: '/work-library', component: WorkLibrary },
  { path: '/care', component: CareCenter },
  { path: '/toolbox', component: Toolbox }
] })
router.beforeEach((to) => {
  const loggedIn = Boolean(localStorage.getItem('xinhuo_token'))
  if (!to.meta.public && !loggedIn) return '/login'
  if (to.path === '/login' && loggedIn) return '/'
})
export default router

