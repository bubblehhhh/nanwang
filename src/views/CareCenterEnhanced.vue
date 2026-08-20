<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Bell, ChatDotRound, CoffeeCup, Medal, MostlyCloudy, Timer, CircleCheck, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api, { errorText, unwrap } from '../api'
import { useAuthStore } from '../store'
const auth = useAuthStore()
const care = ref({ messages: [], praise: [], users: [], actions: [], emotion: null })
const dialogVisible = ref(false)
const dialogTab = ref('')
const praiseText = ref('')
const selectedUserId = ref(null)
const focusSeconds = ref(1500)
const focusRunning = ref(false)
const focusStorageKey = computed(() => `xinhuo-focus-${auth.user?.id || 'guest'}`)
let timer = null

const today = new Date().toISOString().slice(0, 10)
const moods = ['开心', '平静', '疲惫', '焦虑', '其他']

const apprentices = computed(() => care.value.users.filter(u => u.role === 'apprentice'))
const counterpart = computed(() => auth.user?.role === 'mentor'
  ? care.value.users.find(u => u.id === Number(selectedUserId.value))
  : care.value.users.find(u => u.id === auth.user?.mentorId))

const messages = computed(() => care.value.messages
  .filter(m => counterpart.value && ((m.fromId === auth.user.id && m.toId === counterpart.value.id) || (m.toId === auth.user.id && m.fromId === counterpart.value.id)))
  .sort((a, b) => String(a.time).localeCompare(String(b.time))))

const receivedPraise = computed(() => care.value.praise.filter(item => item.toId === auth.user?.id).slice().reverse())
const sentPraise = computed(() => care.value.praise.filter(item => item.fromId === auth.user?.id).slice().reverse())
const health = computed(() => care.value.actions.filter(a => a.type === 'health' && a.date === today).at(-1))
const warningDone = computed(() => care.value.actions.some(a => a.type === 'warning-handled' && a.date === today))
const focusText = computed(() => `${String(Math.floor(focusSeconds.value / 60)).padStart(2, '0')}:${String(focusSeconds.value % 60).padStart(2, '0')}`)
const completed = computed(() => [health.value, care.value.emotion, warningDone.value, receivedPraise.value.length].filter(Boolean).length)

const cards = computed(() => [
  { id: 'daily', name: '每日关怀', desc: '今日3项任务，注意天气变化与作业节奏。', icon: MostlyCloudy, state: 'ready', status: '今日提示', action: '查看详情' },
  { id: 'health', name: '健康打卡', desc: health.value ? `已记录：${health.value.value}` : '记录身体状态，为工作安排提供参考。', icon: CoffeeCup, state: health.value ? 'done' : 'pending', status: health.value ? '今日已打卡' : '等待打卡', action: health.value ? '更新状态' : '立即打卡' },
  { id: 'emotion', name: '情绪打卡', desc: care.value.emotion ? `今日感受：${care.value.emotion.mood}` : '用一个词记录此刻状态，每天限一次。', icon: ChatDotRound, state: care.value.emotion ? 'done' : 'pending', status: care.value.emotion ? '今日已完成' : '等待打卡', action: care.value.emotion ? '查看记录' : '开始打卡' },
  { id: 'praise', name: '表扬卡', desc: auth.user?.role === 'mentor' ? `已发送 ${sentPraise.value.length} 条，已收到 ${receivedPraise.value.length} 条。` : `已收到 ${receivedPraise.value.length} 条师傅表扬。`, icon: Medal, state: receivedPraise.value.length ? 'done' : 'ready', status: `${receivedPraise.value.length} 条已收到`, action: '发送表扬' },
  { id: 'focus', name: '番茄专注', desc: focusRunning.value ? `本轮剩余 ${focusText.value}` : '开启25分钟免打扰专注，完成后自动留痕。', icon: Timer, state: focusRunning.value ? 'active' : 'ready', status: focusRunning.value ? '进行中' : '随时可用', action: focusRunning.value ? '暂停专注' : '开始专注' },
  { id: 'warning', name: '关怀提醒', desc: warningDone.value ? '已联系学员并完成今日跟进' : '赵六周报尚未提交，建议了解阻碍。', icon: Bell, state: warningDone.value ? 'done' : 'alert', status: warningDone.value ? '今日已处理' : '1项待处理', action: warningDone.value ? '查看记录' : '立即处理' }
])

function readFocusState() {
  try {
    return JSON.parse(localStorage.getItem(focusStorageKey.value) || 'null')
  } catch {
    return null
  }
}

function persistFocusState() {
  if (!focusStorageKey.value) return
  const payload = focusRunning.value
    ? { running: true, endAt: Date.now() + focusSeconds.value * 1000 }
    : { running: false, remaining: focusSeconds.value }
  localStorage.setItem(focusStorageKey.value, JSON.stringify(payload))
}

function clearFocusTimer() {
  if (timer) clearInterval(timer)
  timer = null
}

async function finishFocus() {
  clearFocusTimer()
  focusRunning.value = false
  focusSeconds.value = 1500
  localStorage.removeItem(focusStorageKey.value)
  await action('focus', '完成25分钟专注', false)
}

function startTicker() {
  clearFocusTimer()
  timer = setInterval(async () => {
    const payload = readFocusState()
    if (!payload?.running || !payload.endAt) {
      clearFocusTimer()
      focusRunning.value = false
      return
    }
    const remaining = Math.max(0, Math.ceil((payload.endAt - Date.now()) / 1000))
    focusSeconds.value = remaining
    if (remaining <= 0) await finishFocus()
  }, 1000)
}

function restoreFocusState() {
  const payload = readFocusState()
  if (!payload) return
  if (payload.running && payload.endAt) {
    const remaining = Math.max(0, Math.ceil((payload.endAt - Date.now()) / 1000))
    if (remaining > 0) {
      focusRunning.value = true
      focusSeconds.value = remaining
      startTicker()
      return
    }
    localStorage.removeItem(focusStorageKey.value)
  } else if (typeof payload.remaining === 'number') {
    focusRunning.value = false
    focusSeconds.value = payload.remaining > 0 ? payload.remaining : 1500
  }
}

async function load() {
  care.value = unwrap(await api.get('/care'))
  if (!selectedUserId.value) selectedUserId.value = auth.user?.role === 'mentor' ? (apprentices.value[0]?.id || 1) : auth.user?.mentorId
  restoreFocusState()
}

async function action(type, value, closeDialog = true) {
  try {
    await api.post('/care/action', { type, value })
    await load()
    ElMessage.success('状态已记录')
    if (closeDialog) dialogVisible.value = false
  } catch (e) {
    ElMessage.error(errorText(e))
  }
}

async function mood(value) {
  try {
    await api.post('/care/emotion', { mood: value })
    await load()
    dialogVisible.value = false
    ElMessage.success('今日情绪已记录')
  } catch (e) {
    ElMessage.warning(errorText(e))
  }
}

async function sendPraise() {
  if (!praiseText.value.trim()) return ElMessage.warning('请填写具体表扬内容')
  if (!counterpart.value) return ElMessage.warning('当前没有可发送的对象')
  await api.post('/care/praise', { toId: counterpart.value.id, content: praiseText.value, style: '薪火橙' })
  praiseText.value = ''
  dialogVisible.value = false
  await load()
  ElMessage.success('表扬卡已发送')
}

async function handleWarning() {
  await action('warning-handled', '已联系学员并记录跟进')
}

function focus() {
  if (focusRunning.value) {
    clearFocusTimer()
    focusRunning.value = false
    persistFocusState()
    return
  }
  focusRunning.value = true
  persistFocusState()
  startTicker()
}

function open(id) {
  if (id === 'focus') focus()
  else {
    dialogTab.value = id
    dialogVisible.value = true
  }
}

onMounted(load)
onBeforeUnmount(() => clearFocusTimer())
</script>

<template>
  <div class="page carex">
    <section class="carex-head">
      <div>
        <p class="eyebrow">CARE & CONNECTION</p>
        <h1>人文关怀</h1>
        <p>关注状态，也关注每一次真实的师徒连接</p>
      </div>
      <div class="today-care">
        <span>今日关怀完成</span>
        <b>{{ completed }} / 4</b>
        <el-progress :percentage="completed * 25" :show-text="false" :stroke-width="7" />
      </div>
    </section>

    <section class="carex-grid">
      <article v-for="item in cards" :key="item.id" :class="`state-${item.state}`">
        <header>
          <span class="carex-icon"><component :is="item.icon" /></span>
          <em><CircleCheck v-if="item.state === 'done'" />{{ item.status }}</em>
        </header>
        <div>
          <h2>{{ item.name }}</h2>
          <p>{{ item.desc }}</p>
        </div>
        <el-button :type="item.state === 'alert' ? 'warning' : item.state === 'done' ? 'success' : 'primary'" :plain="item.state !== 'active'" :icon="item.state === 'done' ? CircleCheck : ArrowRight" @click="open(item.id)">{{ item.action }}</el-button>
      </article>
    </section>

    <section class="care-feedback">
      <section class="feedback-panel">
        <header>
          <div>
            <h2>收到的表扬</h2>
            <p>徒弟端查看师傅原文，师傅端查看来自徒弟或同事的正向反馈</p>
          </div>
        </header>
        <div class="feedback-list">
          <article v-for="item in receivedPraise.slice(0, 4)" :key="`r-${item.id}`">
            <span>收</span>
            <div>
              <b>{{ item.from }} 的表扬卡</b>
              <p>{{ item.content }}</p>
              <small>{{ item.date }}</small>
            </div>
          </article>
          <el-empty v-if="!receivedPraise.length" description="暂未收到表扬卡" :image-size="44" />
        </div>
      </section>

      <section class="feedback-panel">
        <header>
          <div>
            <h2>我发出的表扬</h2>
            <p>发送后会同步显示在接收人页面与成长档案</p>
          </div>
        </header>
        <div class="feedback-list">
          <article v-for="item in sentPraise.slice(0, 4)" :key="`s-${item.id}`">
            <span>发</span>
            <div>
              <b>发送给 {{ item.to }}</b>
              <p>{{ item.content }}</p>
              <small>{{ item.date }}</small>
            </div>
          </article>
          <el-empty v-if="!sentPraise.length" description="暂未发出表扬卡" :image-size="44" />
        </div>
      </section>
    </section>

    <el-dialog v-model="dialogVisible" @closed="dialogTab = ''" :title="({ daily: '每日关怀', health: '健康打卡', emotion: '情绪打卡', praise: '发送表扬卡', warning: '关怀提醒' })[dialogTab]" width="520">
      <div v-if="dialogTab === 'daily'" class="dailyx">
        <b>今日关怀摘要</b>
        <p>3项任务 · 14:00 导师辅导 · 午后注意天气变化</p>
        <el-alert title="高温或降雨时减少连续户外作业，巡视注意防滑和防触电。" type="warning" :closable="false" />
      </div>

      <div v-if="dialogTab === 'health'" class="check-options">
        <div v-if="health" class="current"><CircleCheck /><span>当前状态：<b>{{ health.value }}</b></span></div>
        <button :class="{ selected: health?.value === '状态良好' }" @click="action('health', '状态良好')"><CircleCheck /><b>状态良好</b><small>精力充足，可以正常工作</small></button>
        <button :class="{ selected: health?.value === '需要关注' }" @click="action('health', '需要关注')"><Bell /><b>需要关注</b><small>身体不适，需要适当调整</small></button>
      </div>

      <div v-if="dialogTab === 'emotion'" class="mood-options">
        <div v-if="care.emotion" class="current"><CircleCheck />今日已选择：{{ care.emotion.mood }}</div>
        <button v-for="item in moods" :key="item" :class="{ selected: care.emotion?.mood === item }" :disabled="Boolean(care.emotion)" @click="mood(item)">
          <span>{{ { 开心: '悦', 平静: '静', 疲惫: '倦', 焦虑: '忧', 其他: '…' }[item] }}</span>
          <b>{{ item }}</b>
        </button>
      </div>

      <div v-if="dialogTab === 'praise'">
        <el-input v-model="praiseText" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="具体描述值得肯定的行为和成果" />
        <el-button type="primary" class="dialog-action" @click="sendPraise">发送给 {{ counterpart?.name }}</el-button>
      </div>

      <div v-if="dialogTab === 'warning'">
        <el-alert :title="warningDone ? '今日提醒已处理' : '赵六周报尚未提交'" :type="warningDone ? 'success' : 'warning'" show-icon :closable="false" />
        <p>先了解任务阻碍和当前状态，再共同确认补交时间。</p>
        <el-button v-if="!warningDone" type="warning" @click="handleWarning">标记已联系并处理</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.carex-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:15px}
.carex-head h1{margin:2px 0;font-size:27px}
.carex-head>div>p:last-child{margin:0;color:#738092}
.today-care{width:240px;background:#fff;border:1px solid #e0e7e5;padding:12px 14px}
.today-care span{font-size:14px;color:#788595}
.today-care b{float:right}
.today-care .el-progress{clear:both;padding-top:8px}
.carex-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.carex-grid article{background:#fff;border:1px solid #e1e7eb;border-top:3px solid #94a7a2;padding:16px;min-height:185px;display:flex;flex-direction:column;transition:.2s}
.carex-grid article:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(32,61,55,.09)}
.carex-grid article.state-done{border-top-color:#087c66;background:linear-gradient(180deg,#f4faf8 0,#fff 45%)}
.carex-grid article.state-alert{border-top-color:#d99023;background:linear-gradient(180deg,#fff9ed 0,#fff 45%)}
.carex-grid article.state-active{border-top-color:#3378b8}
.carex-grid header{display:flex;justify-content:space-between;align-items:center}
.carex-icon{display:grid;place-items:center;width:38px;height:38px;background:#edf3f1;color:#087c66;border-radius:50%}
.carex-icon svg{width:20px}
.carex-grid em{display:flex;align-items:center;gap:4px;font-style:normal;font-size:13px;color:#687687;background:#f0f3f5;padding:4px 7px;border-radius:10px}
.carex-grid em svg{width:12px}
.carex-grid h2{font-size:16px;margin:16px 0 6px}
.carex-grid p{font-size:15px;line-height:1.6;color:#687687;margin:0 0 14px}
.carex-grid .el-button{margin-top:auto;width:100%}
.care-feedback{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.feedback-panel{background:#fff;border:1px solid #e1e7eb;padding:18px}
.feedback-panel h2{margin:0 0 4px;font-size:17px}
.feedback-panel p{margin:0;color:#7e8a99;font-size:14px}
.feedback-list{margin-top:12px}
.feedback-list article{display:flex;gap:10px;padding:12px 0;border-top:1px solid #edf0f3}
.feedback-list article:first-child{border-top:0}
.feedback-list span{display:grid;place-items:center;min-width:30px;height:30px;border-radius:50%;background:#fff3dc;color:#b67911;font-size:13px;font-weight:700}
.feedback-list b{display:block;font-size:15px}
.feedback-list p{margin:4px 0;font-size:14px;color:#58677a}
.feedback-list small{color:#8b96a5}
.check-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.check-options .current,.mood-options .current{grid-column:1/-1;display:flex;gap:7px;align-items:center;background:#eaf6f2;color:#087c66;padding:10px}
.check-options .current svg{width:17px}
.check-options button{display:grid;grid-template-columns:24px 1fr;text-align:left;gap:3px;border:1px solid #dfe5e8;background:#fff;padding:14px;cursor:pointer}
.check-options button svg{grid-row:1/3;width:20px;color:#087c66}
.check-options button small{color:#7d8997}
.check-options button.selected{border:2px solid #087c66;background:#f0f8f6}
.mood-options{display:flex;gap:8px;flex-wrap:wrap}
.mood-options button{width:76px;border:1px solid #dfe5e8;background:#fff;padding:10px;cursor:pointer}
.mood-options button span,.mood-options button b{display:block}
.mood-options button span{font-size:20px;color:#087c66}
.mood-options button.selected{border:2px solid #087c66;background:#eaf6f2}
.dialog-action{width:100%;margin-top:12px}
@media(max-width:900px){.carex-grid,.care-feedback{grid-template-columns:1fr 1fr}}
@media(max-width:580px){.carex-grid,.care-feedback{grid-template-columns:1fr}.today-care{display:none}.check-options{grid-template-columns:1fr}}
</style>
