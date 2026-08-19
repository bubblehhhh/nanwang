import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 50000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('xinhuo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !location.pathname.includes('/login')) {
    localStorage.removeItem('xinhuo_token'); localStorage.removeItem('xinhuo_user'); location.href = '/login'
  }
  return Promise.reject(error)
})

export const unwrap = (response) => response.data.data
export const errorText = (error) => error.response?.data?.message || error.message || '操作失败'
export default api

