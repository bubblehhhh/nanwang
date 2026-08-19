import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.join(dir, 'data', 'db.json')

const today = new Date().toISOString().slice(0, 10)

const seed = {
  users: [
    { id: 1, username: 'zhangsan', name: '张三', employeeNo: 'PSB-2024-001', password: 'Abc@123456', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '变电运维初级工', mentorId: 3, mentor: '李四', avatar: '张', goal: '掌握220kV变电站一次设备运维技能及事故处理流程' },
    { id: 2, username: 'zhaoliu', name: '赵六', employeeNo: 'PSB-2024-002', password: 'Abc@123456', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '继电保护初级工', mentorId: 3, mentor: '李四', avatar: '赵', goal: '掌握继电保护装置调试、定值整定及故障分析技能' },
    { id: 3, username: 'lisi', name: '李四', employeeNo: 'PSB-2005-088', password: 'Abc@123456', role: 'mentor', roleName: '组长', department: '广州供电局-运维检修部', position: '变电检修高级技师', apprenticeIds: [1, 2], avatar: '李', goal: '培养新员工独立完成一次设备运维及继电保护调试基础工作' }
  ],
  loginAttempts: {},
  tasks: [
    { id: 101, title: '完成220kV设备巡视记录', description: '按巡视规范完成一次设备检查并上传记录', priority: 'P1', workCategory: 'project', projectName: '220kV变电站运维提升项目', startTime: '09:00', endTime: '10:30', assigneeId: 1, assignee: '张三', creatorId: 3, source: '导师任务', status: 'doing', progress: 65, dueDate: today, standard: '巡视点位完整，异常项附照片', points: 80, method: '四象限法', createdAt: today }
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

