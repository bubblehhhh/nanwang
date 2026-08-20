<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Connection, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api, { errorText, unwrap } from '../api'
import { useAuthStore } from '../store'

const router = useRouter(); const auth = useAuthStore(); const loading = ref(false)
const form = reactive({ username: '张三', password: 'Abc@123456', role: 'apprentice' })
const presets = { apprentice: { username: '张三', label: '张三 · 组员', relation: '师父：李四' }, mentor: { username: '李四', label: '李四 · 组长', relation: '学员：张三、赵六' } }
function switchRole(role) { form.role = role; form.username = presets[role].username; form.password = 'Abc@123456' }
async function submit() {
  if (!form.username || form.password.length < 8 || !/[^A-Za-z0-9]/.test(form.password)) return ElMessage.warning('请输入姓名/工号，并使用至少8位且含特殊字符的密码')
  loading.value = true
  try {
    const data = unwrap(await api.post('/auth/login', form)); auth.setSession(data)
    await ElMessageBox.alert(data.user.role === 'mentor' ? `欢迎回来，${data.user.name}。您正在带教张三、赵六。` : `欢迎回来，${data.user.name}。您的师父是${data.user.mentor}。`, '薪火相传', { confirmButtonText: '进入工作台' })
    router.push('/')
  } catch (e) { ElMessage.error(errorText(e)) } finally { loading.value = false }
}
</script>

<template>
  <div class="login-page">
    <div class="power-grid"></div>
    <section class="login-intro">
      <div class="login-logo"><span>电</span><div>南方电网<small>南网·薪火</small></div></div>
      <div class="intro-copy"><p>MENTORSHIP WORKSPACE</p><h1>薪火相传<br>点亮南网</h1><div class="intro-line"></div><p class="desc">让经验沉淀为方法，让成长发生在每一次协作之中。</p></div>
      <div class="login-stats"><div><b>2</b><span>在培学员</span></div><div><b>87%</b><span>平均进度</span></div><div><b>12</b><span>本月里程碑</span></div></div>
    </section>
    <section class="login-panel">
      <div class="login-box">
        <p class="eyebrow">内部业务系统</p><h2>欢迎登录</h2><p class="muted">请选择身份，进入专属师徒工作台</p>
        <div class="role-switch"><button :class="{active:form.role==='apprentice'}" @click="switchRole('apprentice')">组员视角</button><button :class="{active:form.role==='mentor'}" @click="switchRole('mentor')">组长视角</button></div>
        <div class="relation-strip"><el-icon><Connection /></el-icon><div><b>{{ presets[form.role].label }}</b><span>{{ presets[form.role].relation }}</span></div></div>
        <el-form @submit.prevent="submit" label-position="top">
          <el-form-item label="姓名或工号"><el-input v-model="form.username" size="large" :prefix-icon="User" placeholder="请输入姓名或工号" /></el-form-item>
          <el-form-item label="登录密码"><el-input v-model="form.password" size="large" :prefix-icon="Lock" type="password" show-password placeholder="至少8位并含特殊字符" @keyup.enter="submit" /></el-form-item>
          <el-button class="login-submit" type="primary" size="large" :loading="loading" @click="submit">进入工作台 <el-icon><ArrowRight /></el-icon></el-button>
        </el-form>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px">
          <el-link type="primary" :underline="false" @click="router.push('/forgot-password')">忘记密码？</el-link>
          <span class="login-tip">演示账号已自动填入</span>
        </div>
      </div>
    </section>
  </div>
</template>

