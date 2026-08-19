<script setup>
import { computed,onMounted,reactive,ref } from 'vue'
import { ElMessage,ElMessageBox } from 'element-plus'
import { Plus,Search,EditPen,CircleCheck,Star } from '@element-plus/icons-vue'
import api,{errorText,unwrap} from '../api'
import { useAuthStore } from '../store'

const auth=useAuthStore();const tasks=ref([]);const users=ref([]);const skills=ref([]);const likes=ref([]);const viewMode=ref('groups');const filter=ref('all');const keyword=ref('');const dialog=ref(false);const progressDialog=ref(false);const active=ref(null);const apprenticeFilter=ref('all');const openPriorities=ref([])
const form=reactive({title:'',description:'',priority:'P1',workCategory:'daily',projectName:'日常工作',startTime:'09:00',endTime:'10:00',assigneeId:1,dueDate:new Date().toISOString().slice(0,10),standard:'',points:60,method:'WBS',source:'导师任务',skillIds:['SAFE-01'],riskText:'',evidenceText:'工作记录'})
const statuses={todo:'待开始',doing:'进行中',verify:'待核销',done:'已完成'}
const groupMeta={meeting:{title:'会议任务',desc:'由会议纪要、会议录音或会议行动项生成',icon:'会'},project:{title:'项目工作',desc:'专项、建设、改造和阶段性项目任务',icon:'项'},daily:{title:'日常工作',desc:'巡检、学习、培训和常规管理事项',icon:'常'}}
const filtered=computed(()=>tasks.value.filter(t=>(filter.value==='all'||t.status===filter.value)&&(!keyword.value||`${t.title}${t.assignee}${t.projectName}`.includes(keyword.value))))
const scopedTasks=computed(()=>filtered.value.filter(t=>auth.user?.role!=='mentor'||apprenticeFilter.value==='all'||t.assigneeId===Number(apprenticeFilter.value)))
const workGroups=computed(()=>['meeting','project','daily'].map(category=>{const list=scopedTasks.value.filter(t=>(/会议/.test(`${t.source}${t.projectName}`)?'meeting':t.workCategory)===category);return{category,...groupMeta[category],tasks:list,priorities:['P0','P1','P2','P3'].map(priority=>({priority,tasks:list.filter(t=>t.priority===priority)})).filter(g=>g.tasks.length)}}).filter(g=>g.tasks.length))
const apprenticeStats=computed(()=>users.value.map(user=>{const list=tasks.value.filter(t=>t.assigneeId===user.id);return{...user,total:list.length,verify:list.filter(t=>t.status==='verify').length,progress:list.length?Math.round(list.reduce((s,t)=>s+t.progress,0)/list.length):0}}))
const kanban=computed(()=>Object.entries(statuses).map(([status,title])=>({status,title,tasks:scopedTasks.value.filter(t=>t.status===status)})))
async function load(){const dashboard=unwrap(await api.get('/dashboard'));tasks.value=unwrap(await api.get('/tasks'));users.value=dashboard.users.filter(u=>u.role==='apprentice');likes.value=dashboard.likes||[];skills.value=unwrap(await api.get('/capabilities',{params:{userId:users.value[0]?.id||1}})).skills}
async function create(){try{form.source=form.workCategory==='meeting'?'会议行动项':'导师任务';const{riskText,evidenceText,...base}=form;const payload={...base,riskPoints:riskText.split(/[；;\n]/).map(v=>v.trim()).filter(Boolean),evidenceRequired:evidenceText.split(/[；;\n]/).map(v=>v.trim()).filter(Boolean)};await api.post('/tasks',payload);ElMessage.success('任务已发布并进入能力证据链');dialog.value=false;load()}catch(e){ElMessage.error(errorText(e))}}
function openTask(task){active.value={...task,note:task.note||''};progressDialog.value=true}
async function saveProgress(){await api.patch(`/tasks/${active.value.id}/progress`,{progress:active.value.progress,note:active.value.note});ElMessage.success('进度已更新');progressDialog.value=false;load()}
async function verify(task,approved){const{value}=await ElMessageBox.prompt(approved?'请输入导师核销意见':'请输入退回原因',approved?'任务核销':'退回修改',{inputValue:approved?'符合完成标准，同意核销。':''});await api.post(`/tasks/${task.id}/verify`,{approved,comment:value});ElMessage.success(approved?'已核销并进入工作库':'已退回学员');load()}
async function like(task){try{const{value}=await ElMessageBox.prompt('说明这项工作做得好的地方，反馈会同步给徒弟。','点赞并奖励积分',{inputValue:'任务完成质量优秀，过程记录完整，继续保持。',confirmButtonText:'点赞并奖励'});await api.post(`/tasks/${task.id}/like`,{comment:value,points:10});ElMessage.success('点赞已反馈给徒弟，并奖励10积分');load()}catch(e){if(e!=='cancel'&&e!=='close')ElMessage.error(errorText(e))}}
const liked=task=>likes.value.some(item=>item.taskId===task.id)
onMounted(load)
</script>

<template>
<div class="page">
<div class="page-title">
<div>
<p class="eyebrow">TASK MANAGEMENT</p>
<h1>任务中心</h1>
<p>先按任务来源分类，再在类内按紧急程度管理</p>
</div>
<el-button v-if="auth.user?.role==='mentor'" type="primary" :icon="Plus" @click="dialog=true">发布任务</el-button>
</div>
<div v-if="auth.user?.role==='mentor'" class="apprentice-overview">
<button v-for="item in apprenticeStats" :key="item.id" :class="{active:Number(apprenticeFilter)===item.id}" @click="apprenticeFilter=String(item.id)">
<div class="student-avatar">{{item.avatar}}</div>
<div class="student-main">
<b>{{item.name}}</b>
<small>{{item.position}}</small>
<el-progress :percentage="item.progress" :stroke-width="6" :show-text="false"/>
</div>
<div class="student-numbers">
<span>
<b>{{item.total}}</b>任务</span>
<span class="verify-count">
<b>{{item.verify}}</b>待核销</span>
</div>
</button>
</div>
<div class="toolbar" :class="{'mentor-toolbar':auth.user?.role==='mentor'}">
<el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索任务、项目或负责人" clearable/>
<el-select v-if="auth.user?.role==='mentor'" v-model="apprenticeFilter">
<el-option label="全部学员" value="all"/>
<el-option v-for="u in users" :key="u.id" :label="u.name" :value="String(u.id)"/>
</el-select>
<el-segmented v-model="filter" :options="[{label:'全部',value:'all'},{label:'待开始',value:'todo'},{label:'进行中',value:'doing'},{label:'待核销',value:'verify'},{label:'已完成',value:'done'}]"/>
<el-segmented v-model="viewMode" :options="[{label:'分组列表',value:'groups'},{label:'状态看板',value:'board'}]"/>
</div>
<div v-if="viewMode==='board'" class="office-kanban">
<section v-for="column in kanban" :key="column.status" :class="column.status"><header><b>{{column.title}}</b><span>{{column.tasks.length}}</span></header><div class="kanban-stack"><article v-for="task in column.tasks" :key="task.id"><div class="kanban-top"><el-tag size="small" :type="task.priority==='P0'?'danger':task.priority==='P1'?'warning':'primary'">{{task.priority}}</el-tag><strong>+{{task.points||50}} 积分</strong></div><h3>{{task.title}}</h3><p>{{task.projectName}} · {{task.assignee}}</p><el-progress :percentage="task.progress" :stroke-width="6"/><footer><small>截止 {{task.dueDate}}</small><div><el-button v-if="auth.user?.role==='mentor'&&task.status==='verify'" text type="success" @click="verify(task,true)">核销</el-button><el-button v-if="auth.user?.role==='mentor'&&task.status==='done'" text :type="liked(task)?'success':'primary'" :icon="Star" :disabled="liked(task)" @click="like(task)">{{liked(task)?'已点赞':'点赞'}}</el-button><el-button v-else-if="auth.user?.role==='apprentice'&&task.status!=='verify'&&task.status!=='done'" text @click="openTask(task)">更新</el-button></div></footer></article></div></section>
</div>
<div v-else class="work-group-list">
<section v-for="work in workGroups" :key="work.category" class="work-group">
<header>
<div class="work-type-icon" :class="work.category">{{work.icon}}</div>
<div>
<b>{{work.title}}</b>
<span>{{work.desc}} · {{work.tasks.length}} 项</span>
</div>
<el-progress :percentage="Math.round(work.tasks.reduce((s,t)=>s+t.progress,0)/work.tasks.length)" :stroke-width="7"/>
</header>
<el-collapse v-model="openPriorities" class="priority-collapse">
<el-collapse-item v-for="group in work.priorities" :key="`${work.category}-${group.priority}`" :name="`${work.category}-${group.priority}`">
<template #title>
<div class="priority-head">
<el-tag :type="group.priority==='P0'?'danger':group.priority==='P1'?'warning':'primary'" effect="dark">{{group.priority}}</el-tag>
<b>{{group.priority==='P0'?'紧急关键':group.priority==='P1'?'重要优先':group.priority==='P2'?'常规执行':'低优先'}}</b>
<span>{{group.tasks.length}} 项</span>
<em v-if="group.tasks.some(t=>t.status==='verify')">{{group.tasks.filter(t=>t.status==='verify').length}} 项待核销</em>
</div>
</template>
<div class="compact-task-list">
<div v-for="task in group.tasks" :key="task.id" class="compact-task-row">
<div class="compact-title">
<b>{{task.title}}</b>
<span>{{task.assignee}} · {{task.startTime||'时间待定'}}-{{task.endTime||''}} · {{task.projectName}} · 截止 {{task.dueDate}} · {{task.status==='done'?'已获得':'完成可得'}} {{task.points||50}} 成长积分</span>
<div class="task-skill-tags"><el-tag v-for="id in task.skillIds||[]" :key="id" size="small" effect="plain">{{skills.find(s=>s.id===id)?.name||id}}</el-tag><span v-if="task.riskPoints?.length" class="risk-count">{{task.riskPoints.length}}项风险预控</span></div>
</div>
<div class="compact-progress">
<el-progress :percentage="task.progress" :stroke-width="7"/>
<small v-if="task.status==='verify'">等待师傅手动核销</small>
</div>
<span class="status" :class="task.status">{{statuses[task.status]}}</span>
<div class="compact-actions">
<template v-if="auth.user?.role==='mentor'&&task.status==='verify'">
<el-button size="small" @click="verify(task,false)">退回</el-button>
<el-button size="small" type="success" :icon="CircleCheck" @click="verify(task,true)">核销</el-button>
</template>
<el-button v-else-if="auth.user?.role==='apprentice'&&task.status!=='done'&&task.status!=='verify'" size="small" type="primary" plain :icon="EditPen" @click="openTask(task)">更新</el-button>
<el-button v-else-if="auth.user?.role==='mentor'&&task.status==='done'" size="small" :type="liked(task)?'success':'primary'" plain :icon="Star" :disabled="liked(task)" @click="like(task)">{{liked(task)?'已点赞':'点赞'}}</el-button>
<el-button v-else text size="small" @click="openTask(task)">详情</el-button>
</div>
</div>
</div>
</el-collapse-item>
</el-collapse>
</section>
</div>
<el-empty v-if="!workGroups.length" description="暂无符合条件的任务"/>
<el-dialog v-model="dialog" title="发布能力培养任务" width="720">
<el-form label-position="top">
<el-form-item label="任务名称">
<el-input v-model="form.title"/>
</el-form-item>
<el-form-item label="任务说明">
<el-input v-model="form.description" type="textarea" :rows="3"/>
</el-form-item>
<div class="form-grid">
<el-form-item label="任务分类">
<el-select v-model="form.workCategory">
<el-option label="会议任务" value="meeting"/>
<el-option label="项目工作" value="project"/>
<el-option label="日常工作" value="daily"/>
</el-select>
</el-form-item>
<el-form-item label="会议/项目/工作名称">
<el-input v-model="form.projectName" placeholder="如：周例会行动项"/>
</el-form-item>
<el-form-item label="优先级">
<el-select v-model="form.priority">
<el-option v-for="p in ['P0','P1','P2','P3']" :key="p" :value="p"/>
</el-select>
</el-form-item>
<el-form-item label="负责人">
<el-select v-model="form.assigneeId">
<el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id"/>
</el-select>
</el-form-item>
<el-form-item label="计划开始">
<el-time-select v-model="form.startTime" start="08:00" step="00:30" end="18:00"/>
</el-form-item>
<el-form-item label="计划结束">
<el-time-select v-model="form.endTime" start="08:30" step="00:30" end="19:00"/>
</el-form-item>
<el-form-item label="截止日期">
<el-date-picker v-model="form.dueDate" value-format="YYYY-MM-DD"/>
</el-form-item>
<el-form-item label="拆解方法">
<el-select v-model="form.method">
<el-option v-for="m in ['四象限法','WBS','KANO','RICE','关键路径法','SMART']" :key="m" :value="m"/>
</el-select>
</el-form-item>
</div>
<el-form-item label="关联岗位技能（必选）"><el-select v-model="form.skillIds" multiple style="width:100%"><el-option v-for="skill in skills" :key="skill.id" :label="`${skill.domain} · ${skill.name}`" :value="skill.id"/></el-select></el-form-item>
<el-form-item label="安全风险点（P0/P1必填，以分号或换行分隔）"><el-input v-model="form.riskText" type="textarea" :rows="2" placeholder="例如：设备带电区域保持安全距离；异常情况立即停止并报告"/></el-form-item>
<el-form-item label="能力证据要求（以分号或换行分隔）"><el-input v-model="form.evidenceText" placeholder="例如：风险预控卡；现场照片；工作记录"/></el-form-item>
<el-form-item label="完成标准">
<el-input v-model="form.standard"/>
</el-form-item>
</el-form>
<template #footer>
<el-button @click="dialog=false">取消</el-button>
<el-button type="primary" @click="create">确认发布</el-button>
</template>
</el-dialog>
<el-dialog v-model="progressDialog" :title="auth.user?.role==='mentor'?'任务详情':'更新任务进度'" width="560">
<template v-if="active">
<h3>{{active.title}}</h3>
<el-slider v-model="active.progress" :step="5" show-input :disabled="auth.user?.role==='mentor'||active.status==='verify'||active.status==='done'"/>
<el-input v-model="active.note" type="textarea" :rows="4" :disabled="auth.user?.role==='mentor'||active.status==='verify'||active.status==='done'" placeholder="说明完成情况、问题或需要的支持"/>
<div class="standard">
<small>完成标准</small>{{active.standard}}</div>
<div v-if="active.riskPoints?.length" class="task-risk-box"><b>执行前安全确认</b><label v-for="risk in active.riskPoints" :key="risk"><el-checkbox/>{{risk}}</label></div>
<div v-if="active.evidenceRequired?.length" class="task-evidence"><b>能力证据</b><el-tag v-for="item in active.evidenceRequired" :key="item" effect="plain">{{item}}</el-tag></div>
</template>
<template #footer>
<el-button @click="progressDialog=false">关闭</el-button>
<el-button v-if="auth.user?.role==='apprentice'&&active?.status!=='verify'&&active?.status!=='done'" type="primary" @click="saveProgress">保存进度</el-button>
</template>
</el-dialog>
</div>
</template>
<style scoped>
.office-kanban{display:grid;grid-template-columns:repeat(4,minmax(210px,1fr));gap:10px;align-items:start;overflow:auto}.office-kanban>section{background:#f4f6f8;border:1px solid #e1e6eb;min-height:420px;padding:10px}.office-kanban>section>header{display:flex;justify-content:space-between;padding:4px 3px 11px}.office-kanban>section>header span{background:#dfe5ea;min-width:22px;text-align:center;border-radius:3px}.kanban-stack{display:flex;flex-direction:column;gap:8px}.kanban-stack article{background:#fff;border:1px solid #e0e5ea;border-top:3px solid #8693a5;padding:11px}.office-kanban .doing article{border-top-color:#2b77c0}.office-kanban .verify article{border-top-color:#e1a125}.office-kanban .done article{border-top-color:#087c66}.kanban-top,article footer{display:flex;justify-content:space-between;align-items:center}.kanban-top strong{font-size:10px;color:#087c66}.kanban-stack h3{font-size:13px;line-height:1.45;margin:9px 0 5px}.kanban-stack p,.kanban-stack small{font-size:10px;color:#7f8b9a}.kanban-stack footer{margin-top:8px}.toolbar{flex-wrap:wrap}.toolbar>.el-segmented:last-child{margin-left:auto}@media(max-width:1000px){.office-kanban{grid-template-columns:repeat(4,240px)}}
</style>

