import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('xinhuo_user') || 'null'))
  const loggedIn = computed(() => Boolean(user.value && localStorage.getItem('xinhuo_token')))
  function setSession(data) { user.value = data.user; localStorage.setItem('xinhuo_user', JSON.stringify(data.user)); localStorage.setItem('xinhuo_token', data.token) }
  function updateProfile(patch) { user.value = { ...user.value, ...patch }; localStorage.setItem('xinhuo_user', JSON.stringify(user.value)) }
  function logout() { user.value = null; localStorage.removeItem('xinhuo_user'); localStorage.removeItem('xinhuo_token') }
  return { user, loggedIn, setSession, updateProfile, logout }
})

