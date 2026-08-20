<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download, Files, Scissor } from '@element-plus/icons-vue'
import api, { errorText } from '../api'

function downloadBlob(data, name) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

async function blobErrorResponse(error) {
  const data = error.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      return { message: parsed.message || '', data: parsed.data }
    } catch {
      return { message: await data.text(), data: null }
    }
  }
  return { message: errorText(error), data: null }
}

const mergeFiles = ref([])
const mergeLoading = ref(false)
function onMergeChange(_file, list) { mergeFiles.value = list }

async function mergePdf(confirmed = false) {
  if (mergeFiles.value.length < 2) return ElMessage.warning('请至少选择2个PDF文件')
  mergeLoading.value = true
  const fd = new FormData()
  mergeFiles.value.forEach((f) => fd.append('files', f.raw))
  if (confirmed) fd.append('confirm', 'true')
  try {
    const res = await api.post('/pdf/merge', fd, { responseType: 'blob' })
    downloadBlob(res.data, '合并文件.pdf')
    ElMessage.success('PDF合并完成')
  } catch (e) {
    const { message, data } = await blobErrorResponse(e)
    if (data?.requiresConfirm) {
      try {
        await ElMessageBox.confirm(
          `${message}\n\n如确认文件内容已脱敏或无需脱敏，可继续处理。`,
          '敏感信息审核',
          { confirmButtonText: '确认继续', cancelButtonText: '取消', type: 'warning' }
        )
        await mergePdf(true)
      } catch { ElMessage.info('已取消操作') }
    } else {
      ElMessage.error(message)
    }
  } finally { mergeLoading.value = false }
}

const extractFile = ref(null)
const extractSpec = ref('')
const extractLoading = ref(false)
function onExtractChange(file) { extractFile.value = file.raw }
function onExtractRemove() { extractFile.value = null }

async function extractPdf(confirmed = false) {
  if (!extractFile.value) return ElMessage.warning('请选择一个PDF文件')
  if (!extractSpec.value.trim()) return ElMessage.warning('请填写页码范围，如 1-3,5,8-9')
  extractLoading.value = true
  const fd = new FormData()
  fd.append('file', extractFile.value)
  fd.append('spec', extractSpec.value.trim())
  if (confirmed) fd.append('confirm', 'true')
  try {
    const res = await api.post('/pdf/extract', fd, { responseType: 'blob' })
    downloadBlob(res.data, '提取页面.pdf')
    ElMessage.success('PDF页面提取完成')
  } catch (e) {
    const { message, data } = await blobErrorResponse(e)
    if (data?.requiresConfirm) {
      try {
        await ElMessageBox.confirm(
          `${message}\n\n如确认文件内容已脱敏或无需脱敏，可继续处理。`,
          '敏感信息审核',
          { confirmButtonText: '确认继续', cancelButtonText: '取消', type: 'warning' }
        )
        await extractPdf(true)
      } catch { ElMessage.info('已取消操作') }
    } else {
      ElMessage.error(message)
    }
  } finally { extractLoading.value = false }
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <div>
        <p class="eyebrow">UTILITY TOOLBOX</p>
        <h1>办公百宝箱</h1>
        <p>处理日常工作中常见的 PDF 合并与页面提取需求</p>
      </div>
    </div>
    <div class="tool-grid">
      <section class="panel tool-active">
        <div class="tool-title">
          <span><el-icon><Files /></el-icon></span>
          <div><h2>PDF 文件合并</h2><p>按列表顺序将多个 PDF 合并为一个文件，上传时自动审核敏感信息</p></div>
        </div>
        <el-upload drag multiple accept=".pdf" :auto-upload="false" :on-change="onMergeChange" :on-remove="onMergeChange">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽多个 PDF 到此处，或<em>选择文件</em></div>
        </el-upload>
        <el-button type="primary" size="large" :icon="Download" :loading="mergeLoading" @click="mergePdf">合并并下载</el-button>
      </section>

      <section class="panel tool-active">
        <div class="tool-title">
          <span><el-icon><Scissor /></el-icon></span>
          <div><h2>PDF 页面提取</h2><p>按页码范围从单个 PDF 中提取页面生成新文件，上传时自动审核敏感信息</p></div>
        </div>
        <el-upload drag accept=".pdf" :auto-upload="false" :limit="1" :on-change="onExtractChange" :on-remove="onExtractRemove">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽一个 PDF 到此处，或<em>选择文件</em></div>
        </el-upload>
        <el-input v-model="extractSpec" placeholder="页码范围，如 1-3,5,8-9（从第1页开始）" />
        <el-button type="primary" size="large" :icon="Download" :loading="extractLoading" @click="extractPdf">提取并下载</el-button>
      </section>
    </div>
  </div>
</template>
