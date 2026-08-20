<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Message, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api, { errorText, unwrap } from '../api'

const router = useRouter()
const loading = ref(false)
const countdown = ref(0)
const form = reactive({ phone: '', code: '', newPassword: '' })
const demoCode = ref('')

async function sendCode() {
  if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) return ElMessage.warning('请输入正确的手机号')
  loading.value = true
  try {
    const data = unwrap(await api.post('/auth/send-code', { phone: form.phone }))
    demoCode.value = data.demoCode || ''
    countdown.value = 60
    const timer = setInterval(() => { countdown.value--; if (countdown.value <= 0) clearInterval(timer) }, 1000)
    ElMessage.success(`验证码已发送至手机尾号 ${form.phone.slice(-4)}`)
  } catch (e) { ElMessage.error(errorText(e)) } finally { loading.value = false }
}

async function submit() {
  if (!form.phone || !form.code || !form.newPassword) return ElMessage.warning('请填写完整信息')
  if (form.newPassword.length < 8 || !/[^A-Za-z0-9]/.test(form.newPassword)) return ElMessage.warning('新密码至少8位且需包含特殊字符')
  loading.value = true
  try {
    unwrap(await api.post('/auth/reset-password', form))
    ElMessage.success('密码重置成功，请使用新密码登录')
    setTimeout(() => router.push('/login'), 1000)
  } catch (e) { ElMessage.error(errorText(e)) } finally { loading.value = false }
}
</script>

<template>
  <div class="login-page">
    <div class="power-grid"></div>
    <section class="login-intro">
      <div class="login-logo"><span>电</span><div>南方电网<small>南网·薪火</small></div></div>
      <div class="intro-copy"><p>MENTORSHIP WORKSPACE</p><h1>薪火相传<br>点亮南网</h1><div class="intro-line"></div><p class="desc">让经验沉淀为方法，让成长发生在每一次协作之中。</p></div>
    </section>
    <section class="login-panel">
      <div class="login-box">
        <p class="eyebrow">账号安全</p>
        <h2>找回密码</h2>
        <p class="muted">通过手机号验证码重置登录密码</p>
        <el-form @submit.prevent="submit" label-position="top">
          <el-form-item label="手机号">
            <el-input v-model="form.phone" size="large" :prefix-icon="User" placeholder="请输入注册手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="验证码">
            <div style="display:flex;gap:10px;width:100%">
              <el-input v-model="form.code" size="large" :prefix-icon="Message" placeholder="请输入6位验证码" maxlength="6" style="flex:1" />
              <el-button size="large" :disabled="countdown > 0" :loading="loading" @click="sendCode" style="width:140px">
                {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="form.newPassword" size="large" :prefix-icon="Lock" type="password" show-password placeholder="至少8位且含特殊字符" />
          </el-form-item>
          <el-button class="login-submit" type="primary" size="large" :loading="loading" @click="submit">重置密码 <el-icon><ArrowRight /></el-icon></el-button>
        </el-form>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
          <el-link type="primary" :underline="false" @click="router.push('/login')"><el-icon style="margin-right:4px"><ArrowLeft /></el-icon>返回登录</el-link>
          <span v-if="demoCode" class="login-tip">演示验证码：{{ demoCode }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
