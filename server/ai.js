const detectSource = (text = '') => {
  if (/会议|例会|晨会|议题|参会|纪要|主持|发言/.test(text)) return { sourceType: 'meeting', sourceConfidence: 92, sourceReason: '识别到会议语义和行动项表达' }
  if (/项目|专项|改造|建设|里程碑|交付|验收/.test(text)) return { sourceType: 'project', sourceConfidence: 88, sourceReason: '识别到项目目标、交付或里程碑语义' }
  return { sourceType: 'daily', sourceConfidence: 76, sourceReason: '内容更符合日常工作或临时事项特征' }
}

const pointByPriority = { P0: 120, P1: 80, P2: 50, P3: 30 }

const fallbackTasks = (text) => {
  const sentences = text.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean).slice(0, 6)
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

export async function askDeepSeek(system, prompt, json = false) {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) throw new Error('后端未配置 DEEPSEEK_API_KEY')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
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

export async function splitWithAI(text, methods = ['WBS']) {
  try {
    const selectedMethods = methods.length ? methods.join('、') : 'WBS'
    const content = await askDeepSeek(
      `你是供电局任务管理助手。先把材料来源识别为meeting、project或daily，再拆分用户提供的工作内容，不编造人员或制度。使用用户选择的方法：${selectedMethods}。输出JSON对象，包含sourceType、sourceConfidence(0-100)、sourceReason和tasks。tasks为3到10个任务，每项包含title、description、priority(P0-P3)、dueDate(YYYY-MM-DD)、standard、method、points；method必须说明实际采用的方法，points按任务难度建议30到120积分。`,
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
      priority: ['P0', 'P1', 'P2', 'P3'].includes(task.priority) ? task.priority : 'P2',
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

export async function generateMeetingMinutesWithAI(text) {
  try {
    const content = await askDeepSeek(
      `你是供电局会议纪要助手。根据用户提供的会议材料或录音转录文本，生成结构化会议纪要。输出JSON对象，包含：title（会议名称，如无法判断则用"工作会议"）、date（会议日期YYYY-MM-DD，无法判断则用今天）、location（会议地点，无法判断则空）、attendees（参会人员数组，从文本中提取，无法判断则空数组）、agenda（议题数组，每项含topic议题、discussion讨论摘要、actionItems行动项数组，每项含task任务描述、owner责任人、dueDate截止日期）、decisions（决议数组）、nextMeeting（下次会议安排，无法判断则空）。严格基于输入文本，不编造人员或制度。`,
      `请根据以下内容生成结构化会议纪要：\n${text}`,
      true
    )
    const parsed = JSON.parse(content)
    const minutes = {
      title: parsed.title || '工作会议',
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : new Date().toISOString().slice(0, 10),
      location: parsed.location || '',
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
      agenda: Array.isArray(parsed.agenda) ? parsed.agenda.map(item => ({
        topic: item.topic || '议题',
        discussion: item.discussion || '',
        actionItems: Array.isArray(item.actionItems) ? item.actionItems.map(a => ({
          task: a.task || '',
          owner: a.owner || '',
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : ''
        })) : []
      })) : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      nextMeeting: parsed.nextMeeting || ''
    }
    return { minutes, ai: true }
  } catch (error) {
    const minutes = {
      title: '工作会议',
      date: new Date().toISOString().slice(0, 10),
      location: '',
      attendees: [],
      agenda: [{ topic: '会议内容', discussion: text.slice(0, 800), actionItems: [] }],
      decisions: [],
      nextMeeting: '',
      rawText: text
    }
    return { minutes, ai: false, warning: `AI暂不可用，已生成基础纪要框架：${error.message}` }
  }
}

export async function generateReportWithAI(logs, type) {
  const source = logs.map((l) => `${l.date}｜${l.hours}小时｜${l.content}｜成果：${l.result}`).join('\n')
  try {
    const content = await askDeepSeek('你是供电局员工工作材料助手。只基于输入事实生成中文材料，保留量化成果，不虚构数据。使用清晰的Markdown结构。', `生成${type}：\n${source}`)
    return { content, ai: true }
  } catch (error) {
    const total = logs.reduce((sum, l) => sum + Number(l.hours || 0), 0)
    const content = `# ${type}\n\n## 工作概况\n本周期共记录 ${logs.length} 项工作，投入 ${total} 小时。\n\n## 主要成果\n${logs.map((l) => `- ${l.content} 成果：${l.result}`).join('\n')}\n\n## 后续计划\n- 持续跟踪未闭环事项，按标准完成复核。`
    return { content, ai: false, warning: `AI暂不可用，已采用规则生成：${error.message}` }
  }
}

