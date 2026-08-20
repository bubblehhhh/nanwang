<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ChatDotRound, Bell, DocumentAdd } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api, { errorText, unwrap } from '../api'
import { useAuthStore } from '../store'

const auth = useAuthStore()
const care = ref({ messages: [], users: [], unreadCount: 0 })
const chatText = ref('')
const selectedUserId = ref(null)
const loading = ref(false)

const apprentices = computed(() => care.value.users.filter(u => u.role === 'apprentice'))
const counterpart = computed(() => auth.user?.role === 'mentor'
  ? care.value.users.find(u => u.id === Number(selectedUserId.value))
  : care.value.users.find(u => u.id === auth.user?.mentorId))

const messages = computed(() => care.value.messages
  .filter(m => counterpart.value && ((m.fromId === auth.user.id && m.toId === counterpart.value.id) || (m.toId === auth.user.id && m.fromId === counterpart.value.id)))
  .sort((a, b) => String(a.createdAt || a.time).localeCompare(String(b.createdAt || b.time))))

const unreadWithCounterpart = computed(() => messages.value.filter(m => m.toId === auth.user?.id && !(m.readBy || []).includes(auth.user?.id)).length)
const taskMessages = computed(() => messages.value.filter(m => m.generatedTasks?.length))

async function load(markRead = true) {
  loading.value = true
  try {
    care.value = unwrap(await api.get('/care'))
    if (!selectedUserId.value) selectedUserId.value = auth.user?.role === 'mentor' ? (apprentices.value[0]?.id || 1) : auth.user?.mentorId
    if (markRead && counterpart.value) await api.post('/care/message/read', { counterpartId: counterpart.value.id })
    if (markRead && counterpart.value) care.value = unwrap(await api.get('/care'))
  } finally {
    loading.value = false
  }
}

async function sendMessage() {
  if (!chatText.value.trim() || !counterpart.value) return
  try {
    const data = unwrap(await api.post('/care/message', { toId: counterpart.value.id, content: chatText.value, detectTasks: true }))
    chatText.value = ''
    await load(false)
    ElMessage.success(data.generatedTasks?.length ? `已发送，并同步生成 ${data.generatedTasks.length} 项任务` : '消息已发送')
  } catch (e) {
    ElMessage.error(errorText(e))
  }
}

watch(selectedUserId, async () => {
  if (selectedUserId.value) await load(true)
})

onMounted(() => load(true))
</script>

<template>
  <div class="page msg-page">
    <div class="page-title">
      <div>
        <p class="eyebrow">MESSAGE CENTER</p>
        <h1>师徒消息中心</h1>
        <p>{{ auth.user?.role === 'mentor' ? '聊天可直接布置任务，系统会自动识别并更新任务中心和日程表。' : '查看师傅消息、接收任务安排，并在这里统一沟通。' }}</p>
      </div>
      <div class="msg-head-side">
        <div class="msg-remind"><Bell /><span>当前未读 {{ care.unreadCount || 0 }}</span></div>
        <el-select v-if="auth.user?.role === 'mentor'" v-model="selectedUserId" style="width: 160px">
          <el-option v-for="u in apprentices" :key="u.id" :label="u.name" :value="u.id" />
        </el-select>
      </div>
    </div>

    <section class="msg-layout">
      <aside class="msg-summary panel">
        <header>
          <h2>会话对象</h2>
          <p>当前聊天与任务同步对象</p>
        </header>
        <div class="msg-person">
          <div class="msg-avatar">{{ counterpart?.avatar || '师' }}</div>
          <div>
            <b>{{ counterpart?.name || '未选择' }}</b>
            <span>{{ counterpart?.position }}</span>
          </div>
        </div>
        <div class="msg-kpis">
          <div><span>对话记录</span><b>{{ messages.length }}</b></div>
          <div><span>待阅读</span><b>{{ unreadWithCounterpart }}</b></div>
        </div>
        <div class="msg-kpis task-kpis">
          <div><span>任务消息</span><b>{{ taskMessages.length }}</b></div>
          <div><span>自动生成任务</span><b>{{ taskMessages.reduce((sum, item) => sum + item.generatedTasks.length, 0) }}</b></div>
        </div>
        <div class="msg-tip">
          <DocumentAdd />
          <p>师傅消息中如果包含“请完成/需要整理/明天/下午3点”等任务信息，会自动生成任务；没有明确时间的任务会进入日程表“额外安排”。</p>
        </div>
      </aside>

      <section class="msg-chat panel">
        <header class="msg-chat-head">
          <div>
            <h2>聊天记录</h2>
            <p>{{ counterpart?.name }} · {{ messages.length }} 条</p>
          </div>
          <el-tag v-if="unreadWithCounterpart" type="danger" effect="light">{{ unreadWithCounterpart }} 条新消息</el-tag>
        </header>

        <div class="msg-history" v-loading="loading">
          <div v-for="m in messages" :key="m.id" class="msg-item" :class="{ mine: m.fromId === auth.user?.id, task: m.generatedTasks?.length }">
            <span class="msg-item-avatar">{{ m.from.slice(0, 1) }}</span>
            <article>
              <div class="msg-meta">
                <b>{{ m.from }}</b>
                <el-tag v-if="m.generatedTasks?.length" type="warning" effect="dark">重点任务消息</el-tag>
              </div>
              <p>{{ m.content }}</p>
              <div v-if="m.generatedTasks?.length" class="msg-task-hints">
                <small v-for="task in m.generatedTasks" :key="task.id">已识别任务：{{ task.title }}{{ task.startTime ? ` · ${task.startTime}` : ' · 额外安排' }}</small>
              </div>
              <small>{{ m.time }}</small>
            </article>
          </div>
          <el-empty v-if="!messages.length" description="暂无对话记录" :image-size="50" />
        </div>

        <div class="msg-quick">
          <button v-for="q in auth.user?.role === 'mentor' ? ['请今天下班前整理巡视记录。', '明天下午3点前完成台账核对。', '需要你本周内提交学习心得。'] : ['收到师傅，我马上处理。', '任务我已看到，稍后在任务中心更新。', '有一个细节想请教师傅。']" :key="q" @click="chatText = q">{{ q }}</button>
        </div>

        <footer class="msg-compose">
          <el-input v-model="chatText" type="textarea" :rows="3" maxlength="300" show-word-limit :placeholder="auth.user?.role === 'mentor' ? '直接输入聊天内容；任务型内容会自动识别为任务并同步到任务列表和日程表。' : '输入回复、汇报或问题...' " @keyup.ctrl.enter="sendMessage" />
          <el-button type="primary" @click="sendMessage">发送</el-button>
        </footer>
      </section>
    </section>
  </div>
</template>

<style scoped>
.msg-head-side{display:flex;align-items:center;gap:12px}
.msg-remind{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff4f4;border:1px solid #ffd0d0;border-radius:6px;color:#bc3131}
.msg-remind svg{width:16px}
.msg-layout{display:grid;grid-template-columns:320px 1fr;gap:16px}
.msg-summary,.msg-chat{padding:18px}
.msg-summary header h2,.msg-chat h2{margin:0 0 4px;font-size:18px}
.msg-summary header p,.msg-chat p{margin:0;color:#7e8a99}
.msg-person{display:flex;align-items:center;gap:12px;margin:18px 0}
.msg-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#e8f0ff;color:#0033a0;font-weight:800}
.msg-person b,.msg-person span{display:block}
.msg-person span{font-size:13px;color:#7e8a99;margin-top:3px}
.msg-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.msg-kpis>div{background:#f7fafc;border:1px solid #e6ebf2;padding:12px}
.task-kpis{margin-top:10px}
.msg-kpis span,.msg-kpis b{display:block}
.msg-kpis span{font-size:13px;color:#7e8a99}
.msg-kpis b{font-size:24px;margin-top:4px}
.msg-tip{display:flex;gap:10px;margin-top:16px;padding:12px;background:#eef6ff;border:1px solid #d8e6ff;border-radius:6px}
.msg-tip svg{width:18px;color:#2f67b2;flex:0 0 18px;margin-top:2px}
.msg-tip p{font-size:13px;line-height:1.7;color:#55657a;margin:0}
.msg-chat-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.msg-history{height:460px;overflow:auto;background:#f7f9fb;border:1px solid #e5eaf0;border-radius:6px;padding:14px}
.msg-item{display:flex;gap:9px;max-width:78%;margin-bottom:14px}
.msg-item.mine{margin-left:auto;flex-direction:row-reverse}
.msg-item.task article{background:#fff9ef;border-color:#f0cc85;box-shadow:0 6px 16px rgba(208,145,31,.12)}
.msg-item.mine.task article{background:#eef6ff;border-color:#c7dcfb}
.msg-item-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#dfe9f8;color:#0033a0;font-weight:700}
.msg-item.mine .msg-item-avatar{background:#e9f4ef;color:#087c66}
.msg-item article{background:#fff;border:1px solid #e1e7ef;border-radius:5px 9px 9px 9px;padding:10px 12px;min-width:0}
.msg-item.mine article{background:#eaf4ff;border-color:#cbdff8;border-radius:9px 5px 9px 9px}
.msg-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}
.msg-item b{font-size:13px;color:#6d7c90}
.msg-item p{margin:5px 0;font-size:15px;line-height:1.6;color:#1d2a3a}
.msg-item small{display:block;color:#8b96a5;font-size:12px;margin-top:4px}
.msg-task-hints{display:grid;gap:4px;margin:6px 0}
.msg-task-hints small{padding:5px 8px;background:#f3f8ec;border-left:3px solid #7faa39;color:#54702a;margin:0}
.msg-quick{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.msg-quick button{border:1px solid #d9e2ef;background:#fff;padding:6px 10px;border-radius:4px;font-size:13px;cursor:pointer}
.msg-compose{display:grid;grid-template-columns:1fr 90px;gap:10px;align-items:end}
@media(max-width:900px){.msg-layout{grid-template-columns:1fr}.msg-history{height:360px}}
@media(max-width:620px){.msg-head-side{align-items:stretch;flex-direction:column}.msg-compose{grid-template-columns:1fr}.msg-compose .el-button{width:100%}.msg-item{max-width:92%}}
</style>
