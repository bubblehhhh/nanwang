<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Connection, ArrowRight, EditPen } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api, { errorText, unwrap } from '../api'
import { useAuthStore } from '../store'

const router = useRouter(); const auth = useAuthStore(); const loading = ref(false)
const mode = ref('login')
const form = reactive({ username: '张三', password: 'Abc@123456', role: 'apprentice' })
const regForm = reactive({ name: '', username: '', password: '', confirm: '' })
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
async function register() {
  if (!regForm.name || !regForm.username) return ElMessage.warning('请填写姓名和登录工号')
  if (regForm.password.length < 8 || !/[^A-Za-z0-9]/.test(regForm.password)) return ElMessage.warning('密码至少8位且含特殊字符')
  if (regForm.password !== regForm.confirm) return ElMessage.warning('两次输入的密码不一致')
  loading.value = true
  try {
    const data = unwrap(await api.post('/auth/register', regForm)); auth.setSession(data)
    await ElMessageBox.alert(`注册成功，${data.user.name}！您的师父是${data.user.mentor || '待分配'}。`, '欢迎加入', { confirmButtonText: '进入工作台' })
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
        <div class="mode-switch"><button :class="{active:mode==='login'}" @click="mode='login'">登录</button><button :class="{active:mode==='register'}" @click="mode='register'">注册</button></div>
        <template v-if="mode==='login'">
          <p class="eyebrow">内部业务系统</p><h2>欢迎登录</h2><p class="muted">请选择身份，进入专属师徒工作台</p>
          <div class="role-switch"><button :class="{active:form.role==='apprentice'}" @click="switchRole('apprentice')">组员视角</button><button :class="{active:form.role==='mentor'}" @click="switchRole('mentor')">组长视角</button></div>
          <div class="relation-strip"><el-icon><Connection /></el-icon><div><b>{{ presets[form.role].label }}</b><span>{{ presets[form.role].relation }}</span></div></div>
          <el-form @submit.prevent="submit" label-position="top">
            <el-form-item label="姓名或工号"><el-input v-model="form.username" size="large" :prefix-icon="User" placeholder="请输入姓名或工号" /></el-form-item>
            <el-form-item label="登录密码"><el-input v-model="form.password" size="large" :prefix-icon="Lock" type="password" show-password placeholder="至少8位并含特殊字符" @keyup.enter="submit" /></el-form-item>
            <el-button class="login-submit" type="primary" size="large" :loading="loading" @click="submit">进入工作台 <el-icon><ArrowRight /></el-icon></el-button>
          </el-form>
          <p class="login-tip">演示账号已自动填入，可直接登录</p>
        </template>
        <template v-else>
          <p class="eyebrow">新员工注册</p><h2>加入薪火相传</h2><p class="muted">填写信息，系统将自动分配带教师傅</p>
          <el-form @submit.prevent="register" label-position="top">
            <el-form-item label="姓名"><el-input v-model="regForm.name" size="large" :prefix-icon="User" placeholder="请输入真实姓名" /></el-form-item>
            <el-form-item label="登录工号"><el-input v-model="regForm.username" size="large" :prefix-icon="User" placeholder="自定义登录工号" /></el-form-item>
            <el-form-item label="设置密码"><el-input v-model="regForm.password" size="large" :prefix-icon="Lock" type="password" show-password placeholder="至少8位并含特殊字符" /></el-form-item>
            <el-form-item label="确认密码"><el-input v-model="regForm.confirm" size="large" :prefix-icon="Lock" type="password" show-password placeholder="再次输入密码" @keyup.enter="register" /></el-form-item>
            <el-button class="login-submit" type="primary" size="large" :loading="loading" :icon="EditPen" @click="register">注册并进入工作台</el-button>
          </el-form>
          <p class="login-tip">注册后系统自动分配带教师傅</p>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page{display:flex;min-height:100vh;background:#0a1f3a;position:relative;overflow:hidden}
.power-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
.login-intro{flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 70px;position:relative;z-index:1}
.login-logo{display:flex;align-items:center;gap:12px;margin-bottom:40px}
.login-logo span{display:grid;place-items:center;width:44px;height:44px;background:#2b77c0;color:#fff;font-size:22px;font-weight:bold;border-radius:8px}
.login-logo div{color:#fff;font-size:18px;line-height:1.2}
.login-logo small{font-size:11px;color:#7da4cc}
.intro-copy h1{font-size:42px;color:#fff;margin:0 0 16px;line-height:1.2}
.intro-copy p{font-size:13px;color:#7da4cc;margin:0 0 4px;letter-spacing:1px}
.intro-line{width:60px;height:3px;background:#2b77c0;margin:20px 0}
.desc{font-size:14px!important;color:#9bb8d4!important;max-width:380px}
.login-stats{display:flex;gap:30px;margin-top:40px}
.login-stats b{font-size:28px;color:#fff}
.login-stats span{display:block;font-size:12px;color:#7da4cc;margin-top:2px}
.login-panel{width:480px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);backdrop-filter:blur(10px);border-left:1px solid rgba(255,255,255,.08);position:relative;z-index:1}
.login-box{width:100%;max-width:380px;padding:40px}
.mode-switch{display:flex;gap:0;margin-bottom:24px;border:1px solid #d0d5dd;border-radius:6px;overflow:hidden}
.mode-switch button{flex:1;padding:9px 0;border:0;background:transparent;font-size:14px;color:#687687;cursor:pointer}
.mode-switch button.active{background:#083a7c;color:#fff}
.login-box .eyebrow{font-size:12px;color:#7da4cc;letter-spacing:1px;margin:0 0 4px}
.login-box h2{font-size:24px;color:#fff;margin:0 0 4px}
.login-box .muted{font-size:13px;color:#7da4cc;margin:0 0 16px}
.role-switch{display:flex;gap:0;margin-bottom:12px;border:1px solid #d0d5dd;border-radius:6px;overflow:hidden}
.role-switch button{flex:1;padding:8px 0;border:0;background:transparent;font-size:13px;color:#687687;cursor:pointer}
.role-switch button.active{background:#083a7c;color:#fff}
.relation-strip{display:flex;align-items:center;gap:8px;background:rgba(43,119,192,.1);border:1px solid rgba(43,119,192,.2);padding:10px 12px;border-radius:6px;margin-bottom:16px}
.relation-strip .el-icon{color:#2b77c0;font-size:18px}
.relation-strip b{font-size:14px;color:#e0e8f0;display:block}
.relation-strip span{font-size:12px;color:#7da4cc}
.login-box :deep(.el-form-item__label){color:#9bb8d4;font-size:13px}
.login-box :deep(.el-input__wrapper){background:rgba(255,255,255,.06);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.login-box :deep(.el-input__inner){color:#fff}
.login-box :deep(.el-input__inner::placeholder){color:#5a7a9a}
.login-submit{width:100%;margin-top:4px}
.login-tip{text-align:center;font-size:12px;color:#5a7a9a;margin-top:12px}
</style>
