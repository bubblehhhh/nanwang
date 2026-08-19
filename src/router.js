import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'

const Dashboard = () => import('./views/DashboardEnhanced.vue')
const TaskCenter = () => import('./views/TaskCenterEnhanced.vue')
const SmartInput = () => import('./views/SmartInputEnhanced.vue')
const Growth = () => import('./views/GrowthEnhanced.vue')
const WorkLibrary = () => import('./views/WorkLibraryEnhanced.vue')
const CareCenter = () => import('./views/CareCenterEnhanced.vue')
const Toolbox = () => import('./views/Toolbox.vue')
const CapabilityCenter = () => import('./views/CapabilityCenter.vue')

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

