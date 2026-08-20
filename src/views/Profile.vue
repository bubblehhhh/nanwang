<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Check } from '@element-plus/icons-vue'
import { useAuthStore } from '../store'
import api, { errorText, unwrap } from '../api'

const auth = useAuthStore()
const user = computed(() => auth.user || {})

const avatarColors = ['#ff7a00', '#0033a0', '#00a650', '#0757c8', '#d36b00', '#7357b5', '#087c88', '#c53b47']
const avatarChars = ref([user.value?.name?.[0] || '用', '我', '南', '网', '薪', '火', '⚡', '★'])
const selectedAvatar = ref(user.value?.avatar || user.value?.name?.[0] || '用')
const selectedColor = ref(user.value?.avatarColor || '#ff7a00')
const avatarSaving = ref(false)

const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdSaving = ref(false)

async function saveAvatar() {
  avatarSaving.value = true
  try {
    const data = unwrap(await api.put('/profile/avatar', { avatar: selectedAvatar.value, avatarColor: selectedColor.value }))
    auth.updateProfile({ avatar: data.avatar, avatarColor: data.avatarColor })
    ElMessage.success('头像已更新')
  } catch (error) { ElMessage.error(errorText(error)) }
  finally { avatarSaving.value = false }
}

async function savePassword() {
  const { oldPassword, newPassword, confirmPassword } = pwdForm.value
  if (!oldPassword || !newPassword) return ElMessage.warning('请填写完整密码信息')
  if (newPassword.length < 8) return ElMessage.warning('新密码至少8位')
  if (newPassword !== confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  pwdSaving.value = true
  try {
    await api.put('/profile/password', { oldPassword, newPassword })
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    ElMessage.success('密码修改成功')
  } catch (error) { ElMessage.error(errorText(error)) }
  finally { pwdSaving.value = false }
}
</script>

<template>
  <div class="page">
    <div class="page-title"><div><p class="eyebrow">PERSONAL SETTINGS</p><h1>个人设置</h1><p>管理头像、密码等个人信息</p></div></div>

    <div class="profile-layout">
      <section class="panel profile-card">
        <div class="profile-avatar-section">
          <div class="profile-avatar-preview" :style="{ background: selectedColor }">{{ selectedAvatar }}</div>
          <div class="profile-info">
            <h2>{{ user.name }}</h2>
            <p>{{ user.roleName }} · {{ user.position }}</p>
            <div class="profile-tags">
              <el-tag size="small" type="info">{{ user.department }}</el-tag>
              <el-tag size="small" type="info">工号 {{ user.employeeNo }}</el-tag>
            </div>
          </div>
        </div>

        <div class="avatar-picker">
          <small class="picker-label">选择文字头像</small>
          <div class="avatar-chars">
            <button v-for="ch in avatarChars" :key="ch" :class="{ active: selectedAvatar === ch }" @click="selectedAvatar = ch">{{ ch }}</button>
          </div>
          <small class="picker-label">选择头像底色</small>
          <div class="avatar-colors">
            <button v-for="c in avatarColors" :key="c" :style="{ background: c }" :class="{ active: selectedColor === c }" @click="selectedColor = c">
              <el-icon v-if="selectedColor === c"><Check /></el-icon>
            </button>
          </div>
        </div>
        <el-button type="primary" :icon="Check" :loading="avatarSaving" @click="saveAvatar">保存头像</el-button>
      </section>

      <section class="panel password-card">
        <div class="panel-head">
          <h2><el-icon><Lock /></el-icon> 修改密码</h2>
          <p>设置新密码后需重新登录</p>
        </div>
        <el-form label-position="top" class="pwd-form">
          <el-form-item label="当前密码">
            <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少8位" />
          </el-form-item>
          <el-form-item label="确认新密码">
            <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" @keyup.enter="savePassword" />
          </el-form-item>
        </el-form>
        <el-button type="primary" :loading="pwdSaving" @click="savePassword">确认修改</el-button>
      </section>
    </div>

    <div class="security-note"><b>账户安全提示</b><p>密码至少8位，建议包含大小写字母、数字和符号。如忘记密码，请联系管理员重置。</p></div>
  </div>
</template>
