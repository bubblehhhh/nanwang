(function () {
  const today = new Date().toISOString().slice(0, 10)
  const users = [
    { id: 1, username: 'zhangsan', name: '张三', employeeNo: 'PSB-2024-001', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '变电运维初级工', mentorId: 3, mentor: '李四', avatar: '张', goal: '掌握220kV变电站一次设备运维技能及事故处理流程' },
    { id: 2, username: 'zhaoliu', name: '赵六', employeeNo: 'PSB-2024-002', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '继电保护初级工', mentorId: 3, mentor: '李四', avatar: '赵', goal: '掌握继电保护装置调试、定值整定及故障分析技能' },
    { id: 3, username: 'lisi', name: '李四', employeeNo: 'PSB-2005-088', role: 'mentor', roleName: '组长', department: '广州供电局-运维检修部', position: '变电检修高级技师', apprenticeIds: [1, 2], avatar: '李', goal: '培养新员工独立完成一次设备运维及继电保护调试基础工作' }
  ]
  const initial = {
    tasks: [{ id: 101, title: '完成220kV设备巡视记录', description: '按巡视规范完成一次设备检查并上传记录', priority: 'P1', workCategory: 'project', projectName: '220kV变电站运维提升项目', startTime: '09:00', endTime: '10:30', assigneeId: 1, assignee: '张三', creatorId: 3, source: '导师任务', status: 'doing', progress: 65, dueDate: today, standard: '巡视点位完整，异常项附照片', points: 80, method: '四象限法', skillIds: ['OPS-01','SAFE-01'], riskPoints: ['设备带电区域保持安全距离','发现异常不得擅自处置'], evidenceRequired: ['巡视记录','异常点照片'], createdAt: today }],
    logs: [{ id: 201, userId: 1, date: today, hours: 2.5, content: '完成变电站一次设备巡视，核查12个点位。', result: '12个点位完成，1项问题闭环', tags: ['巡视', '安全'] }],
    milestones: [{ id: 301, userId: 1, date: today, title: '首次独立完成设备巡视', description: '巡视记录规范，无遗漏点位。', type: '实操里程碑' }],
    messages: [{ id: 401, fromId: 3, toId: 1, from: '李四', content: '今天辛苦了，记得及时整理巡视记录。', time: today + ' 09:20' }, { id: 402, fromId: 1, toId: 3, from: '张三', content: '收到师傅，正在整理。', time: today + ' 09:25' }],
    praise: [{ id: 601, from: '李四', toId: 1, content: '设备巡视认真细致，值得肯定。', style: '薪火橙', date: today }], actions: [], emotions: [],
    skills: [
      { id:'SAFE-01',domain:'安全生产',name:'作业风险辨识与控制',description:'识别作业危险点并落实控制措施',targetLevel:4,critical:true },
      { id:'OPS-01',domain:'变电运维',name:'一次设备巡视',description:'按标准完成设备巡视、异常识别与记录',targetLevel:4,critical:true },
      { id:'OPS-02',domain:'变电运维',name:'倒闸操作与两票执行',description:'规范执行操作票、工作票及复诵监护',targetLevel:3,critical:true },
      { id:'RELAY-01',domain:'继电保护',name:'保护装置定值核验',description:'核对定值单、装置参数及版本一致性',targetLevel:3,critical:true },
      { id:'DATA-01',domain:'数字化能力',name:'生产记录数字化',description:'形成结构化、可追溯的工作记录和证据',targetLevel:3,critical:false },
      { id:'COOP-01',domain:'协同能力',name:'班组沟通与复盘',description:'清晰反馈进展、困难和改进措施',targetLevel:3,critical:false }
    ],
    assessments: [{userId:1,skillId:'OPS-01',level:3,evidenceCount:4,comment:'可在指导下完成常规巡视。'},{userId:1,skillId:'SAFE-01',level:2,evidenceCount:3,comment:'复杂场景需加强。'},{userId:2,skillId:'RELAY-01',level:2,evidenceCount:2,comment:'需要增加现场练习。'}],
    safetyCases: [{id:901,skillIds:['OPS-01','SAFE-01'],title:'巡视中发现设备异常声响',scene:'主变巡视',risk:'设备内部故障扩大及人身触电风险',controls:['保持安全距离并停止靠近','记录位置、时间和现象','立即报告值班负责人'],lesson:'先隔离风险、再准确报告，禁止擅自靠近。'}],
    reviews: [{id:1001,userId:1,week:today,achievements:'完成12个巡视点位并闭环1项问题。',blockers:'复杂异常判断经验不足。',supportNeeded:'需要典型案例讲解。',nextFocus:'强化风险辨识与异常报告。',mentorComment:'下周安排案例推演。',status:'reviewed'}]
  }
  let db
  try { db = JSON.parse(localStorage.getItem('xinhuo_offline_db')) || structuredClone(initial) } catch { db = structuredClone(initial) }
  const save = () => localStorage.setItem('xinhuo_offline_db', JSON.stringify(db))
  const current = () => { try { return JSON.parse(localStorage.getItem('xinhuo_user')) || users[0] } catch { return users[0] } }
  const result = (data, message = '操作成功') => ({ code: 0, message, data, requestId: 'offline-' + Date.now() })
  function route(method, rawUrl, body) {
    const url = String(rawUrl).replace(/^.*\/api/, '/api').split('?')[0]
    if (url === '/api/health') return result({ status: 'ok', aiConfigured: true, offline: true })
    if (url === '/api/auth/login') { const user = users.find(u => [u.username, u.name, u.employeeNo].includes(body.username) && u.role === body.role); return user ? result({ token: 'offline-token', user }, '登录成功') : { status: 401, body: { code: 401, message: '账号或角色不匹配' } } }
    const visible = current().role === 'mentor' ? db.tasks : db.tasks.filter(t => t.assigneeId === current().id)
    if (url === '/api/dashboard') return result({ tasks: visible, stats: { total: visible.length, completed: visible.filter(t => t.status === 'done').length, progress: visible.length ? Math.round(visible.reduce((s, t) => s + t.progress, 0) / visible.length) : 0, due: visible.filter(t => t.dueDate <= today && t.status !== 'done').length }, users, milestones: db.milestones })
    if (url === '/api/tasks' && method === 'GET') return result(visible)
    if (url === '/api/tasks' && method === 'POST') { const u = users.find(x => x.id === Number(body.assigneeId)); const task = { id: Date.now(), ...body, assignee: u?.name || '张三', progress: 0, status: 'todo', createdAt: today }; db.tasks.push(task); save(); return result(task) }
    if (url === '/api/tasks/bulk') { const published = [], duplicates = []; for (const item of body.tasks || []) { if (db.tasks.some(t => t.assigneeId === item.assigneeId && t.title === item.title)) duplicates.push(item); else { const task = { id: Date.now() + published.length, ...item, skillIds:item.skillIds?.length?item.skillIds:['DATA-01','COOP-01'],riskPoints:item.riskPoints?.length?item.riskPoints:['作业前确认安全条件'],evidenceRequired:item.evidenceRequired?.length?item.evidenceRequired:['工作记录','成果佐证'], assignee: '张三', progress: 0, status: 'todo', createdAt: today }; db.tasks.push(task); published.push(task) } } save(); return result({ published, duplicates }) }
    let match = url.match(/^\/api\/tasks\/(\d+)\/progress$/); if (match) { const t = db.tasks.find(x => x.id === Number(match[1])); Object.assign(t, body, { status: body.progress === 100 ? 'verify' : body.progress > 0 ? 'doing' : 'todo' }); save(); return result(t) }
    match = url.match(/^\/api\/tasks\/(\d+)\/verify$/); if (match) { const t = db.tasks.find(x => x.id === Number(match[1])); t.status = body.approved ? 'done' : 'doing'; t.progress = body.approved ? 100 : 90; t.mentorComment = body.comment; save(); return result(t) }
    if (url === '/api/desensitize') return result({ text: String(body.text || '').replace(/1\d{10}/g, '138****0000') })
    if (url === '/api/file/upload') return result({ fileName: '离线示例材料.txt', content: '离线展示模式已读取示例材料。请复核脱敏后进行任务拆解。' })
    if (url === '/api/task/split') { const rows = String(body.text || '').split(/[。；;\n]/).filter(x => x.trim()).slice(0, 6); return result({ tasks: (rows.length ? rows : ['整理材料并确认行动项']).map((x, i) => ({ title: x.trim(), description: '根据源材料生成的离线演示任务', priority: i ? 'P2' : 'P1', dueDate: today, standard: '按时完成并提交可核验成果', method: (body.methods || ['WBS']).join(' + ') })), warning: '离线展示版使用本地规则模拟AI结果' }) }
    if (url === '/api/work-logs' && method === 'GET') return result(db.logs.filter(x => x.userId === current().id || current().role === 'mentor'))
    if (url === '/api/work-logs' && method === 'POST') { db.logs.push({ id: Date.now(), userId: current().id, ...body }); save(); return result(body) }
    match = url.match(/^\/api\/work-logs\/(\d+)$/); if (match && method === 'DELETE') { db.logs = db.logs.filter(x => x.id !== Number(match[1])); save(); return result(true) }
    if (url === '/api/reports/generate') return result({ content: `【${body.type}】\n一、工作完成情况\n完成设备巡视及相关记录整理。\n\n二、工作成效\n任务过程留痕完整，重点事项按计划推进。\n\n三、下一步计划\n持续强化风险辨识和成果复盘。`, warning: '离线展示版使用本地模板生成' })
    if (url === '/api/reports/export' || url === '/api/pdf/merge') return { blob: new Blob([body.content || '离线展示导出文件'], { type: 'application/octet-stream' }) }
    if (url === '/api/growth') return result({ points: 360, rank: '太阳', next: 600, percent: 60, weights: { schedule: 40, meeting: 25, practice: 20, supplement: 15 }, milestones: db.milestones, tasks: visible })
    if (url === '/api/capabilities') { const queryId=Number(String(rawUrl).match(/userId=(\d+)/)?.[1]||current().id); const snapshot=(userId)=>{const person=users.find(u=>u.id===userId);const skills=db.skills.map(skill=>{const a=[...db.assessments].reverse().find(x=>x.userId===userId&&x.skillId===skill.id);const level=a?.level||1;return{...skill,level,levelName:['未接触','观察学习','协助完成','独立完成','能够带教'][level-1],gap:Math.max(0,skill.targetLevel-level),evidenceCount:a?.evidenceCount||0,assessment:a,relatedTaskCount:db.tasks.filter(t=>t.assigneeId===userId&&t.skillIds?.includes(skill.id)).length}});return{user:person,skills,gaps:skills.filter(s=>s.gap>0),readiness:Math.round(skills.reduce((n,s)=>n+Math.min(1,s.level/s.targetLevel),0)/skills.length*100)}};const snap=snapshot(queryId);return result({...snap,heatmap:current().role==='mentor'?users.filter(u=>u.role==='apprentice').map(u=>snapshot(u.id)):[],safetyCases:db.safetyCases,reviews:db.reviews.filter(x=>x.userId===queryId),levelNames:['未接触','观察学习','协助完成','独立完成','能够带教']}) }
    if (url === '/api/training-path/generate') { const personId=Number(body.userId||current().id);const levels={};db.assessments.filter(x=>x.userId===personId).forEach(x=>levels[x.skillId]=x.level);return result({path:db.skills.filter(s=>(levels[s.id]||1)<s.targetLevel).slice(0,4).map((s,i)=>({stage:i+1,skillId:s.id,skillName:s.name,objective:`从L${levels[s.id]||1}提升至L${Math.min(s.targetLevel,(levels[s.id]||1)+1)}`,action:s.critical?'先完成安全案例推演，再在师傅监护下实践':'完成学习、实践和复盘',evidence:['风险预控卡','工作记录','师傅评价'],durationWeeks:2}))}) }
    match=url.match(/^\/api\/capabilities\/(\d+)\/assess$/);if(match){db.assessments.push({userId:Number(match[1]),skillId:body.skillId,level:body.level,evidenceCount:body.evidenceCount,comment:body.comment});save();return result(true)}
    if(url==='/api/weekly-reviews'){const old=db.reviews.find(x=>x.userId===Number(body.userId)&&x.week===body.week);if(old){old.mentorComment=body.mentorComment;old.status='reviewed'}else db.reviews.push({id:Date.now(),userId:current().id,...body,status:'submitted'});save();return result(true)}
    if (url === '/api/care' && method === 'GET') return result({ users, messages: db.messages, praise: db.praise, actions: db.actions, emotion: db.emotions.find(x => x.userId === current().id && x.date === today) || null })
    if (url === '/api/care/message') { const to = users.find(x => x.id === Number(body.toId)); db.messages.push({ id: Date.now(), fromId: current().id, toId: to.id, from: current().name, content: body.content, time: new Date().toLocaleString('zh-CN', { hour12: false }) }); save(); return result(true) }
    if (url === '/api/care/praise') { db.praise.push({ id: Date.now(), from: current().name, toId: body.toId, content: body.content, style: body.style, date: today }); save(); return result(true) }
    if (url === '/api/care/action') { db.actions.push({ id: Date.now(), userId: current().id, type: body.type, value: body.value, date: today }); save(); return result(true) }
    if (url === '/api/care/emotion') { db.emotions.push({ id: Date.now(), userId: current().id, mood: body.mood, date: today }); save(); return result(true) }
    if (url === '/api/admin/reset') { db = structuredClone(initial); save(); return result(true) }
    return { status: 404, body: { code: 404, message: '离线展示版暂不支持该接口' } }
  }
  class OfflineXHR {
    constructor() { this.headers = {}; this.readyState = 0; this.status = 0; this.responseText = ''; this.response = null; this.onloadend = null; this.upload = { addEventListener() {} } }
    open(method, url) { this.method = method.toUpperCase(); this.url = url; this.readyState = 1 }
    setRequestHeader(k, v) { this.headers[k] = v }
    getAllResponseHeaders() { return 'content-type: application/json\r\n' }
    addEventListener(name, fn) { this['on' + name] = fn }
    send(raw) { setTimeout(() => { let body = {}; try { body = typeof raw === 'string' ? JSON.parse(raw) : raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw || {} } catch {} const out = route(this.method, this.url, body); this.status = out.status || 200; this.readyState = 4; if (out.blob) { this.response = out.blob; this.responseText = '' } else { const payload = out.body || out; this.responseText = JSON.stringify(payload); this.response = this.responseType && this.responseType !== 'text' ? new Blob([this.responseText]) : this.responseText } if (this.onreadystatechange) this.onreadystatechange(); if (this.onload) this.onload(); if (this.onloadend) this.onloadend() }, 40) }
    abort() {}
  }
  window.XMLHttpRequest = OfflineXHR
})()

