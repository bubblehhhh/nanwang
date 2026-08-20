<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Download, Files, Scissor, Lock, CopyDocument } from '@element-plus/icons-vue'
import api, { errorText, unwrap } from '../api'

function downloadBlob(data, name) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

async function blobErrorText(error) {
  const data = error.response?.data
  if (data instanceof Blob) {
    try { return JSON.parse(await data.text()).message || await data.text() } catch {}
  }
  return errorText(error)
}

const mergeFiles = ref([])
const mergeLoading = ref(false)
function onMergeChange(_file, list) { mergeFiles.value = list }
async function mergePdf() {
  if (mergeFiles.value.length < 2) return ElMessage.warning('请至少选择2个PDF文件')
  mergeLoading.value = true
  const fd = new FormData()
  mergeFiles.value.forEach((f) => fd.append('files', f.raw))
  try {
    const res = await api.post('/pdf/merge', fd, { responseType: 'blob' })
    downloadBlob(res.data, '合并文件.pdf')
    ElMessage.success('PDF合并完成')
  } catch (e) { ElMessage.error(await blobErrorText(e)) } finally { mergeLoading.value = false }
}

const extractFile = ref(null)
const extractSpec = ref('')
const extractLoading = ref(false)
function onExtractChange(file) { extractFile.value = file.raw }
function onExtractRemove() { extractFile.value = null }
async function extractPdf() {
  if (!extractFile.value) return ElMessage.warning('请选择一个PDF文件')
  if (!extractSpec.value.trim()) return ElMessage.warning('请填写页码范围，如 1-3,5,8-9')
  extractLoading.value = true
  const fd = new FormData()
  fd.append('file', extractFile.value)
  fd.append('spec', extractSpec.value.trim())
  try {
    const res = await api.post('/pdf/extract', fd, { responseType: 'blob' })
    downloadBlob(res.data, '提取页面.pdf')
    ElMessage.success('PDF页面提取完成')
  } catch (e) { ElMessage.error(await blobErrorText(e)) } finally { extractLoading.value = false }
}

const desensMode = ref('text')
const desensText = ref('')
const desensResult = ref('')
const desensCount = ref(0)
const desensFileName = ref('')
const desensFile = ref(null)
const desensLoading = ref(false)
function onDesensFileChange(file) { desensFile.value = file.raw; desensFileName.value = file.name }
function onDesensFileRemove() { desensFile.value = null; desensFileName.value = '' }
function countMasked(text) {
  return (text.match(/\*+|\[已删除\]/g) || []).length
}
async function runDesensitize() {
  desensLoading.value = true
  desensResult.value = ''
  desensCount.value = 0
  try {
    let text = ''
    if (desensMode.value === 'text') {
      if (!desensText.value.trim()) { desensLoading.value = false; return ElMessage.warning('请输入需要脱敏的文本') }
      text = unwrap(await api.post('/desensitize', { text: desensText.value })).text
    } else {
      if (!desensFile.value) { desensLoading.value = false; return ElMessage.warning('请选择文件') }
      const fd = new FormData()
      fd.append('file', desensFile.value)
      const data = unwrap(await api.post('/file/upload', fd))
      text = data.content
      if (data.fileName) desensFileName.value = data.fileName
    }
    desensResult.value = text
    desensCount.value = countMasked(text)
    ElMessage.success(`脱敏完成，共标记 ${desensCount.value} 处敏感信息`)
  } catch (e) { ElMessage.error(errorText(e)) } finally { desensLoading.value = false }
}
async function copyResult() {
  if (!desensResult.value) return
  try { await navigator.clipboard.writeText(desensResult.value); ElMessage.success('已复制到剪贴板') }
  catch { ElMessage.error('复制失败，请手动选择文本复制') }
}
function downloadResult() {
  if (!desensResult.value) return
  downloadBlob(new Blob([desensResult.value], { type: 'text/plain;charset=utf-8' }), '脱敏结果.txt')
}
</script>

<template>
  <div class="page">
    <div class="page-title">
      <div>
        <p class="eyebrow">UTILITY TOOLBOX</p>
        <h1>办公百宝箱</h1>
        <p>整合 PDF 处理与敏感信息脱敏，覆盖日常办公文件处理需求</p>
      </div>
    </div>
    <div class="tool-grid">
      <section class="panel tool-active">
        <div class="tool-title">
          <span><el-icon><Files /></el-icon></span>
          <div><h2>PDF 文件合并</h2><p>按列表顺序将多个 PDF 合并为一个文件</p></div>
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
          <div><h2>PDF 页面提取</h2><p>按页码范围从单个 PDF 中提取页面生成新文件</p></div>
        </div>
        <el-upload drag accept=".pdf" :auto-upload="false" :limit="1" :on-change="onExtractChange" :on-remove="onExtractRemove">
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽一个 PDF 到此处，或<em>选择文件</em></div>
        </el-upload>
        <el-input v-model="extractSpec" placeholder="页码范围，如 1-3,5,8-9（从第1页开始）" />
        <el-button type="primary" size="large" :icon="Download" :loading="extractLoading" @click="extractPdf">提取并下载</el-button>
      </section>

      <section class="panel tool-active toolbox-desens">
        <div class="tool-title">
          <span><el-icon><Lock /></el-icon></span>
          <div><h2>敏感信息脱敏</h2><p>自动隐藏手机号、身份证号、银行卡号、邮箱、密码与密钥</p></div>
        </div>
        <el-segmented v-model="desensMode" :options="[{ label: '文本脱敏', value: 'text' }, { label: '文件脱敏', value: 'file' }]" />
        <div v-if="desensMode === 'text'" class="desens-input">
          <el-input v-model="desensText" type="textarea" :rows="6" placeholder="粘贴会议纪要、客户信息、工作记录等需要脱敏的文本..." />
        </div>
        <div v-else class="desens-input">
          <el-upload drag accept=".txt,.csv,.doc,.docx,.xls,.xlsx" :auto-upload="false" :limit="1" :on-change="onDesensFileChange" :on-remove="onDesensFileRemove">
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">支持 TXT、CSV、Word、Excel，拖拽或<em>选择文件</em></div>
          </el-upload>
        </div>
        <div class="desens-actions">
          <el-button type="primary" :icon="Lock" :loading="desensLoading" @click="runDesensitize">开始脱敏</el-button>
          <el-tag v-if="desensResult" type="success" effect="plain">共标记 {{ desensCount }} 处敏感信息</el-tag>
        </div>
        <div v-if="desensResult" class="desens-result">
          <div class="desens-result-head">
            <b>脱敏结果</b>
            <span v-if="desensFileName">{{ desensFileName }}</span>
          </div>
          <el-input :model-value="desensResult" type="textarea" :rows="8" readonly />
          <div class="desens-result-actions">
            <el-button :icon="CopyDocument" @click="copyResult">复制结果</el-button>
            <el-button :icon="Download" @click="downloadResult">下载为 TXT</el-button>
          </div>
        </div>
      </section>
    </div>
    <div class="security-note">
      <b>文件安全说明</b>
      <p>上传文件仅在本机后端临时处理，完成或失败后立即删除；请勿上传超出工作授权范围的材料。脱敏结果请人工复核后再使用，确保未遗漏姓名、地址等需手动处理的敏感信息。</p>
    </div>
  </div>
</template>
