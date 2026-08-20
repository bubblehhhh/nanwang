(function () {
  const today = new Date().toISOString().slice(0, 10)
  const users = [
    { id: 1, username: 'zhangsan', name: '张三', employeeNo: 'PSB-2024-001', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '变电运维初级工', mentorId: 3, mentor: '李四', avatar: '张', goal: '掌握220kV变电站一次设备运维技能及事故处理流程' },
    { id: 2, username: 'zhaoliu', name: '赵六', employeeNo: 'PSB-2024-002', role: 'apprentice', roleName: '组员', department: '广州供电局-运维检修部', position: '继电保护初级工', mentorId: 3, mentor: '李四', avatar: '赵', goal: '掌握继电保护装置调试、定值整定及故障分析技能' },
    { id: 3, username: 'lisi', name: '李四', employeeNo: 'PSB-2005-088', role: 'mentor', roleName: '组长', department: '广州供电局-运维检修部', position: '变电检修高级技师', apprenticeIds: [1, 2], avatar: '李', goal: '培养新员工独立完成一次设备运维及继电保护调试基础工作' }
  ]
  const initial = {
    tasks: [{ id: 101, title: '完成220kV设备巡视记录', description: '按巡视规范完成一次设备检查并上传记录', priority: 'P1', workCategory: 'project', projectName: '220kV变电站运维提升项目', startTime: '09:00', endTime: '10:30', assigneeId: 1, assignee: '张三', creatorId: 3, source: '导师任务', status: 'doing', progress: 65, dueDate: today, standard: '巡视点位完整，异常项附照片', points: 80, method: '四象限法', skillIds: ['OPS-01','SAFE-01'], riskPoints: ['设备带电区域保持安全距离','发现异常不得擅自处置'], evidenceRequired: ['巡视记录','异常点照片'], createdAt: today },{ id:102,title:'安全工器具检查与台账更新',description:'完成外观检查、有效期核对与台账更新',priority:'P2',workCategory:'daily',projectName:'日常工作',startTime:'14:00',endTime:'15:00',assigneeId:1,assignee:'张三',creatorId:3,source:'导师任务',status:'done',progress:100,dueDate:today,standard:'账物一致并留痕',points:60,method:'PDCA',skillIds:['SAFE-01','DATA-01'],riskPoints:['检查前确认停用状态'],evidenceRequired:['检查清单'],createdAt:today,completedAt:today}],
    logs: [],
    milestones: [{ id: 301, userId: 1, date: today, title: '首次独立完成设备巡视', description: '巡视记录规范，无遗漏点位。', type: '实操里程碑' }],
    messages: [{ id: 401, fromId: 3, toId: 1, from: '李四', content: '今天辛苦了，记得及时整理巡视记录。', time: today + ' 09:20' }, { id: 402, fromId: 1, toId: 3, from: '张三', content: '收到师傅，正在整理。', time: today + ' 09:25' }],
    praise: [{ id: 601, from: '李四', toId: 1, content: '设备巡视认真细致，值得肯定。', style: '薪火橙', date: today }], notes:[{id:451,mentorId:3,toId:1,content:'巡视前先核对风险预控卡，遇到异常先停、再报、后处置。',tone:'safety',date:today}],likes:[], actions: [], emotions: [],
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
  db.notes ||= structuredClone(initial.notes); db.likes ||= []; if (!db.tasks.some(task => task.id === 102)) db.tasks.push(structuredClone(initial.tasks[1]))
  const save = () => localStorage.setItem('xinhuo_offline_db', JSON.stringify(db))
  const current = () => { try { return JSON.parse(localStorage.getItem('xinhuo_user')) || users[0] } catch { return users[0] } }
  const result = (data, message = '操作成功') => ({ code: 0, message, data, requestId: 'offline-' + Date.now() })
  const decoder = new TextDecoder('utf-8')
  async function readTextFile(file) {
    return await file.text()
  }
  async function inflateBytes(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持离线解压该文件类型')
    const ds = new DecompressionStream('deflate-raw')
    const stream = new Blob([bytes]).stream().pipeThrough(ds)
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  async function unzipEntries(file) {
    const data = new Uint8Array(await file.arrayBuffer())
    const view = new DataView(data.buffer)
    const entries = new Map()
    let offset = 0
    while (offset + 30 <= data.length) {
      if (view.getUint32(offset, true) !== 0x04034b50) break
      const compression = view.getUint16(offset + 8, true)
      const compressedSize = view.getUint32(offset + 18, true)
      const fileNameLength = view.getUint16(offset + 26, true)
      const extraLength = view.getUint16(offset + 28, true)
      const fileName = decoder.decode(data.slice(offset + 30, offset + 30 + fileNameLength))
      const dataStart = offset + 30 + fileNameLength + extraLength
      const dataEnd = dataStart + compressedSize
      const chunk = data.slice(dataStart, dataEnd)
      let content = null
      if (compression === 0) content = chunk
      else if (compression === 8) content = await inflateBytes(chunk)
      if (content) entries.set(fileName, decoder.decode(content))
      offset = dataEnd
    }
    return entries
  }
  function xmlPlainText(xml) {
    return String(xml || '')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#10;/g, '\n')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  const pointByPriority = { P1: 80, P2: 50 }
  const aiKey = () => String(window.__XINHUO_OFFLINE_AI_KEY__ || localStorage.getItem('xinhuo_offline_ai_key') || '').trim()
  function detectSource(text = '') {
    if (/会议|例会|晨会|议题|参会|纪要|主持|发言/.test(text)) return { sourceType: 'meeting', sourceConfidence: 92, sourceReason: '识别到会议语义和行动项表达' }
    if (/项目|专项|改造|建设|里程碑|交付|验收/.test(text)) return { sourceType: 'project', sourceConfidence: 88, sourceReason: '识别到项目目标、交付或里程碑语义' }
    return { sourceType: 'daily', sourceConfidence: 76, sourceReason: '内容更符合日常工作或临时事项特征' }
  }
  function fallbackTasks(text) {
    const sentences = String(text || '').split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 6)
    const items = sentences.length ? [...sentences] : ['核对输入内容并形成执行清单']
    const defaults = ['确认任务范围、责任人与完成标准', '执行任务并记录关键过程和异常', '复核成果、反馈结果并完成归档']
    while (items.length < 3) items.push(defaults[items.length])
    return items.map((item, index) => ({
      title: item.length > 24 ? `${item.slice(0, 24)}…` : item,
      description: item,
      priority: index === 0 ? 'P1' : 'P2',
      dueDate: new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10),
      standard: '结果可核验、过程有记录、异常有说明',
      method: '四象限法',
      points: index === 0 ? 80 : 50
    }))
  }
  async function askDeepSeek(system, prompt, json = false) {
    const key = aiKey()
    if (!key) throw new Error('未配置 DeepSeek API 密钥')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45000)
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          temperature: 0.25,
          response_format: json ? { type: 'json_object' } : undefined,
          messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }]
        }),
        signal: controller.signal
      })
      if (!response.ok) {
        const reasons = { 401: 'DeepSeek 密钥无效或已失效', 402: 'DeepSeek 账户额度不足', 429: 'DeepSeek 请求频率超限', 500: 'DeepSeek 服务暂时异常', 503: 'DeepSeek 服务繁忙' }
        throw new Error(reasons[response.status] || `DeepSeek 服务返回 ${response.status}`)
      }
      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    } finally {
      clearTimeout(timer)
    }
  }
  async function splitWithAI(text, methods = ['WBS']) {
    try {
      const selectedMethods = methods.length ? methods.join('、') : 'WBS'
      const content = await askDeepSeek(
        `你是供电局任务管理助手。先把材料来源识别为meeting、project或daily，再拆分用户提供的工作内容，不编造人员或制度。使用用户选择的方法：${selectedMethods}。输出JSON对象，包含sourceType、sourceConfidence(0-100)、sourceReason和tasks。tasks为3到10个任务，每项包含title、description、priority(P1或P2，P1为重要优先、P2为常规执行)、dueDate(YYYY-MM-DD)、standard、method、points；method必须说明实际采用的方法，points按任务难度建议50到80积分。`,
        `科学拆解方法：${selectedMethods}\n待拆解内容：\n${text}`,
        true
      )
      const parsed = JSON.parse(content)
      const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.slice(0, 10) : []
      while (tasks.length < 3) {
        tasks.push({
          title: tasks.length === 0 ? '确认任务范围与完成标准' : tasks.length === 1 ? '执行任务并记录过程' : '复核成果并完成归档',
          description: tasks.length === 0 ? '核对任务目标、负责人、期限及验收口径。' : tasks.length === 1 ? '按确认后的步骤执行，记录关键数据与异常。' : '依据完成标准检查结果，提交导师复核并归档。',
          priority: tasks.length === 0 ? 'P1' : 'P2',
          dueDate: new Date(Date.now() + (tasks.length + 1) * 86400000).toISOString().slice(0, 10),
          standard: '信息完整、结果可核验、过程有留痕',
          method: 'WBS',
          points: tasks.length === 0 ? 80 : 50
        })
      }
      const normalized = tasks.map((task, index) => ({
        title: task.title || `任务步骤${index + 1}`,
        description: task.description || task.title || '按要求完成任务步骤',
        priority: ['P1', 'P2'].includes(task.priority) ? task.priority : 'P2',
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || '') ? task.dueDate : new Date(Date.now() + (index + 1) * 86400000).toISOString().slice(0, 10),
        standard: task.standard || '结果可核验、过程有记录、异常有说明',
        method: task.method || 'WBS',
        points: Number(task.points) || pointByPriority[task.priority] || 50
      }))
      const detected = detectSource(text)
      const sourceType = ['meeting', 'project', 'daily'].includes(parsed.sourceType) ? parsed.sourceType : detected.sourceType
      return { tasks: normalized, ai: true, sourceType, sourceConfidence: Number(parsed.sourceConfidence) || detected.sourceConfidence, sourceReason: parsed.sourceReason || detected.sourceReason }
    } catch (error) {
      return { tasks: fallbackTasks(text), ai: false, ...detectSource(text), warning: `AI暂不可用，已采用规则拆分：${error.message}` }
    }
  }
  async function generateMeetingMinutesWithAI(text) {
    try {
      const content = await askDeepSeek(
        '你是供电局会议纪要助手。根据用户提供的会议材料或录音转录文本，生成结构化会议纪要。输出JSON对象，包含：title、date（YYYY-MM-DD）、location、attendees（数组）、agenda（数组，每项含topic、discussion、actionItems[action,owner,dueDate]）、decisions（数组）、nextMeeting。严格基于输入文本，不编造人员或制度。',
        `请根据以下内容生成结构化会议纪要：\n${text}`,
        true
      )
      const parsed = JSON.parse(content)
      return {
        minutes: {
          title: parsed.title || '工作会议',
          date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().slice(0, 10),
          location: parsed.location || '',
          attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
          agenda: Array.isArray(parsed.agenda) ? parsed.agenda.map((item) => ({
            topic: item.topic || '议题',
            discussion: item.discussion || '',
            actionItems: Array.isArray(item.actionItems) ? item.actionItems.map((a) => ({
              task: a.task || a.action || '',
              owner: a.owner || '',
              dueDate: /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate || '') ? a.dueDate : ''
            })) : []
          })) : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          nextMeeting: parsed.nextMeeting || ''
        },
        ai: true
      }
    } catch (error) {
      return {
        minutes: {
          title: '工作会议',
          date: new Date().toISOString().slice(0, 10),
          location: '',
          attendees: [],
          agenda: [{ topic: '会议内容', discussion: String(text || '').slice(0, 800), actionItems: [] }],
          decisions: [],
          nextMeeting: '',
          rawText: text
        },
        ai: false,
        warning: `AI暂不可用，已生成基础纪要框架：${error.message}`
      }
    }
  }
  async function generateReportWithAI(logs, type) {
    const source = logs.map((l) => `${l.date}｜${l.hours}小时｜${l.content}｜成果：${l.result}`).join('\n')
    try {
      const content = await askDeepSeek('你是供电局员工工作材料助手。只基于输入事实生成中文材料，保留量化成果，不虚构数据。使用清晰的Markdown结构。', `生成${type}：\n${source}`)
      return { content, ai: true }
    } catch (error) {
      const total = logs.reduce((sum, l) => sum + Number(l.hours || 0), 0)
      return {
        content: `# ${type}\n\n## 工作概况\n本周期共记录 ${logs.length} 项工作，投入 ${total} 小时。\n\n## 主要成果\n${logs.map((l) => `- ${l.content} 成果：${l.result}`).join('\n')}\n\n## 后续计划\n- 持续跟踪未闭环事项，按标准完成复核。`,
        ai: false,
        warning: `AI暂不可用，已采用规则生成：${error.message}`
      }
    }
  }
  function columnLetters(index) {
    let value = ''
    let current = index + 1
    while (current > 0) {
      const mod = (current - 1) % 26
      value = String.fromCharCode(65 + mod) + value
      current = Math.floor((current - 1) / 26)
    }
    return value
  }
  function parseSheetRows(sheetXml, sharedStrings) {
    const rows = [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)]
    return rows.map(([, rowXml]) => {
      const cells = [...rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)]
      const values = []
      cells.forEach(([, attrs, cellXml], cellIndex) => {
        const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1]
        const expectedIndex = ref ? ref.split('').reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1 : cellIndex
        while (values.length < expectedIndex) values.push('')
        const type = /t="([^"]+)"/.exec(attrs)?.[1]
        let value = /<v[^>]*>([\s\S]*?)<\/v>/.exec(cellXml)?.[1] || /<t[^>]*>([\s\S]*?)<\/t>/.exec(cellXml)?.[1] || ''
        if (type === 's') value = sharedStrings[Number(value)] || ''
        value = value.replace(/<[^>]+>/g, '').trim()
        values.push(value)
      })
      return values
    }).filter((row) => row.some(Boolean))
  }
  async function parseDocxFile(file) {
    const entries = await unzipEntries(file)
    const documentXml = entries.get('word/document.xml')
    if (!documentXml) throw new Error('未找到 Word 正文内容')
    return xmlPlainText(documentXml)
  }
  async function parseXlsxFile(file) {
    const entries = await unzipEntries(file)
    const workbookXml = entries.get('xl/workbook.xml')
    if (!workbookXml) throw new Error('未找到工作簿内容')
    const relsXml = entries.get('xl/_rels/workbook.xml.rels') || ''
    const sharedStringsXml = entries.get('xl/sharedStrings.xml') || ''
    const sharedStrings = [...sharedStringsXml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => xmlPlainText(match[0]))
    const relMap = Object.fromEntries([...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)].map(([, id, target]) => [id, target]))
    const sheetDefs = [...workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(([, name, relId]) => ({ name, target: relMap[relId] }))
    const output = []
    sheetDefs.forEach(({ name, target }) => {
      const normalized = target ? `xl/${target.replace(/^\.\//, '').replace(/^\/+/, '')}` : ''
      const sheetXml = entries.get(normalized)
      if (!sheetXml) return
      const rows = parseSheetRows(sheetXml, sharedStrings)
      output.push(`【${name}】`)
      rows.forEach((row) => output.push(row.map((cell, index) => `${columnLetters(index)}:${cell}`).join(' | ')))
    })
    return output.join('\n').trim()
  }
  async function extractOfflineFile(file) {
    const name = String(file?.name || '')
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
    if (['.txt', '.csv', '.md', '.json'].includes(ext)) return { fileName: name, content: await readTextFile(file) }
    if (ext === '.docx') return { fileName: name, content: await parseDocxFile(file) }
    if (ext === '.xlsx') return { fileName: name, content: await parseXlsxFile(file) }
    if (['.doc', '.xls', '.pdf', '.png', '.jpg', '.jpeg', '.bmp', '.mp3', '.wav', '.m4a', '.aac'].includes(ext)) {
      return { fileName: name, content: `当前离线版暂不支持直接解析 ${ext} 文件，请在在线版中处理，或先转换为 TXT、DOCX、XLSX、CSV 后再导入。` }
    }
    return { fileName: name || '未命名文件', content: '无法识别该文件格式，请改用 TXT、DOCX、XLSX 或 CSV。' }
  }
  async function route(method, rawUrl, body) {
    const url = String(rawUrl).replace(/^.*\/api/, '/api').split('?')[0]
    if (url === '/api/health') return result({ status: 'ok', aiConfigured: Boolean(aiKey()), offline: true })
    if (url === '/api/auth/login') { const user = users.find(u => [u.username, u.name, u.employeeNo].includes(body.username) && u.role === body.role); return user ? result({ token: 'offline-token', user }, '登录成功') : { status: 401, body: { code: 401, message: '账号或角色不匹配' } } }
    const visible = current().role === 'mentor' ? db.tasks : db.tasks.filter(t => t.assigneeId === current().id)
    if (url === '/api/dashboard') { const calendarStart=new Date();calendarStart.setHours(12,0,0,0);calendarStart.setDate(calendarStart.getDate()-((calendarStart.getDay()+6)%7)-14);const workload=Array.from({length:35},(_,i)=>{const d=new Date(calendarStart.getTime()+i*86400000).toISOString().slice(0,10),list=visible.filter(t=>t.dueDate===d||t.createdAt===d||t.completedAt===d),score=list.reduce((s,t)=>s+({P1:3,P2:2}[t.priority]||1),0);return{date:d,taskCount:list.length,workload:score,level:Math.min(4,Math.ceil(score/2))}}),likePoints=db.likes.reduce((s,x)=>s+x.points,0),weeklyPoints=visible.filter(t=>t.status==='done').reduce((s,t)=>s+(t.points||50),0)+likePoints,pendingPoints=visible.filter(t=>t.status!=='done').reduce((s,t)=>s+Math.max(0,(t.points||50)-Math.round((t.points||50)*t.progress/100)),0);return result({ tasks: visible, stats: { total: visible.length, completed: visible.filter(t => t.status === 'done').length, progress: visible.length ? Math.round(visible.reduce((s, t) => s + t.progress, 0) / visible.length) : 0, due: visible.filter(t => t.dueDate <= today && t.status !== 'done').length,points:visible.reduce((s,t)=>s+Math.round((t.points||50)*t.progress/100),0)+likePoints,weeklyPoints,pendingPoints,likes:db.likes.length },workload,notes:db.notes.filter(n=>current().role==='mentor'||n.toId===current().id),likes:db.likes, users, milestones: db.milestones }) }
    if (url === '/api/weather/hourly') { const base=new Date();base.setMinutes(0,0,0);const hourly=Array.from({length:12},(_,i)=>({time:new Date(base.getTime()+i*3600000).toISOString(),temperature:27+Math.round(Math.sin(i/3)*3),rain:[20,20,30,45,60,50,35,25,20,15,15,20][i],code:i>2&&i<7?61:3}));return result({city:'广州',current:{temperature_2m:hourly[0].temperature,weather_code:hourly[0].code},hourly,live:false}) }
    if (url === '/api/tasks' && method === 'GET') return result(visible)
    if (url === '/api/tasks' && method === 'POST') { const u = users.find(x => x.id === Number(body.assigneeId)); const task = { id: Date.now(), ...body, assignee: u?.name || '张三', progress: 0, status: 'todo', createdAt: today }; db.tasks.push(task); save(); return result(task) }
    if (url === '/api/tasks/bulk') { const published = [], duplicates = []; for (const item of body.tasks || []) { if (db.tasks.some(t => t.assigneeId === item.assigneeId && t.title === item.title)) duplicates.push(item); else { const task = { id: Date.now() + published.length, ...item, skillIds:item.skillIds?.length?item.skillIds:['DATA-01','COOP-01'],riskPoints:item.riskPoints?.length?item.riskPoints:['作业前确认安全条件'],evidenceRequired:item.evidenceRequired?.length?item.evidenceRequired:['工作记录','成果佐证'], assignee: '张三', progress: 0, status: 'todo', createdAt: today }; db.tasks.push(task); published.push(task) } } save(); return result({ published, duplicates }) }
    let match = url.match(/^\/api\/tasks\/(\d+)\/progress$/); if (match) { const t = db.tasks.find(x => x.id === Number(match[1])); Object.assign(t, body, { status: body.progress === 100 ? 'verify' : body.progress > 0 ? 'doing' : 'todo' }); save(); return result(t) }
    match = url.match(/^\/api\/tasks\/(\d+)\/verify$/); if (match) { const t = db.tasks.find(x => x.id === Number(match[1])); t.status = body.approved ? 'done' : 'doing'; t.progress = body.approved ? 100 : 90; t.mentorComment = body.comment; save(); return result(t) }
    match = url.match(/^\/api\/tasks\/(\d+)\/like$/); if (match) { const t=db.tasks.find(x=>x.id===Number(match[1]));if(db.likes.some(x=>x.taskId===t.id))return{status:409,body:{code:409,message:'该任务已经点赞'}};const like={id:Date.now(),taskId:t.id,taskTitle:t.title,fromId:3,from:'李四',toId:t.assigneeId,comment:body.comment,points:body.points||10,date:today};db.likes.push(like);save();return result(like) }
    if (url === '/api/desensitize') return result({ text: String(body.text || '').replace(/1\d{10}/g, '138****0000') })
    if (url === '/api/file/upload') return result(await extractOfflineFile(body.file))
    if (url === '/api/task/split') return result(await splitWithAI(String(body.text || ''), body.methods || ['WBS']))
    if (url === '/api/meeting-minutes/generate') return result(await generateMeetingMinutesWithAI(String(body.text || '')))
    if (url === '/api/meeting-minutes/save') {
      const item = { id: Date.now(), ...(body.minutes || {}), savedAt: new Date().toISOString() }
      db.meetingMinutes ||= []
      db.meetingMinutes.unshift(item)
      save()
      return result(item, '会议纪要已保存')
    }
    if (url === '/api/meeting-minutes') return result((db.meetingMinutes || []).slice())
    if (url === '/api/meeting-minutes/export') {
      const minutes = body.minutes || {}
      const text = [
        `会议名称：${minutes.title || '工作会议'}`,
        `会议日期：${minutes.date || today}`,
        `会议地点：${minutes.location || ''}`,
        `参会人员：${Array.isArray(minutes.attendees) ? minutes.attendees.join('、') : ''}`,
        '',
        ...(Array.isArray(minutes.agenda) ? minutes.agenda.flatMap((item, index) => [
          `${index + 1}. ${item.topic || '议题'}`,
          `${item.discussion || ''}`,
          ...(Array.isArray(item.actionItems) ? item.actionItems.map((action) => `- ${action.task || ''}｜责任人：${action.owner || '待定'}｜期限：${action.dueDate || '待定'}`) : []),
          ''
        ]) : []),
        '决议事项：',
        ...(Array.isArray(minutes.decisions) ? minutes.decisions.map((d) => `- ${d}`) : []),
        '',
        `下次会议：${minutes.nextMeeting || ''}`
      ].join('\n').trim()
      return { blob: new Blob([text], { type: body.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) }
    }
    if (url === '/api/work-logs' && method === 'GET') return result(db.logs.filter(x => x.userId === current().id || current().role === 'mentor'))
    if (url === '/api/work-logs' && method === 'POST') { db.logs.push({ id: Date.now(), userId: current().id, ...body }); save(); return result(body) }
    match = url.match(/^\/api\/work-logs\/(\d+)$/); if (match && method === 'DELETE') { db.logs = db.logs.filter(x => x.id !== Number(match[1])); save(); return result(true) }
    if (url === '/api/reports/generate') {
      const logs = db.logs.filter(x => x.userId === current().id || current().role === 'mentor')
      const facts = [...logs, ...visible.map((task) => ({
        date: task.completedAt || task.dueDate || today,
        hours: task.startTime && task.endTime ? Math.max(0.5, Number(task.endTime.slice(0, 2)) - Number(task.startTime.slice(0, 2))) : 1,
        content: `[任务·${task.status === 'done' ? '已完成' : `进度${task.progress}%`}] ${task.title}`,
        result: task.status === 'done' ? (task.mentorComment || task.standard) : `当前进度 ${task.progress}%`
      }))]
      const report = await generateReportWithAI(facts, body.type || '周报')
      return result({ ...report, sourceStats: { tasks: visible.length, logs: logs.length }, range: { start: body.start, end: body.end } })
    }
    if (url === '/api/reports/export' || url === '/api/pdf/merge') return { blob: new Blob([body.content || '离线展示导出文件'], { type: 'application/octet-stream' }) }
    if (url === '/api/growth') {const taskPoints=visible.reduce((s,t)=>s+Math.round((t.points||50)*t.progress/100),0),bonusPoints=db.likes.filter(x=>x.toId===current().id).reduce((s,x)=>s+x.points,0),points=taskPoints+bonusPoints;return result({ points,taskPoints,bonusPoints, rank: points>=300?'太阳':points>=100?'月亮':'星星', next: points>=300?600:points>=100?300:100, percent:Math.min(100,Math.round(points/(points>=300?600:points>=100?300:100)*100)), weights: { schedule: 40, meeting: 25, practice: 20, supplement: 15 }, milestones: db.milestones, tasks: visible,likes:db.likes.filter(x=>x.toId===current().id) })}
    if (url === '/api/capabilities') { const queryId=Number(String(rawUrl).match(/userId=(\d+)/)?.[1]||current().id); const snapshot=(userId)=>{const person=users.find(u=>u.id===userId);const skills=db.skills.map(skill=>{const a=[...db.assessments].reverse().find(x=>x.userId===userId&&x.skillId===skill.id),related=db.tasks.filter(t=>t.assigneeId===userId&&t.skillIds?.includes(skill.id)),completed=related.filter(t=>t.status==='done'),evidenceSources=completed.map(t=>({taskId:t.id,title:t.title,completedAt:t.completedAt||t.dueDate,items:t.evidenceRequired||['工作记录']}));const level=a?.level||1;return{...skill,level,levelName:['未接触','观察学习','协助完成','独立完成','能够带教'][level-1],gap:Math.max(0,skill.targetLevel-level),evidenceCount:evidenceSources.length,evidenceSources,assessment:a,relatedTaskCount:related.length,completedTaskCount:completed.length}});return{user:person,skills,gaps:skills.filter(s=>s.gap>0),readiness:Math.round(skills.reduce((n,s)=>n+Math.min(1,s.level/s.targetLevel),0)/skills.length*100)}};const snap=snapshot(queryId);return result({...snap,heatmap:current().role==='mentor'?users.filter(u=>u.role==='apprentice').map(u=>snapshot(u.id)):[],safetyCases:db.safetyCases,reviews:db.reviews.filter(x=>x.userId===queryId),levelNames:['未接触','观察学习','协助完成','独立完成','能够带教']}) }
    if (url === '/api/training-path/generate') { const personId=Number(body.userId||current().id);const levels={};db.assessments.filter(x=>x.userId===personId).forEach(x=>levels[x.skillId]=x.level);return result({path:db.skills.filter(s=>(levels[s.id]||1)<s.targetLevel).slice(0,4).map((s,i)=>({stage:i+1,skillId:s.id,skillName:s.name,objective:`从L${levels[s.id]||1}提升至L${Math.min(s.targetLevel,(levels[s.id]||1)+1)}`,action:s.critical?'先完成安全案例推演，再在师傅监护下实践':'完成学习、实践和复盘',evidence:['风险预控卡','工作记录','师傅评价'],durationWeeks:2}))}) }
    match=url.match(/^\/api\/capabilities\/(\d+)\/assess$/);if(match){const userId=Number(match[1]),evidenceCount=db.tasks.filter(t=>t.assigneeId===userId&&t.status==='done'&&t.skillIds?.includes(body.skillId)).length,item={userId,skillId:body.skillId,level:body.level,evidenceCount,evidenceSource:'completed_tasks',comment:body.comment};db.assessments.push(item);save();return result(item)}
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
    send(raw) { setTimeout(async () => { let body = {}; try { body = typeof raw === 'string' ? JSON.parse(raw) : raw instanceof FormData ? Object.fromEntries(raw.entries()) : raw || {} } catch {} const out = await route(this.method, this.url, body); this.status = out.status || 200; this.readyState = 4; if (out.blob) { this.response = out.blob; this.responseText = '' } else { const payload = out.body || out; this.responseText = JSON.stringify(payload); this.response = this.responseType && this.responseType !== 'text' ? new Blob([this.responseText]) : this.responseText } if (this.onreadystatechange) this.onreadystatechange(); if (this.onload) this.onload(); if (this.onloadend) this.onloadend() }, 40) }
    abort() {}
  }
  window.XMLHttpRequest = OfflineXHR
})()

