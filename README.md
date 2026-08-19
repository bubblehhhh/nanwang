# 南网·薪火师徒工作管理平台

## 启动方式

环境要求：Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

开发模式浏览器访问 `http://localhost:5173`。日常稳定运行可直接访问后端托管地址 `http://localhost:3001`。

生产构建：

```bash
npm run build
npm start
```

## 演示账号

| 身份 | 账号/姓名 | 密码 |
| --- | --- | --- |
| 组员 | 张三 / `zhangsan` | `Abc@123456` |
| 组员 | 赵六 / `zhaoliu` | `Abc@123456` |
| 组长 | 李四 / `lisi` | `Abc@123456` |

登录时必须选择与账号一致的角色。连续输错 5 次后锁定 15 分钟。

## 后端配置

复制 `.env.example` 为 `.env`，在后端环境中配置：

- `DEEPSEEK_API_KEY`：DeepSeek API 密钥。
- `DEEPSEEK_BASE_URL`：DeepSeek API 地址。
- `DEEPSEEK_MODEL`：模型名称。
- `JWT_SECRET`：登录令牌签名密钥，生产环境必须更换。
- `PORT`：后端端口，默认 `3001`。

`.env` 已加入 `.gitignore`，不得提交到版本库或写入前端代码。

## 协作开发

```bash
git clone <仓库地址>
cd nanwang-xinhuo-platform
cp .env.example .env
npm install
npm run dev
```

提交代码前请新建功能分支，并通过 Pull Request 合并到 `main`。人员信息库、真实业务数据、上传文件及 API 密钥只保存在本地或部署平台的环境变量中，不得提交到公开仓库。

## 公网部署

可将仓库部署到支持 Node.js 20 的云服务器或应用平台，构建命令为 `npm run build`，启动命令为 `npm start`。部署平台需设置 `DEEPSEEK_API_KEY`、`JWT_SECRET` 等后端环境变量。

GitHub 负责源码协作，不会自动运行 Express 后端；需要完成云端部署后，网站才能通过公网地址访问。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/bubblehhhh/nanwang)

点击上方按钮可部署完整在线版。创建服务时填写 `DEEPSEEK_API_KEY`，其余构建、启动和健康检查配置由仓库中的 `render.yaml` 自动完成。

## 数据与文件

- 演示数据首次运行时写入 `server/data/db.json`。
- 上传文件只在 `server/uploads` 临时处理，完成后自动删除。
- 按 `Ctrl+Shift+D` 可恢复初始演示数据。
- Word、Excel、TXT、CSV 可本地解析；音频转写和图片 OCR 当前保留明确的人工补录流程。

## 已实现模块

- 组员/组长登录与师徒关系识别。
- 任务发布、执行进度、导师核销和成果归档。
- 工作台集中展示师傅叮嘱、点赞反馈、量化工作量日历、逐小时温度和降雨概率及一周日程。
- 任务支持“会议任务/项目工作/日常工作 → P0-P3”的两级分类，并可在分组列表与状态看板之间切换。
- 多模态文件导入、敏感信息脱敏、AI材料来源识别、八类科学方法组合拆解、卡片/表格/思维导图展示、勾选批量发布及重复任务拦截。
- 每项任务配置奖励积分；师傅可点赞已核销的优秀任务，点赞与额外积分同步反馈到徒弟工作台和成长档案。
- 日报、周报、月报和报奖材料自动汇总期限内任务与工作记录，一键生成并导出 PDF、Word 或 PPT。
- 每日关怀、健康打卡、情绪打卡、表扬卡、番茄专注、关怀提醒六项功能，以及可留痕的师徒实时对话。
- 岗位胜任力地图、五级能力认证、班组技能热力图、能力证据链和个性化培养路径。
- 任务强制关联岗位技能；P0/P1任务必须配置安全风险点，智能拆解任务自动补全风险与证据要求。
- 典型安全经验按能力缺口推荐，师徒通过周复盘持续调整下一阶段培养重点。
- PDF 多文件合并。

