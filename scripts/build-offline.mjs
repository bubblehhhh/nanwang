import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'web-dist')
const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const cssPath = index.match(/href="\/?assets\/([^"]+\.css)"/)?.[1]
const jsPath = index.match(/src="\/?assets\/([^"]+\.js)"/)?.[1]
if (!cssPath || !jsPath) throw new Error('未找到生产构建资源，请先运行 npm run build')
const css = fs.readFileSync(path.join(dist, 'assets', cssPath), 'utf8')
const js = fs.readFileSync(path.join(dist, 'assets', jsPath), 'utf8').replaceAll('</script', '<\\/script')
const mock = fs.readFileSync(path.join(root, 'scripts', 'offline-mock.js'), 'utf8').replaceAll('</script', '<\\/script')
const offlineKey = 'sk-3846c0f76eec4b8192583f5144fad9b5'
const resetTag = 'offline-reset-2026-08-20-v2'
const bootstrap = `
window.__XINHUO_OFFLINE_AI_KEY__ = ${JSON.stringify(offlineKey)};
try {
  localStorage.setItem('xinhuo_offline_ai_key', ${JSON.stringify(offlineKey)});
  if (localStorage.getItem('xinhuo_offline_reset_tag') !== ${JSON.stringify(resetTag)}) {
    localStorage.removeItem('xinhuo_offline_db');
    localStorage.setItem('xinhuo_offline_reset_tag', ${JSON.stringify(resetTag)});
  }
} catch {}
`.replaceAll('</script', '<\\/script')
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0033a0"><title>南网·薪火师徒工作管理平台（离线版）</title><style>${css}</style></head><body><div id="app"></div><script>${bootstrap}</script><script>${mock}</script><script type="module">${js}</script></body></html>`
fs.writeFileSync(path.join(root, '南网薪火师徒工作管理平台_离线展示版.html'), html, 'utf8')
console.log(`离线单文件已生成：${Buffer.byteLength(html)} bytes`)

