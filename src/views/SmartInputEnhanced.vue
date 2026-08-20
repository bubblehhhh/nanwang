<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, MagicStick, Check, Document, EditPen, Filter } from '@element-plus/icons-vue'
import api, { errorText, unwrap } from '../api'

const text = ref(''), tasks = ref([]), methods = ref(['WBS']), confirmed = ref(false)
const loading = ref(false), publishing = ref(false), warning = ref('')
const source = ref(null), view = ref('cards'), fileName = ref('')
const fileMeta = ref(null)
const minutes = ref(null), minutesLoading = ref(false), minutesSaved = ref(false)
const minutesAi = ref(false)
const apprentices = ref([])
const publishDialog = ref(false)
const desensitizeDialog = ref(false)
const desensitizedPreview = ref('')

const options = [['四象限法', '重要度与紧急度'], ['WBS', '工作包与交付物'], ['KANO', '需求价值分层'], ['RICE', '影响与成本评分'], ['关键路径法', '依赖与关键工期'], ['SMART', '可衡量目标'], ['PDCA', '闭环持续改进'], ['5W2H', '执行要素完整化']]
const sourceMeta = computed(() => ({ meeting: ['会议材料', '会议任务', '会议行动项', '会议导入'], project: ['项目材料', '项目工作', '待命名项目', '项目资料导入'], daily: ['日常材料', '日常工作', '日常工作', '日常资料导入'] }[source.value?.type] || ['待识别', '', '', '']))
const selected = computed(() => tasks.value.filter(t => t.selected && !t.published && !t.duplicate))
const step = computed(() => {
  if (!text.value.trim()) return 1
  if (!confirmed.value) return 2
  if (!minutes.value && !tasks.value.length) return 3
  if (!tasks.value.length) return 4
  return 5
})

onMounted(async () => {
  try {
    const dashboard = unwrap(await api.get('/dashboard'))
    apprentices.value = dashboard.users.filter(u => u.role === 'apprentice')
  } catch {}
})

async function upload(o) {
  const fd = new FormData(); fd.append('file', o.file)
  try {
    const d = unwrap(await api.post('/file/upload', fd))
    text.value = d.content; fileName.value = d.fileName
    confirmed.value = false; minutes.value = null; minutesSaved.value = false; minutesAi.value = false
    fileMeta.value = {
      type: d.fileType, label: d.fileLabel, icon: d.fileIcon, color: d.fileColor,
      processed: d.processed, needsManualInput: d.needsManualInput,
      processingNote: d.processingNote, size: d.fileSize
    }
    if (d.needsManualInput) ElMessage.info(`${d.fileLabel}已接收，${d.processingNote}，请在下方补充文本`)
  } catch (e) { ElMessage.error(errorText(e)) }
}

async function reviewDesensitize() {
  try {
    const d = unwrap(await api.post('/desensitize', { text: text.value }))
    desensitizedPreview.value = d.text
    desensitizeDialog.value = true
  } catch (e) { ElMessage.error(errorText(e)) }
}

async function confirmDesensitize() {
  try {
    await ElMessageBox.confirm(
      '请确认手机号、证件号、邮箱、地址、密码及密钥等敏感信息均已隐藏或脱敏处理。',
      '脱敏人工复核',
      { confirmButtonText: '确认脱敏无误', type: 'warning' }
    )
    confirmed.value = true
    desensitizeDialog.value = false
  } catch (e) { if (e !== 'cancel' && e !== 'close') ElMessage.error(errorText(e)) }
}

function useDesensitizedText() {
  text.value = desensitizedPreview.value
  ElMessage.success('已采用系统脱敏结果')
}

async function generateMinutes() {
  if (text.value.trim().length < 10) return ElMessage.warning('请至少输入10个字')
  if (!confirmed.value) return ElMessage.warning('请先确认脱敏')
  minutesLoading.value = true
  try {
    const d = unwrap(await api.post('/meeting-minutes/generate', { text: text.value }))
    minutes.value = d.minutes
    minutesAi.value = d.ai
    warning.value = d.warning || ''
    if (!d.ai) ElMessage.warning(d.warning || 'AI暂不可用，已生成基础框架')
  } catch (e) { ElMessage.error(errorText(e)) }
  finally { minutesLoading.value = false }
}

async function saveMinutes() {
  if (!minutes.value) return
  try {
    await api.post('/meeting-minutes/save', { ...minutes.value, sourceText: text.value.slice(0, 2000) })
    minutesSaved.value = true
    ElMessage.success('会议纪要已保存')
  } catch (e) { ElMessage.error(errorText(e)) }
}

async function split() {
  const splitSource = minutes.value
    ? `${minutes.value.title} ${minutes.value.date}\n议题：${minutes.value.agenda.map(a => `${a.topic}：${a.discussion}`).join('\n')}\n行动项：${minutes.value.agenda.flatMap(a => a.actionItems).map(a => a.task).join('\n')}`
    : text.value
  if (splitSource.trim().length < 10) return ElMessage.warning('请至少输入10个字')
  if (!confirmed.value) return ElMessage.warning('请先确认脱敏')
  loading.value = true
  try {
    const d = unwrap(await api.post('/task/split', { text: splitSource, methods: methods.value }))
    source.value = { type: d.sourceType, confidence: d.sourceConfidence, reason: d.sourceReason }
    const m = ({ meeting: ['meeting', '会议行动项', '会议导入'], project: ['project', '待命名项目', '项目资料导入'], daily: ['daily', '日常工作', '日常资料导入'] })[d.sourceType]
    tasks.value = d.tasks.map((t, i) => ({
      ...t, workCategory: m[0], projectName: m[1], source: m[2],
      startTime: `${String(9 + i).padStart(2, '0')}:00`, endTime: `${String(10 + i).padStart(2, '0')}:00`,
      selected: true, assigneeId: apprentices.value[0]?.id || 1
    }))
    warning.value = d.warning || ''
  } catch (e) { ElMessage.error(errorText(e)) }
  finally { loading.value = false }
}

function openPublishDialog() {
  if (!selected.value.length) return ElMessage.warning('请至少选择一项任务')
  publishDialog.value = true
}

async function confirmPublish() {
  publishing.value = true
  try {
    const d = unwrap(await api.post('/tasks/bulk', {
      tasks: selected.value.map(t => ({ ...t, assigneeId: Number(t.assigneeId) || apprentices.value[0]?.id || 1 }))
    }))
    const p = new Set(d.published.map(t => t.title)), x = new Set(d.duplicates.map(t => t.title))
    tasks.value.forEach(t => { if (p.has(t.title)) t.published = true; if (x.has(t.title)) t.duplicate = true })
    ElMessage.success(`发布 ${d.published.length} 项，跳过 ${d.duplicates.length} 项`)
    publishDialog.value = false
  } catch (e) { ElMessage.error(errorText(e)) }
  finally { publishing.value = false }
}
</script>

<template>
<div class="page smartx">
<div class="page-title">
<div>
<p class="eyebrow">AI TASK STRUCTURING</p>
<h1>智能识别与科学拆解</h1>
<p>AI自动判断材料来源，支持多模态文件识别、会议纪要生成与发布确认</p>
</div>
</div>

<div class="step-bar">
<div class="step" :class="{ active: step >= 1, done: step > 1 }"><span>1</span>导入与识别</div>
<div class="step" :class="{ active: step >= 2, done: step > 2 }"><span>2</span>脱敏确认</div>
<div class="step" :class="{ active: step >= 3, done: step > 3 }"><span>3</span>会议纪要</div>
<div class="step" :class="{ active: step >= 4, done: step > 4 }"><span>4</span>科学拆解</div>
<div class="step" :class="{ active: step >= 5 }"><span>5</span>发布确认</div>
</div>

<div class="smartx-grid">
<section class="sx-input">
<header><h2>1. 导入与脱敏确认</h2><p>来源类型无需选择，拆解时由AI识别</p></header>

<el-upload drag :show-file-list="false" :http-request="upload">
<UploadFilled />
<div>拖拽文件或<em>选择文件</em></div>
</el-upload>

<div v-if="fileMeta" class="file-meta-card" :style="{ borderColor: fileMeta.color }">
<div class="file-meta-top">
<span class="file-type-badge" :style="{ background: fileMeta.color }">{{ fileMeta.label }}</span>
<span v-if="fileMeta.processed" class="file-status ok"><Check />已解析</span>
<span v-else class="file-status warn"><EditPen />{{ fileMeta.processingNote }}</span>
</div>
<small v-if="fileMeta.size">文件大小：{{ (fileMeta.size / 1024).toFixed(1) }} KB</small>
</div>

<span v-if="fileName" class="file-name"><Check />{{ fileName }}</span>

<el-input v-model="text" type="textarea" :rows="6" placeholder="粘贴会议纪要、项目资料、工作安排等内容" @input="() => { confirmed = false; minutes = null; minutesAi = false }" />

<div class="confirm-row" :class="{ ok: confirmed }">
<span>{{ confirmed ? '脱敏已人工确认' : '拆解前必须确认脱敏结果' }}</span>
<div class="confirm-actions">
<el-button v-if="text.trim()" size="small" @click="reviewDesensitize">查看脱敏预览</el-button>
<el-button :type="confirmed ? 'success' : 'warning'" plain @click="confirmDesensitize">{{ confirmed ? '重新确认' : '检查并确认' }}</el-button>
</div>
</div>

<header v-if="confirmed">
<h2>2. 会议纪要生成</h2>
<p>从会议材料自动提取结构化纪要，可编辑后保存</p>
</header>

<el-button v-if="confirmed && !minutes" class="split-btn" type="info" :icon="Document" :loading="minutesLoading" @click="generateMinutes">生成会议纪要</el-button>

<div v-if="minutes" class="minutes-panel">
<div class="minutes-header">
<div>
<b>{{ minutes.title }}</b>
<small v-if="minutes.date">{{ minutes.date }} {{ minutes.location }}</small>
</div>
<div class="minutes-actions">
<el-button v-if="!minutesSaved" size="small" type="success" @click="saveMinutes">保存纪要</el-button>
<el-tag v-else type="success" size="small">已保存</el-tag>
</div>
</div>

<div v-if="minutes.attendees?.length" class="minutes-section">
<small>参会人员</small>
<div class="attendee-tags">
<el-tag v-for="(p, i) in minutes.attendees" :key="i" size="small">{{ p }}</el-tag>
</div>
</div>

<div v-for="(ag, i) in minutes.agenda" :key="i" class="agenda-item">
<div class="agenda-topic">
<span class="topic-num">{{ i + 1 }}</span>
<b>{{ ag.topic }}</b>
</div>
<p class="agenda-discussion">{{ ag.discussion }}</p>
<div v-if="ag.actionItems?.length" class="action-items">
<div v-for="(a, j) in ag.actionItems" :key="j" class="action-item">
<el-checkbox />
<span>{{ a.task }}</span>
<small v-if="a.owner">{{ a.owner }}</small>
<small v-if="a.dueDate">截止：{{ a.dueDate }}</small>
</div>
</div>
</div>

<div v-if="minutes.decisions?.length" class="minutes-section">
<small>决议</small>
<ul><li v-for="(d, i) in minutes.decisions" :key="i">{{ d }}</li></ul>
</div>

<el-alert v-if="warning && !minutesAi" :title="warning" type="warning" :closable="false" />
<el-button class="split-btn" type="info" plain size="small" @click="minutes = null; minutesSaved = false; minutesAi = false">重新生成</el-button>
</div>

<header>
<h2>3. 选择科学方法</h2><p>可以组合多个方法提升拆解质量</p>
</header>

<el-checkbox-group v-model="methods" class="method-grid">
<el-checkbox v-for="o in options" :key="o[0]" :value="o[0]"><b>{{ o[0] }}</b><small>{{ o[1] }}</small></el-checkbox>
</el-checkbox-group>

<el-button class="split-btn" type="primary" :icon="MagicStick" :loading="loading" @click="split">
{{ minutes ? '基于纪要拆解任务' : 'AI识别来源并拆解' }}
</el-button>
</section>

<section class="sx-result">
<header>
<div>
<h2>4. 结构化任务</h2>
<p v-if="source">识别为 {{ sourceMeta[0] }} · 置信度 {{ source.confidence }}% · {{ source.reason }}</p>
<p v-else>拆解后可切换卡片、表格和思维导图</p>
</div>
<div>
<el-segmented v-model="view" :options="[{ label: '卡片', value: 'cards' }, { label: '表格', value: 'table' }, { label: '思维导图', value: 'mind' }]" />
</div>
</header>

<el-alert v-if="warning" :title="warning" type="warning" :closable="false" />

<div v-if="tasks.length && view === 'cards'" class="task-cards">
<article v-for="(t, i) in tasks" :key="i">
<el-checkbox v-model="t.selected" :disabled="t.published || t.duplicate" />
<div>
<span><el-tag>{{ t.priority }}</el-tag> +{{ t.points }} 积分</span>
<el-input v-model="t.title" size="small" />
<p>{{ t.description }}</p>
<small>{{ t.method }} · {{ t.dueDate }} · {{ t.standard }}</small>
<div class="task-assign">
<span>负责人</span>
<el-select v-model="t.assigneeId" size="small" style="width:120px">
<el-option v-for="a in apprentices" :key="a.id" :label="a.name" :value="a.id" />
</el-select>
</div>
</div>
<el-tag v-if="t.published" type="success">已发布</el-tag>
<el-tag v-if="t.duplicate" type="warning">重复</el-tag>
</article>
</div>

<el-table v-else-if="tasks.length && view === 'table'" :data="tasks" stripe>
<el-table-column width="45"><template #default="s"><el-checkbox v-model="s.row.selected" /></template></el-table-column>
<el-table-column prop="title" label="任务" min-width="190" />
<el-table-column prop="priority" label="等级" width="70" />
<el-table-column prop="method" label="方法" width="100" />
<el-table-column prop="dueDate" label="期限" width="110" />
<el-table-column prop="points" label="积分" width="70" />
</el-table>

<div v-else-if="tasks.length" class="mind-map">
<div class="mind-root">{{ sourceMeta[0] }}<small>{{ methods.join(' + ') }}</small></div>
<div class="mind-branches">
<article v-for="(t, i) in tasks" :key="i"><i></i>
<div><b>{{ i + 1 }}. {{ t.title }}</b><span>{{ t.priority }} · {{ t.method }} · +{{ t.points }}分</span><small>{{ t.standard }}</small></div>
</article>
</div>
</div>

<el-empty v-else description="等待AI识别与拆解" />

<div v-if="tasks.length" class="publish-bar">
<div class="publish-summary">
<span>已选 <b>{{ selected.length }}</b> 项</span>
<span v-if="tasks.filter(t => t.published).length">已发布 {{ tasks.filter(t => t.published).length }} 项</span>
<span v-if="tasks.filter(t => t.duplicate).length">重复 {{ tasks.filter(t => t.duplicate).length }} 项</span>
</div>
<el-button type="primary" :icon="Filter" :loading="publishing" :disabled="!selected.length" @click="openPublishDialog">发布确认</el-button>
</div>
</section>
</div>

<el-dialog v-model="desensitizeDialog" title="脱敏预览" width="640">
<div class="desensitize-compare">
<div class="desensitize-col">
<h4>原始文本</h4>
<el-input v-model="text" type="textarea" :rows="10" />
</div>
<div class="desensitize-col">
<h4>脱敏后</h4>
<div class="desensitized-preview">{{ desensitizedPreview }}</div>
<el-button size="small" type="primary" @click="useDesensitizedText" style="margin-top:8px">采用脱敏结果</el-button>
</div>
</div>
<template #footer>
<el-button @click="desensitizeDialog = false">关闭</el-button>
<el-button type="warning" @click="confirmDesensitize">确认脱敏无误</el-button>
</template>
</el-dialog>

<el-dialog v-model="publishDialog" title="发布确认 - 师傅审核" width="780">
<el-alert title="请审核以下任务，可编辑标题、调整负责人或取消选择。" type="info" :closable="false" style="margin-bottom:12px" />
<div class="publish-task-list">
<div v-for="(t, i) in tasks.filter(x => x.selected && !x.published && !x.duplicate)" :key="i" class="publish-task-item">
<el-checkbox v-model="t.selected" />
<div class="publish-task-main">
<el-input v-model="t.title" size="small" placeholder="任务标题" />
<div class="publish-task-meta">
<el-select v-model="t.assigneeId" size="small" style="width:110px">
<el-option v-for="a in apprentices" :key="a.id" :label="a.name" :value="a.id" />
</el-select>
<el-select v-model="t.priority" size="small" style="width:70px">
<el-option v-for="p in ['P0', 'P1', 'P2', 'P3']" :key="p" :value="p" />
</el-select>
<el-date-picker v-model="t.dueDate" size="small" value-format="YYYY-MM-DD" style="width:130px" />
<span>+{{ t.points }}分</span>
</div>
</div>
</div>
</div>
<template #footer>
<el-button @click="publishDialog = false">取消</el-button>
<el-button type="primary" :loading="publishing" @click="confirmPublish">确认发布 {{ selected.length }} 项</el-button>
</template>
</el-dialog>
</div>
</template>

<style scoped>
.step-bar{display:flex;gap:0;margin-bottom:14px;background:#fff;border:1px solid #e2e7ed;padding:0;border-radius:4px;overflow:hidden}
.step{flex:1;display:flex;align-items:center;gap:6px;padding:10px 12px;font-size:14px;color:#8390a1;border-right:1px solid #e2e7ed;position:relative}
.step:last-child{border-right:none}
.step span{width:20px;height:20px;border-radius:50%;background:#dfe5ea;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;flex-shrink:0}
.step.active{color:#087c66;background:#eaf6f2}
.step.active span{background:#087c66}
.step.done span{background:#087c66}
.step.done span::after{content:''}
.smartx-grid{display:grid;grid-template-columns:390px 1fr;gap:14px}
.sx-input,.sx-result{background:#fff;border:1px solid #e2e7ed;padding:18px;min-width:0}
.sx-input header,.sx-result header{margin-bottom:12px}
.sx-result>header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.sx-result>header>div:last-child{display:flex;gap:8px}
.smartx h2{font-size:15px;margin:0 0 4px}
.smartx header p{font-size:14px;color:#8390a1;margin:0}
.sx-input :deep(.el-upload-dragger){padding:17px}
.sx-input :deep(.el-upload-dragger svg){width:26px;color:#087c66}
.file-meta-card{border:1px solid;border-radius:4px;padding:10px;margin:8px 0}
.file-meta-top{display:flex;align-items:center;justify-content:space-between}
.file-type-badge{color:#fff;padding:2px 8px;border-radius:3px;font-size:14px;font-weight:bold}
.file-status{display:flex;align-items:center;gap:4px;font-size:14px}
.file-status.ok{color:#087c66}
.file-status.warn{color:#e1a125}
.file-name{display:flex;align-items:center;gap:5px;font-size:14px;color:#087c66;margin:8px 0}
.file-name svg{width:14px}
.confirm-row{display:flex;justify-content:space-between;align-items:center;padding:9px;background:#fff7e8;margin:8px 0 18px;font-size:14px;flex-wrap:wrap;gap:6px}
.confirm-row.ok{background:#eaf6f2;color:#087c66}
.confirm-actions{display:flex;gap:6px}
.method-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.method-grid :deep(.el-checkbox){height:auto;margin:0;padding:8px;border:1px solid #e5e9ee}
.method-grid b,.method-grid small{display:block}
.method-grid small{font-size:12px;color:#8490a0}
.split-btn{width:100%;margin-top:12px}
.minutes-panel{background:#f8fafc;border:1px solid #e2e7ed;padding:14px;margin:8px 0 18px}
.minutes-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.minutes-header b{font-size:14px;display:block}
.minutes-header small{font-size:14px;color:#8390a1}
.minutes-actions{display:flex;gap:6px}
.minutes-section{margin-bottom:10px}
.minutes-section small{color:#52606d;font-weight:bold;display:block;margin-bottom:4px}
.attendee-tags{display:flex;flex-wrap:wrap;gap:4px}
.agenda-item{border-left:3px solid #087c66;padding:8px 0 8px 12px;margin-bottom:8px}
.agenda-topic{display:flex;align-items:center;gap:8px}
.topic-num{width:20px;height:20px;border-radius:50%;background:#087c66;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:bold;flex-shrink:0}
.agenda-discussion{font-size:15px;color:#69778a;line-height:1.5;margin:4px 0}
.action-items{margin-top:6px}
.action-item{display:flex;align-items:center;gap:6px;font-size:14px;color:#52606d;padding:3px 0}
.action-item small{color:#8390a1}
.minutes-section ul{margin:4px 0;padding-left:20px;font-size:15px;color:#52606d}
.task-cards{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
.task-cards article{display:grid;grid-template-columns:auto 1fr auto;gap:9px;border:1px solid #e3e8ed;padding:12px}
.task-cards article>div>span{font-size:13px;color:#087c66}
.task-cards p,.task-cards small{font-size:14px;color:#69778a;line-height:1.5}
.task-cards small{display:block}
.task-assign{display:flex;align-items:center;gap:6px;margin-top:6px}
.task-assign span{font-size:13px;color:#8390a1}
.mind-map{display:grid;grid-template-columns:180px 1fr;align-items:center;min-height:420px}
.mind-root{background:#087c66;color:#fff;padding:18px;text-align:center;border-radius:6px}
.mind-root small{display:block;margin-top:5px}
.mind-branches{border-left:2px solid #9bcfc1;padding-left:28px}
.mind-branches article{position:relative;margin:10px 0}
.mind-branches i{position:absolute;width:28px;border-top:2px solid #9bcfc1;left:-28px;top:50%}
.mind-branches div{border:1px solid #dce6e3;padding:9px 12px;border-left:4px solid #087c66}
.mind-branches span,.mind-branches small{display:block;font-size:13px;color:#788596;margin-top:4px}
.publish-bar{display:flex;justify-content:space-between;align-items:center;padding:12px;background:#f8fafc;border:1px solid #e2e7ed;margin-top:12px}
.publish-summary{display:flex;gap:14px;font-size:15px;color:#52606d}
.publish-summary b{color:#087c66;font-size:14px}
.desensitize-compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.desensitize-col h4{font-size:16px;margin:0 0 6px}
.desensitized-preview{background:#f8fafc;border:1px solid #e2e7ed;padding:10px;border-radius:4px;font-size:15px;line-height:1.6;min-height:200px;max-height:300px;overflow:auto}
.publish-task-list{display:flex;flex-direction:column;gap:10px;max-height:400px;overflow:auto}
.publish-task-item{display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid #e3e8ed;border-radius:4px}
.publish-task-main{flex:1;min-width:0}
.publish-task-main .el-input{margin-bottom:6px}
.publish-task-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px;color:#8390a1}
@media(max-width:1000px){.smartx-grid{grid-template-columns:1fr}.task-cards{grid-template-columns:1fr}.step-bar{flex-wrap:wrap}.step{flex:1 0 33%}.desensitize-compare{grid-template-columns:1fr}}
@media(max-width:600px){.method-grid{grid-template-columns:1fr}.sx-result>header{display:block}.sx-result>header>div:last-child{margin-top:9px;flex-wrap:wrap}.mind-map{grid-template-columns:1fr}.mind-branches{margin-top:20px}}
</style>
