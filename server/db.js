import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.join(dir, 'data', 'db.json')

const today = new Date().toISOString().slice(0, 10)

const seed = {
  users: [
    { id: 1, username: 'zhangsan', name: '张三', employeeNo: 'PSB-2024-001', phone: '13800138001', password: 'Abc@123456', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '变电运维初级工', mentorId: 3, mentor: '李四', avatar: '张', goal: '掌握220kV变电站一次设备运维技能及事故处理流程' },
    { id: 2, username: 'zhaoliu', name: '赵六', employeeNo: 'PSB-2024-002', phone: '13800138002', password: 'Abc@123456', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '继电保护初级工', mentorId: 3, mentor: '李四', avatar: '赵', goal: '掌握继电保护装置调试、定值整定及故障分析技能' },
    { id: 3, username: 'lisi', name: '李四', employeeNo: 'PSB-2005-088', phone: '13800138003', password: 'Abc@123456', role: 'mentor', roleName: '组长', department: '广州供电局-运维检修部', position: '变电检修高级技师', apprenticeIds: [1, 2], avatar: '李', goal: '培养新员工独立完成一次设备运维及继电保护调试基础工作' }
  ],
  loginAttempts: {},
  resetCodes: {},
  tasks: [
    { id: 101, title: '完成220kV设备巡视记录', description: '按巡视规范完成一次设备检查并上传记录', priority: 'P1', workCategory: 'project', projectName: '220kV变电站运维提升项目', startTime: '09:00', endTime: '10:30', assigneeId: 1, assignee: '张三', creatorId: 3, source: '导师任务', status: 'doing', progress: 65, dueDate: today, standard: '巡视点位完整，异常项附照片', points: 80, method: '四象限法', skillIds: ['OPS-01', 'SAFE-01'], riskPoints: ['设备带电区域保持安全距离', '发现异常不得擅自处置'], evidenceRequired: ['巡视记录', '异常点照片'], createdAt: today },
    { id: 102, title: '安全工器具检查与台账更新', description: '完成班组安全工器具外观检查、有效期核对与台账更新', priority: 'P2', workCategory: 'daily', projectName: '日常工作', startTime: '14:00', endTime: '15:00', assigneeId: 1, assignee: '张三', creatorId: 3, source: '导师任务', status: 'done', progress: 100, dueDate: today, standard: '账物一致，异常项有记录和闭环责任人', points: 60, method: 'PDCA', skillIds: ['SAFE-01', 'DATA-01'], riskPoints: ['检查前确认工器具停用状态'], evidenceRequired: ['检查清单', '更新后台账'], createdAt: today, completedAt: today, mentorComment: '检查细致，台账记录完整。' }
  ],
  skillCatalog: [
    { id: 'SAFE-01', domain: '安全生产', name: '作业风险辨识与控制', description: '识别作业危险点并落实控制措施', targetLevel: 4, critical: true },
    { id: 'OPS-01', domain: '变电运维', name: '一次设备巡视', description: '按标准完成设备巡视、异常识别与记录', targetLevel: 4, critical: true },
    { id: 'OPS-02', domain: '变电运维', name: '倒闸操作与两票执行', description: '规范执行操作票、工作票及复诵监护', targetLevel: 3, critical: true },
    { id: 'RELAY-01', domain: '继电保护', name: '保护装置定值核验', description: '核对定值单、装置参数及版本一致性', targetLevel: 3, critical: true },
    { id: 'DATA-01', domain: '数字化能力', name: '生产记录数字化', description: '形成结构化、可追溯的工作记录和证据', targetLevel: 3, critical: false },
    { id: 'COOP-01', domain: '协同能力', name: '班组沟通与复盘', description: '清晰反馈进展、困难和改进措施', targetLevel: 3, critical: false }
  ],
  competencyAssessments: [
    { id: 801, userId: 1, skillId: 'OPS-01', level: 3, evidenceCount: 4, assessorId: 3, comment: '可在指导下独立完成常规巡视，异常判断仍需加强。', date: today },
    { id: 802, userId: 1, skillId: 'SAFE-01', level: 2, evidenceCount: 3, assessorId: 3, comment: '能识别常见风险，复杂场景控制措施需补充。', date: today },
    { id: 803, userId: 1, skillId: 'DATA-01', level: 3, evidenceCount: 5, assessorId: 3, comment: '记录规范，具备较好的数字化留痕习惯。', date: today },
    { id: 804, userId: 2, skillId: 'RELAY-01', level: 2, evidenceCount: 2, assessorId: 3, comment: '掌握基础核对流程，需要增加现场练习。', date: today },
    { id: 805, userId: 2, skillId: 'SAFE-01', level: 2, evidenceCount: 2, assessorId: 3, comment: '基础风险意识良好。', date: today }
  ],
  safetyCases: [
    { id: 901, skillIds: ['OPS-01', 'SAFE-01'], title: '巡视中发现设备异常声响', scene: '主变巡视', risk: '设备内部故障扩大及人身触电风险', controls: ['保持安全距离并停止靠近', '记录位置、时间和现象', '立即报告值班负责人并按指令处置'], lesson: '异常识别后先隔离风险、再准确报告，禁止凭经验擅自靠近。' },
    { id: 902, skillIds: ['OPS-02', 'SAFE-01'], title: '倒闸操作顺序复核', scene: '停送电操作', risk: '误操作导致设备损坏或人身伤害', controls: ['操作前核对设备双重名称', '严格执行唱票复诵和监护', '关键步骤完成后检查设备状态'], lesson: '任何时间压力都不能替代操作票和监护制度。' },
    { id: 903, skillIds: ['RELAY-01', 'SAFE-01'], title: '保护定值版本不一致', scene: '定值核验', risk: '保护误动或拒动', controls: ['核对审批定值单版本', '双人复核装置区号和校验码', '差异未闭环前禁止投运'], lesson: '定值核验必须形成双人签字和版本证据链。' }
  ],
  weeklyReviews: [
    { id: 1001, userId: 1, mentorId: 3, week: today, achievements: '完成12个巡视点位并闭环1项标识问题。', blockers: '复杂异常现象判断经验不足。', supportNeeded: '希望师傅结合历史案例讲解异常声响判断。', nextFocus: '强化风险辨识与异常报告。', mentorComment: '下周安排一次典型异常案例推演。', status: 'reviewed', createdAt: today }
  ],
  workLogs: [
    { id: 201, userId: 1, date: today, hours: 2.5, content: '完成变电站一次设备巡视，核查12个点位，发现并闭环1项标识问题。', result: '12个点位完成，1项问题闭环', tags: ['巡视', '安全'] },
    { id: 202, userId: 1, date: today, hours: 1.5, content: '学习安全规程第二章，整理作业前风险辨识清单。', result: '形成8项风险清单', tags: ['学习', '安全规程'] }
  ],
  milestones: [
    { id: 301, userId: 1, date: '2026-08-12', title: '第一阶段制度学习完成', description: '考核通过，导师评价：学习态度积极，继续保持。', type: '学习里程碑' },
    { id: 302, userId: 1, date: '2026-08-16', title: '首次独立完成设备巡视', description: '巡视记录规范，无遗漏点位。', type: '实操里程碑' }
  ],
  messages: [
    { id: 401, fromId: 3, toId: 1, from: '李四', content: '今天辛苦了，记得提交培训心得哦。', time: `${today} 09:20` },
    { id: 402, fromId: 1, toId: 3, from: '张三', content: '收到师傅，巡视结束后马上整理。', time: `${today} 09:25` }
  ],
  mentorNotes: [
    { id: 451, mentorId: 3, toId: 1, content: '巡视前先核对风险预控卡，遇到不确定的异常现象先停、再报、后处置。', tone: 'safety', date: today },
    { id: 452, mentorId: 3, toId: 2, content: '定值核验要把版本号和校验码同时留痕，完成后找我做一次双人复核。', tone: 'focus', date: today }
  ],
  taskLikes: [],
  emotions: [{ id: 501, userId: 1, date: today, mood: '开心' }],
  praise: [{ id: 601, from: '李四', toId: 1, content: '主动帮助同事排查问题，表现优秀。', style: '薪火橙', date: today }],
  gratitude: [{ id: 701, from: '张三', to: '李四', content: '感谢师傅耐心讲解设备巡视的风险点。', date: today }],
  careActions: [],
  moduleConfig: {},
  drafts: []
}

export function initDb() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), 'utf8')
  else {
    const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    let changed = false
    db.tasks.forEach((task, index) => {
      const taskText = `${task.source}${task.title}${task.projectName}`
      if (/会议|晨会|例会/.test(taskText) && task.workCategory !== 'meeting') { task.workCategory = 'meeting'; changed = true }
      if (task.workCategory === 'meeting' && (!task.projectName || task.projectName === '日常工作')) { task.projectName = '会议行动项'; changed = true }
      if (!/会议|晨会|例会/.test(taskText) && /项目|专项|改造|建设|220kV/.test(taskText) && task.workCategory === 'daily') { task.workCategory = 'project'; if (!task.projectName || task.projectName === '日常工作') task.projectName = '专项项目任务'; changed = true }
      if (!task.workCategory) { task.workCategory = /项目|专项|改造|建设/.test(`${task.source}${task.title}`) ? 'project' : 'daily'; changed = true }
      if (!task.projectName) { task.projectName = task.workCategory === 'project' ? '综合业务项目' : '日常工作'; changed = true }
      if (!task.startTime) { const hour = 8 + (index % 8); task.startTime = `${String(hour).padStart(2, '0')}:30`; task.endTime = `${String(hour + 1).padStart(2, '0')}:30`; changed = true }
    })
    if (!db.gratitude) { db.gratitude = seed.gratitude; changed = true }
    if (!db.careActions) { db.careActions = []; changed = true }
    if (!db.resetCodes) { db.resetCodes = {}; changed = true }
    const seedUserMap = { 1: '13800138001', 2: '13800138002', 3: '13800138003' }
    db.users.forEach((u) => { if (!u.phone && seedUserMap[u.id]) { u.phone = seedUserMap[u.id]; changed = true } })
    for (const field of ['skillCatalog', 'competencyAssessments', 'safetyCases', 'weeklyReviews']) {
      if (!db[field]) { db[field] = seed[field]; changed = true }
    }
    for (const field of ['mentorNotes', 'taskLikes']) {
      if (!db[field]) { db[field] = seed[field]; changed = true }
    }
    if (!db.tasks.some(task => task.id === 102)) { db.tasks.push(seed.tasks[1]); changed = true }
    db.tasks.forEach(task => {
      if (!task.skillIds) { task.skillIds = task.workCategory === 'meeting' ? ['COOP-01'] : ['DATA-01']; changed = true }
      if (!task.riskPoints) { task.riskPoints = []; changed = true }
      if (!task.evidenceRequired) { task.evidenceRequired = ['工作记录']; changed = true }
      if (!task.points) { task.points = ({ P1: 80, P2: 50 })[task.priority] || 50; changed = true }
    })
    if (changed) fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8')
  }
}

export function readDb() {
  initDb()
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
}

export function writeDb(db) {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8')
  return db
}

export function resetDb() {
  fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2), 'utf8')
  return seed
}

