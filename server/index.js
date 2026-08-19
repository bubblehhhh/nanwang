import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import { PDFDocument } from 'pdf-lib'
import PDFKit from 'pdfkit'
import PptxGenJS from 'pptxgenjs'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { initDb, readDb, resetDb, writeDb } from './db.js'
import { generateReportWithAI, splitWithAI } from './ai.js'

const app = express()
const uploadDir = path.resolve('server/uploads')
const aiSettingsFile = path.resolve('server/data/ai-settings.json')
fs.mkdirSync(uploadDir, { recursive: true })
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } })

if (!process.env.DEEPSEEK_API_KEY && fs.existsSync(aiSettingsFile)) {
  try { process.env.DEEPSEEK_API_KEY = JSON.parse(fs.readFileSync(aiSettingsFile, 'utf8')).apiKey || '' } catch {}
}

app.use(cors())
app.use(express.json({ limit: '5mb' }))
initDb()

app.use((req, res, next) => {
  const startedAt = Date.now()
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleString('zh-CN', { hour12: false })}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`)
  })
  next()
})

const ok = (res, data, message = '操作成功') => res.json({ code: 0, message, data, requestId: crypto.randomUUID() })
const fail = (res, status, message) => res.status(status).json({ code: status, message, data: null, requestId: crypto.randomUUID() })
const nextId = (list) => Math.max(0, ...list.map((item) => Number(item.id))) + 1
const taskKey = (task) => `${Number(task.assigneeId)}::${String(task.title || '').trim().replace(/\s+/g, '').toLowerCase()}`

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    fail(res, 401, '登录状态已失效，请重新登录')
  }
}

function desensitize(text = '') {
  return text
    .replace(/(?<!\d)(1\d{2})\d{4}(\d{4})(?!\d)/g, '$1****$2')
    .replace(/(?<!\d)(\d{6})\d{8}(\d{4})(?!\d)/g, '$1********$2')
    .replace(/([\w.-])[\w.-]*(@[\w.-]+\.[A-Za-z]{2,})/g, '$1***$2')
    .replace(/(密码|口令|token|密钥)\s*[:：=]\s*\S+/gi, '$1：[已删除]')
}

const apiCatalog = [
  ['系统', 'GET', '/api/health', '检查后端与AI配置状态'],
  ['系统', 'POST', '/api/settings/ai-key', '首次保存后端AI密钥'],
  ['认证', 'POST', '/api/auth/login', '用户登录与角色校验'],
  ['工作台', 'GET', '/api/dashboard', '获取工作台统计、任务和人员'],
  ['任务', 'GET', '/api/tasks', '查询当前角色可见任务'],
  ['任务', 'POST', '/api/tasks', '发布单个任务'],
  ['任务', 'POST', '/api/tasks/bulk', '批量发布并拦截重复任务'],
  ['任务', 'PATCH', '/api/tasks/:id/progress', '任务负责人更新进度'],
  ['任务', 'POST', '/api/tasks/:id/verify', '师傅手动核销或退回任务'],
  ['智能处理', 'POST', '/api/file/upload', '上传并解析工作文件'],
  ['智能处理', 'POST', '/api/desensitize', '敏感文本脱敏'],
  ['智能处理', 'POST', '/api/task/split', '使用科学方法与AI拆解任务'],
  ['工作库', 'GET', '/api/work-logs', '查询工作历史记录'],
  ['工作库', 'POST', '/api/work-logs', '新增工作记录'],
  ['工作库', 'DELETE', '/api/work-logs/:id', '删除工作记录'],
  ['工作库', 'POST', '/api/reports/generate', '生成日报、周报、月报或报奖材料'],
  ['工作库', 'POST', '/api/reports/export', '导出PDF、Word或PPT文件'],
  ['成长', 'GET', '/api/growth', '查询成长积分与里程碑'],
  ['关怀', 'GET', '/api/care', '查询关怀中心数据'],
  ['关怀', 'POST', '/api/care/emotion', '提交每日情绪打卡'],
  ['关怀', 'POST', '/api/care/message', '发送师徒问候'],
  ['关怀', 'PUT', '/api/care/config', '保存关怀模块配置'],
  ['工具', 'POST', '/api/pdf/merge', '合并多个PDF文件'],
  ['管理', 'POST', '/api/admin/reset', '恢复初始演示数据']
]

app.get('/api/openapi.json', (_req, res) => {
  const paths = apiCatalog.reduce((result, [, method, route, summary]) => {
    result[route] ||= {}; result[route][method.toLowerCase()] = { summary }; return result
  }, {})
  res.json({ openapi: '3.0.3', info: { title: '南网·薪火 API', version: '1.0.0' }, servers: [{ url: 'http://localhost:3001' }], paths })
})

app.get('/docs', (_req, res) => {
  const rows = apiCatalog.map(([group, method, route, summary]) => `<tr><td>${group}</td><td><span class="method ${method.toLowerCase()}">${method}</span></td><td><code>${route}</code></td><td>${summary}</td></tr>`).join('')
  res.type('html').send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>南网·薪火 API 文档</title><style>body{margin:0;background:#f3f6fa;color:#172033;font:14px Arial,"Microsoft YaHei",sans-serif}.head{background:#07347c;color:#fff;padding:30px max(24px,calc((100% - 1080px)/2))}.head h1{margin:0 0 7px}.head p{margin:0;color:#bed2f2}.wrap{max-width:1080px;margin:24px auto;padding:0 20px}.meta{display:flex;gap:12px;margin-bottom:14px}.meta span{background:#fff;border:1px solid #dfe5ed;padding:8px 12px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dfe5ed}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid #e8ecf2}th{background:#f8fafc;color:#526076}code{color:#0033a0}.method{display:inline-block;min-width:52px;text-align:center;color:#fff;padding:4px 7px;border-radius:3px;font-size:11px;font-weight:bold}.get{background:#087f42}.post{background:#0757c8}.patch{background:#d36b00}.put{background:#7357b5}.delete{background:#c53b47}@media(max-width:700px){th:nth-child(1),td:nth-child(1){display:none}.wrap{padding:0 10px}th,td{padding:10px 8px}}</style></head><body><div class="head"><h1>南网·薪火 API 接口文档</h1><p>师徒工作管理平台 · 本机开发环境</p></div><main class="wrap"><div class="meta"><span>接口数量：${apiCatalog.length}</span><span>统一前缀：/api</span><span>鉴权：Bearer Token</span></div><table><thead><tr><th>模块</th><th>方法</th><th>路径</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>`)
})

app.get('/api/health', (_, res) => ok(res, { status: 'ok', aiConfigured: Boolean(process.env.DEEPSEEK_API_KEY) }))

app.post('/api/settings/ai-key', (req, res) => {
  if (process.env.DEEPSEEK_API_KEY) return fail(res, 409, 'AI密钥已经设置，无需重复配置')
  const apiKey = String(req.body.apiKey || '').trim()
  if (!/^sk-[A-Za-z0-9_-]{20,}$/.test(apiKey)) return fail(res, 400, '请输入有效的DeepSeek API密钥')
  fs.mkdirSync(path.dirname(aiSettingsFile), { recursive: true })
  fs.writeFileSync(aiSettingsFile, JSON.stringify({ apiKey }, null, 2), { encoding: 'utf8', mode: 0o600 })
  process.env.DEEPSEEK_API_KEY = apiKey
  ok(res, { configured: true }, 'AI密钥设置成功')
})

app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body
  const db = readDb()
  const key = String(username || '')
  const attempt = db.loginAttempts[key] || { count: 0, lockedUntil: 0 }
  if (attempt.lockedUntil > Date.now()) return fail(res, 423, `账号已锁定，请在 ${Math.ceil((attempt.lockedUntil - Date.now()) / 60000)} 分钟后重试`)
  const user = db.users.find((u) => [u.username, u.name, u.employeeNo].includes(username) && u.role === role)
  if (!user || user.password !== password) {
    attempt.count += 1
    if (attempt.count >= 5) { attempt.count = 0; attempt.lockedUntil = Date.now() + 15 * 60 * 1000 }
    db.loginAttempts[key] = attempt
    writeDb(db)
    return fail(res, 401, '账号、密码或角色不匹配')
  }
  db.loginAttempts[key] = { count: 0, lockedUntil: 0 }
  writeDb(db)
  const safeUser = { ...user }; delete safeUser.password
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '8h' })
  ok(res, { token, user: safeUser }, '登录成功')
})

app.get('/api/dashboard', auth, (req, res) => {
  const db = readDb()
  const scope = req.user.role === 'mentor' ? db.tasks.filter((t) => [1, 2].includes(t.assigneeId)) : db.tasks.filter((t) => t.assigneeId === req.user.id)
  const completed = scope.filter((t) => t.status === 'done').length
  const progress = scope.length ? Math.round(scope.reduce((s, t) => s + t.progress, 0) / scope.length) : 0
  ok(res, { tasks: scope, stats: { total: scope.length, completed, progress, due: scope.filter((t) => t.dueDate <= new Date().toISOString().slice(0, 10) && t.status !== 'done').length }, users: db.users.map(({ password, ...u }) => u), milestones: db.milestones })
})

app.get('/api/tasks', auth, (req, res) => {
  const db = readDb()
  const tasks = req.user.role === 'mentor' ? db.tasks : db.tasks.filter((t) => t.assigneeId === req.user.id)
  ok(res, tasks)
})

app.post('/api/tasks', auth, (req, res) => {
  const db = readDb()
  const assignee = db.users.find((u) => u.id === Number(req.body.assigneeId))
  if (!assignee) return fail(res, 400, '请选择有效的任务负责人')
  if (db.tasks.some((item) => taskKey(item) === taskKey(req.body))) return fail(res, 409, '该负责人已存在同名任务，不能重复发布')
  const task = { id: nextId(db.tasks), ...req.body, assigneeId: assignee.id, assignee: assignee.name, creatorId: req.user.id, progress: 0, status: 'todo', createdAt: new Date().toISOString().slice(0, 10) }
  db.tasks.push(task); writeDb(db); ok(res, task, '任务已发布')
})

app.post('/api/tasks/bulk', auth, (req, res) => {
  const db = readDb()
  const incoming = Array.isArray(req.body.tasks) ? req.body.tasks : []
  if (!incoming.length) return fail(res, 400, '请至少选择一项任务')
  const existing = new Set(db.tasks.map(taskKey)); const batch = new Set(); const published = []; const duplicates = []
  for (const item of incoming) {
    const assignee = db.users.find((u) => u.id === Number(item.assigneeId))
    const key = taskKey(item)
    if (!assignee || !item.title?.trim()) { duplicates.push({ title: item.title || '未命名任务', reason: '负责人或任务名称无效' }); continue }
    if (existing.has(key) || batch.has(key)) { duplicates.push({ title: item.title, reason: '同一负责人已存在同名任务' }); continue }
    const task = { id: nextId([...db.tasks, ...published]), ...item, assigneeId: assignee.id, assignee: assignee.name, creatorId: req.user.id, progress: 0, status: 'todo', createdAt: new Date().toISOString().slice(0, 10) }
    published.push(task); batch.add(key)
  }
  db.tasks.push(...published); writeDb(db)
  ok(res, { published, duplicates }, published.length ? `成功发布 ${published.length} 项任务` : '没有可发布的新任务')
})

app.patch('/api/tasks/:id/progress', auth, (req, res) => {
  const db = readDb(); const task = db.tasks.find((t) => t.id === Number(req.params.id))
  if (!task) return fail(res, 404, '任务不存在')
  if (req.user.role !== 'apprentice' || task.assigneeId !== req.user.id) return fail(res, 403, '只有任务负责人本人可以更新进度')
  const progress = Math.max(0, Math.min(100, Number(req.body.progress)))
  task.progress = progress; task.status = progress === 100 ? 'verify' : progress > 0 ? 'doing' : 'todo'
  task.note = req.body.note || task.note; writeDb(db); ok(res, task, '进度已更新')
})

app.post('/api/tasks/:id/verify', auth, (req, res) => {
  const db = readDb(); const task = db.tasks.find((t) => t.id === Number(req.params.id))
  if (!task) return fail(res, 404, '任务不存在')
  if (req.user.role !== 'mentor') return fail(res, 403, '只有师傅可以核销任务')
  if (task.status !== 'verify') return fail(res, 409, '任务尚未达到100%并提交核销')
  task.status = req.body.approved ? 'done' : 'doing'; task.progress = req.body.approved ? 100 : 90; task.mentorComment = req.body.comment; task.completedAt = req.body.approved ? new Date().toISOString().slice(0, 10) : undefined
  if (req.body.approved) db.milestones.push({ id: nextId(db.milestones), userId: task.assigneeId, date: task.completedAt, title: `完成任务：${task.title}`, description: req.body.comment || task.standard, type: '任务里程碑' })
  writeDb(db); ok(res, task, req.body.approved ? '任务已核销并进入工作库' : '任务已退回')
})

app.post('/api/desensitize', auth, (req, res) => ok(res, { text: desensitize(req.body.text) }))
app.post('/api/task/split', auth, async (req, res) => ok(res, await splitWithAI(desensitize(req.body.text || ''), req.body.methods), '任务拆分完成'))

app.post('/api/file/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 400, '请选择文件')
  const ext = path.extname(req.file.originalname).toLowerCase()
  try {
    let content = ''
    if (['.txt', '.csv'].includes(ext)) content = fs.readFileSync(req.file.path, 'utf8')
    else if (['.docx', '.doc'].includes(ext)) content = (await mammoth.extractRawText({ path: req.file.path })).value
    else if (['.xlsx', '.xls'].includes(ext)) {
      const book = XLSX.readFile(req.file.path)
      content = book.SheetNames.map((name) => `【${name}】\n${XLSX.utils.sheet_to_csv(book.Sheets[name])}`).join('\n')
    } else if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) content = '音频文件已接收。当前演示环境未配置语音转写服务，请在下方补充或粘贴转录文本后继续。'
    else if (['.png', '.jpg', '.jpeg', '.bmp'].includes(ext)) content = '图片文件已接收。当前演示环境未配置OCR服务，请在下方补充识别文本后继续。'
    else return fail(res, 415, '不支持该文件格式')
    ok(res, { fileName: req.file.originalname, type: ext, content: desensitize(content) }, '文件解析完成，请复核内容')
  } catch (error) { fail(res, 500, `文件解析失败：${error.message}`) }
  finally { fs.rm(req.file.path, { force: true }, () => {}) }
})

app.get('/api/work-logs', auth, (req, res) => {
  const db = readDb(); const logs = db.workLogs.filter((l) => l.userId === req.user.id || req.user.role === 'mentor')
  ok(res, logs.sort((a, b) => b.date.localeCompare(a.date)))
})
app.post('/api/work-logs', auth, (req, res) => { const db = readDb(); const log = { id: nextId(db.workLogs), userId: req.user.id, ...req.body }; db.workLogs.push(log); writeDb(db); ok(res, log, '工作记录已保存') })
app.delete('/api/work-logs/:id', auth, (req, res) => { const db = readDb(); db.workLogs = db.workLogs.filter((l) => l.id !== Number(req.params.id)); writeDb(db); ok(res, true, '记录已删除') })
app.post('/api/reports/generate', auth, async (req, res) => { const db = readDb(); const logs = db.workLogs.filter((l) => l.userId === req.user.id && (!req.body.start || l.date >= req.body.start) && (!req.body.end || l.date <= req.body.end)); ok(res, await generateReportWithAI(logs, req.body.type || '周报'), '材料生成完成') })

app.post('/api/reports/export', auth, async (req, res) => {
  const { content = '', format = 'docx', title = '工作周报' } = req.body
  if (!content.trim()) return fail(res, 400, '请先生成报告内容')
  const lines = content.split('\n').filter((line) => line.trim())
  try {
    if (format === 'docx') {
      const children = lines.map((line) => {
        const heading = line.match(/^(#{1,3})\s+(.+)/)
        if (heading) return new Paragraph({ text: heading[2], heading: heading[1].length === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { before: 180, after: 100 } })
        return new Paragraph({ children: [new TextRun({ text: line.replace(/^[-*]\s*/, '• '), size: 22 })], spacing: { after: 100, line: 360 } })
      })
      const doc = new Document({ sections: [{ properties: {}, children }] })
      const buffer = await Packer.toBuffer(doc)
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.docx` }).send(buffer)
    } else if (format === 'pptx') {
      const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.author = req.user.name; pptx.subject = title; pptx.title = title
      const sections = content.split(/\n(?=##\s)/).filter(Boolean)
      sections.slice(0, 10).forEach((section, index) => {
        const slide = pptx.addSlide(); slide.background = { color: index === 0 ? 'F2F6FC' : 'FFFFFF' }
        const sectionLines = section.split('\n').filter(Boolean); const slideTitle = sectionLines.shift()?.replace(/^#+\s*/, '') || title
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: .16, fill: { color: index === 0 ? '0033A0' : '00A650' }, line: { color: index === 0 ? '0033A0' : '00A650' } })
        slide.addText(slideTitle, { x: .75, y: .55, w: 11.8, h: .55, fontFace: 'Microsoft YaHei', fontSize: 24, bold: true, color: '172033', margin: 0 })
        slide.addText(sectionLines.join('\n').replace(/^[-*]\s*/gm, '• '), { x: .85, y: 1.45, w: 11.5, h: 5.2, fontFace: 'Microsoft YaHei', fontSize: 16, color: '334155', breakLine: false, valign: 'top', margin: .08, paraSpaceAfterPt: 10 })
        slide.addText(`南网·薪火｜${index + 1}`, { x: 10.8, y: 7.05, w: 1.7, h: .2, fontFace: 'Microsoft YaHei', fontSize: 8, color: '94A3B8', align: 'right', margin: 0 })
      })
      const buffer = await pptx.write({ outputType: 'nodebuffer' })
      res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.pptx` }).send(buffer)
    } else if (format === 'pdf') {
      const pdf = new PDFKit({ size: 'A4', margin: 54, info: { Title: title, Author: req.user.name } })
      const font = ['C:/Windows/Fonts/Deng.ttf', 'C:/Windows/Fonts/simhei.ttf', 'C:/Windows/Fonts/simfang.ttf'].find(fs.existsSync)
      if (font) pdf.font(font)
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.pdf` })
      pdf.pipe(res); pdf.fontSize(20).fillColor('#0033A0').text(title); pdf.moveDown(.8); pdf.fontSize(11).fillColor('#26334B').text(content.replace(/^#+\s*/gm, '').replace(/^[-*]\s*/gm, '• '), { lineGap: 6 }); pdf.end()
    } else fail(res, 400, '不支持的导出格式')
  } catch (error) { fail(res, 500, `文件生成失败：${error.message}`) }
})

app.get('/api/growth', auth, (req, res) => {
  const db = readDb(); const userId = Number(req.query.userId || req.user.id); const tasks = db.tasks.filter((t) => t.assigneeId === userId)
  const points = tasks.reduce((sum, t) => sum + Math.round((t.points || 50) * t.progress / 100), 0)
  const rank = points > 600 ? '皇冠' : points >= 300 ? '太阳' : points >= 100 ? '月亮' : '星星'
  const next = points > 600 ? 800 : points >= 300 ? 600 : points >= 100 ? 300 : 100
  ok(res, { points, rank, next, percent: Math.min(100, Math.round(points / next * 100)), weights: { schedule: 40, meeting: 25, practice: 20, supplement: 15 }, milestones: db.milestones.filter((m) => m.userId === userId), tasks })
})

app.get('/api/care', auth, (req, res) => { const db = readDb(); ok(res, { emotion: db.emotions.find((e) => e.userId === req.user.id && e.date === new Date().toISOString().slice(0,10)), praise: db.praise, gratitude: db.gratitude || [], messages: db.messages.filter((m) => m.fromId === req.user.id || m.toId === req.user.id), users: db.users.map(({ password, ...user }) => user), actions: (db.careActions || []).filter(item => item.userId === req.user.id), config: db.moduleConfig[req.user.id] || null }) })
app.post('/api/care/emotion', auth, (req, res) => { const db = readDb(); const date = new Date().toISOString().slice(0,10); if (db.emotions.some((e) => e.userId === req.user.id && e.date === date)) return fail(res, 409, '今天已经完成情绪打卡'); const item = { id: nextId(db.emotions), userId: req.user.id, date, mood: req.body.mood }; db.emotions.push(item); writeDb(db); ok(res, item, '感谢你的分享') })
app.post('/api/care/message', auth, (req, res) => { const db = readDb(); const target = db.users.find((u) => u.id === Number(req.body.toId)); const content = String(req.body.content || '').trim(); if (!target) return fail(res, 400, '请选择有效的对话对象'); if (!content) return fail(res, 400, '消息内容不能为空'); if (content.length > 300) return fail(res, 400, '消息内容不能超过300字'); const item = { id: nextId(db.messages), fromId: req.user.id, toId: target.id, from: req.user.name, content, time: new Date().toLocaleString('zh-CN', { hour12: false }) }; db.messages.push(item); writeDb(db); ok(res, item, '问候已发送') })
app.post('/api/care/praise', auth, (req, res) => { const db = readDb(); const target = db.users.find((u) => u.id === Number(req.body.toId)); const content = String(req.body.content || '').trim(); if (!target || !content) return fail(res, 400, '请选择接收人并填写表扬内容'); const item = { id: nextId(db.praise), from: req.user.name, toId: target.id, content, style: req.body.style || '薪火橙', date: new Date().toISOString().slice(0,10) }; db.praise.push(item); writeDb(db); ok(res, item, '表扬卡已发送') })
app.post('/api/care/gratitude', auth, (req, res) => { const db = readDb(); const target = db.users.find(user => user.id === Number(req.body.toId)); const item = { id: nextId(db.gratitude || []), from: req.user.name, to: target?.name || '同事', content: req.body.content, date: new Date().toISOString().slice(0,10) }; db.gratitude ||= []; db.gratitude.push(item); writeDb(db); ok(res, item, '感谢卡已发送') })
app.post('/api/care/action', auth, (req, res) => { const allowed = ['health','focus','warning-handled']; if (!allowed.includes(req.body.type)) return fail(res, 400, '不支持的关怀记录类型'); const db = readDb(); db.careActions ||= []; const item = { id: nextId(db.careActions), userId: req.user.id, type: req.body.type, value: String(req.body.value || ''), date: new Date().toISOString().slice(0,10), createdAt: new Date().toISOString() }; db.careActions.push(item); writeDb(db); ok(res, item, '关怀记录已保存') })
app.put('/api/care/config', auth, (req, res) => { const db = readDb(); db.moduleConfig[req.user.id] = req.body; writeDb(db); ok(res, req.body, '工作台布局已保存') })

app.post('/api/pdf/merge', auth, upload.array('files', 10), async (req, res) => {
  try { const merged = await PDFDocument.create(); for (const file of req.files) { const doc = await PDFDocument.load(fs.readFileSync(file.path)); const pages = await merged.copyPages(doc, doc.getPageIndices()); pages.forEach((p) => merged.addPage(p)) } const bytes = await merged.save(); res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="merged.pdf"' }).send(Buffer.from(bytes)) }
  catch (e) { fail(res, 400, `PDF合并失败：${e.message}`) }
  finally { req.files?.forEach((f) => fs.rm(f.path, { force: true }, () => {})) }
})

app.post('/api/admin/reset', auth, (_, res) => ok(res, resetDb(), '测试数据已恢复'))

// 生产模式下由同一个后端进程托管前端，避免 Vite 开发服务退出后页面失联。
const webRoot = path.resolve(process.env.WEB_ROOT || 'web-dist')
app.use(express.static(webRoot))
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(path.join(webRoot, 'index.html'))
  next()
})

app.use((err, _req, res, _next) => fail(res, 500, err.message || '服务器内部错误'))
app.listen(process.env.PORT || 3001, () => console.log(`南网·薪火后端运行于 http://localhost:${process.env.PORT || 3001}`))

