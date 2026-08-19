<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, ChatDotRound, CoffeeCup, Medal, MostlyCloudy, Timer } from '@element-plus/icons-vue'
import api,{errorText,unwrap} from '../api'
import { useAuthStore } from '../store'

const auth=useAuthStore()
const care=ref({messages:[],praise:[],users:[],actions:[],emotion:null})
const detailOpen=ref(false);const detailType=ref('');const praiseOpen=ref(false);const praiseText=ref('');const chatText=ref('');const selectedUserId=ref(null)
const focusSeconds=ref(25*60);const focusRunning=ref(false);let focusTimer=null
const moods=['开心','平静','疲惫','焦虑','其他']
const today=new Date().toISOString().slice(0,10)
const apprentices=computed(()=>care.value.users.filter(u=>u.role==='apprentice'))
const counterpart=computed(()=>auth.user?.role==='mentor'?care.value.users.find(u=>u.id===Number(selectedUserId.value)):care.value.users.find(u=>u.id===auth.user?.mentorId))
const chatMessages=computed(()=>care.value.messages.filter(m=>counterpart.value&&((m.fromId===auth.user.id&&m.toId===counterpart.value.id)||(m.toId===auth.user.id&&m.fromId===counterpart.value.id))).sort((a,b)=>String(a.time).localeCompare(String(b.time))))
const healthAction=computed(()=>care.value.actions.findLast?.(a=>a.type==='health'&&a.date===today)||care.value.actions.filter(a=>a.type==='health'&&a.date===today).at(-1))
const warningHandled=computed(()=>care.value.actions.some(a=>a.type==='warning-handled'&&a.date===today))
const focusText=computed(()=>`${String(Math.floor(focusSeconds.value/60)).padStart(2,'0')}:${String(focusSeconds.value%60).padStart(2,'0')}`)
const moduleCards=computed(()=>[
  {id:'daily',name:'每日关怀',desc:'广州晴，25°C；今日3项任务，请注意午后雷雨。',icon:MostlyCloudy,action:'查看详情'},
  {id:'health',name:'健康打卡',desc:healthAction.value?`今日已打卡：${healthAction.value.value}`:'记录今日健康状态与饮水情况。',icon:CoffeeCup,action:healthAction.value?'重新记录':'立即打卡'},
  {id:'emotion',name:'情绪打卡',desc:care.value.emotion?`今日感受：${care.value.emotion.mood}`:'选择此刻的感受，每天限一次。',icon:ChatDotRound,action:care.value.emotion?'已完成':'开始打卡'},
  {id:'praise',name:'表扬卡',desc:`已有 ${care.value.praise.length} 条正向反馈，及时看见彼此的努力。`,icon:Medal,action:'发送表扬'},
  {id:'focus',name:'番茄专注',desc:focusRunning.value?`专注进行中 ${focusText.value}`:'设定25分钟不被打扰的专注时间。',icon:Timer,action:focusRunning.value?'暂停':'开始专注'},
  {id:'warning',name:'关怀提醒',desc:warningHandled.value?'今日提醒已处理':'赵六周报尚未提交，建议导师及时了解情况。',icon:Bell,action:warningHandled.value?'已处理':'查看处理'}
])

async function load(){care.value=unwrap(await api.get('/care'));if(!selectedUserId.value)selectedUserId.value=auth.user?.role==='mentor'?(apprentices.value[0]?.id||1):auth.user?.mentorId}
async function saveAction(type,value){await api.post('/care/action',{type,value});await load()}
async function health(value){try{await saveAction('health',value);ElMessage.success('健康状态已记录');detailOpen.value=false}catch(e){ElMessage.error(errorText(e))}}
async function mood(value){try{await api.post('/care/emotion',{mood:value});ElMessage.success('感谢你的分享');detailOpen.value=false;await load()}catch(e){ElMessage.warning(errorText(e))}}
async function sendPraise(){if(!praiseText.value.trim())return ElMessage.warning('请填写表扬内容');await api.post('/care/praise',{toId:counterpart.value?.id,content:praiseText.value,style:'薪火橙'});praiseText.value='';praiseOpen.value=false;ElMessage.success('表扬卡已发送');await load()}
async function sendMessage(){if(!chatText.value.trim()||!counterpart.value)return;await api.post('/care/message',{toId:counterpart.value.id,content:chatText.value});chatText.value='';await load()}
async function handleWarning(){await saveAction('warning-handled','已联系学员并记录跟进');ElMessage.success('关怀提醒已标记处理');detailOpen.value=false}
function toggleFocus(){if(focusRunning.value){clearInterval(focusTimer);focusTimer=null;focusRunning.value=false;return}focusRunning.value=true;focusTimer=setInterval(async()=>{focusSeconds.value-=1;if(focusSeconds.value<=0){clearInterval(focusTimer);focusTimer=null;focusRunning.value=false;focusSeconds.value=25*60;await saveAction('focus','完成25分钟专注');ElMessage.success('本次专注已完成')}} ,1000)}
function resetFocus(){clearInterval(focusTimer);focusTimer=null;focusRunning.value=false;focusSeconds.value=25*60}
function openModule(id){if(id==='focus')toggleFocus();else if(id==='praise')praiseOpen.value=true;else{detailType.value=id;detailOpen.value=true}}
function scrollChat(){document.querySelector('.mentor-chat-panel')?.scrollIntoView({behavior:'smooth',block:'start'})}
onMounted(load);onBeforeUnmount(()=>clearInterval(focusTimer))
</script>

<template><div class="page care-page"><section class="care-hero"><div><p class="eyebrow">CARE & CONNECTION</p><h1>人文关怀一体化工作台</h1><p>六项关怀功能均已接入记录与互动，让工作状态和师徒连接都被看见。</p></div><el-button type="primary" :icon="ChatDotRound" @click="scrollChat">师徒对话</el-button></section>
<div class="relation-banner"><div class="relation-avatars"><span>{{auth.user?.avatar}}</span><i></i><span>{{counterpart?.avatar||'师'}}</span></div><div><b>{{auth.user?.role==='mentor'?`当前学员：${counterpart?.name||'请选择'}`:`我的师父：${counterpart?.name||'李四'}`}}</b><p>{{chatMessages.at(-1)?.content||'还没有对话，发送一句问候开始交流。'}}</p></div><el-tag type="success" effect="plain">{{chatMessages.length}} 条对话</el-tag></div>
<section class="care-module-grid"><article v-for="item in moduleCards" :key="item.id" :class="item.id"><div class="care-icon"><el-icon><component :is="item.icon"/></el-icon></div><div><h3>{{item.name}}</h3><p>{{item.desc}}</p></div><el-button text type="primary" @click="openModule(item.id)">{{item.action}}</el-button></article></section>
<section class="panel mentor-chat-panel"><div class="panel-head"><div><h2>师徒对话</h2><p>问候、提醒、感谢和工作问题统一留痕</p></div><el-select v-if="auth.user?.role==='mentor'" v-model="selectedUserId" style="width:130px"><el-option v-for="u in apprentices" :key="u.id" :label="u.name" :value="u.id"/></el-select></div><div class="chat-history"><div v-for="message in chatMessages" :key="message.id" class="chat-message" :class="{mine:message.fromId===auth.user?.id}"><div class="chat-avatar">{{message.from.slice(0,1)}}</div><div><b>{{message.from}}</b><p>{{message.content}}</p><small>{{message.time}}</small></div></div><el-empty v-if="!chatMessages.length" description="暂无对话记录"/></div><div class="quick-replies"><button v-for="text in ['今天辛苦了，注意休息。','任务进展如何？有困难及时沟通。','收到，我会按计划完成。']" :key="text" @click="chatText=text">{{text}}</button></div><div class="chat-compose"><el-input v-model="chatText" type="textarea" :rows="2" maxlength="300" show-word-limit placeholder="输入问候、提醒、感谢或工作问题..." @keyup.ctrl.enter="sendMessage"/><el-button type="primary" @click="sendMessage">发送</el-button></div></section>
<section class="panel care-records"><div class="panel-head"><div><h2>最近的温暖瞬间</h2><p>表扬和认可会同步展示在这里</p></div></div><div class="praise-list"><div class="praise-card" v-for="p in care.praise.slice().reverse().slice(0,4)" :key="p.id"><span>赞</span><div><b>{{p.from}} 的表扬卡</b><p>“{{p.content}}”</p><small>{{p.date}}</small></div></div></div></section>

<el-dialog v-model="detailOpen" :title="({daily:'每日关怀详情',health:'健康打卡',emotion:'情绪打卡',warning:'关怀提醒处理'})[detailType] || '人文关怀'" width="520"><div v-if="detailType==='daily'" class="daily-detail"><div><b>广州 · 晴 25°C</b><span>空气质量良 · 建议短袖，午后注意雷雨</span></div><ul><li>今日任务：完成设备巡视、提交学习心得</li><li>会议安排：14:00 导师辅导</li><li>安全提示：高温作业注意补水，现场执行“两票三制”</li></ul></div><div v-if="detailType==='health'" class="health-options"><button @click="health('状态良好')">状态良好<small>精力充足，可以正常工作</small></button><button @click="health('需要关注')">需要关注<small>身体不适或需要适当调整</small></button></div><div v-if="detailType==='emotion'" class="dialog-moods"><button v-for="item in moods" :key="item" :disabled="Boolean(care.emotion)" @click="mood(item)"><span>{{{开心:'悦',平静:'静',疲惫:'倦',焦虑:'忧',其他:'…'}[item]}}</span>{{item}}</button></div><div v-if="detailType==='warning'" class="warning-detail"><el-alert :title="warningHandled?'提醒已处理':'赵六周报未按时提交'" :type="warningHandled?'success':'warning'" show-icon :closable="false"/><p>建议先了解任务阻碍和当前状态，再共同确认补交时间。处理动作会记录在关怀日志中。</p><el-button v-if="!warningHandled" type="warning" @click="handleWarning">标记已联系并处理</el-button></div></el-dialog>
<el-dialog v-model="praiseOpen" title="发送表扬卡" width="520"><el-form label-position="top"><el-form-item label="接收人"><el-input :model-value="counterpart?.name" disabled/></el-form-item><el-form-item label="表扬内容"><el-input v-model="praiseText" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="具体描述值得肯定的行为和成果"/></el-form-item></el-form><template #footer><el-button @click="praiseOpen=false">取消</el-button><el-button type="primary" @click="sendPraise">发送表扬卡</el-button></template></el-dialog>
<div v-if="focusRunning" class="focus-dock"><el-icon><Timer/></el-icon><div><b>{{focusText}}</b><span>专注进行中</span></div><el-button text @click="toggleFocus">暂停</el-button><el-button text @click="resetFocus">结束</el-button></div>
</div></template>

