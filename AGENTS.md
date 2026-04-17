# 班级养宠 — Codex 开发指引

## 技术栈
- 后端：Cloudflare Workers + D1（SQLite），单文件 `src-server/index.js`
- 前端：React 19 + Vite，函数组件 + Hooks
- 无 JWT/session，`userId` 参数鉴权，超管用 `assertSuperAdmin(env, userId)`

## 目录结构
```
src-server/index.js        — 全部后端 API handler
src/App.jsx                — 主框架、导航、铃铛面板、Modal
src/App.css                — 全局 + 导航/面板样式
src/api/client.js          — 前端 API 封装（request() 函数）
src/components/Admin/      — 超管控制台（账户、通知、反馈、日志）
src/components/Feedback/   — 教师反馈工单
src/components/PetParadise/ — 宠物乐园（加减分、喂养）
src/components/Rank/       — 战力榜 / 进步榜
src/components/Settings/   — 系统设置
src/components/Shop/       — 商店
src/lib/imageCompress.js   — Canvas 图片压缩
migrations/                — D1 迁移文件（0001~0024）
schema.sql                 — 完整建库脚本（与最新 migration 同步）
```

## 核心约定

### 数据库
- 改表必须：① 新建 `migrations/00NN_xxx.sql` ② 同步更新 `schema.sql`
- D1 没有 ON UPDATE CURRENT_TIMESTAMP，`updated_at` 每次 UPDATE 手动写 `datetime('now')`
- 应用迁移：`npm run db:init:local`

### 后端 API
- 教师接口 `/api/<resource>`，超管 `/api/admin/<resource>`
- 超管接口开头必须调 `assertSuperAdmin(env, userId)` 鉴权
- 超管写操作必须调 `appendAdminLog(env, userId, actionType, details)` 记日志
- 请求体解析用 `readBody(request)`，ID 解析用 `parseId()`
- 数据库实例用 `getDb(env)`

### 前端
- 无 Redux/Zustand，App.jsx 顶层 useState + props 下传
- API 调用统一用 `src/api/client.js` 的 `request()` 封装
- 注释用中文，解释"为什么"不解释"是什么"
- 时间展示用 `toLocaleString`

### 业务规则（最易踩坑，改分值相关代码前必读）
- **本宠经验 (exp)**：当前宠物身上的经验，扣分会减，毕业归零，决定宠物等级
- **累积经验 (lifetime_exp)**：学生一生总经验，只增不减，毕业保留，决定战力榜
- 加分：两个都加。扣分：只扣本宠经验，不扣累积经验
- 违反此规则会导致战力榜排名失准

### 样式
- 全局用 CSS 变量 `var(--text-main)` 等
- 夜间模式用 `:root[data-theme='night']` 选择器
- glass-card 风格：半透明白底 + 圆角 + 微边框

## 已知陷阱
- Flex 子项图片溢出 → 父级加 `min-width: 0` + `overflow: hidden`
- DOMPurify 只能前端用，Workers 环境没有 window
- `git add .` 会误提 .DS_Store，用具体文件名或 glob

## 常用命令
```
npm run dev:web          # Vite 前端（端口 5173）
npm run dev:api          # Workers API（端口 8787）
npm run build            # 生产构建
npm run lint             # ESLint 检查
npm run db:init:local    # 应用 D1 迁移
npm run db:init:remote   # 线上 D1 迁移（部署前必做）
```

## 改完必做清单
- [ ] `npm run build` 无报错
- [ ] `npm run lint` 无新 error
- [ ] 如有数据库改动：migration + schema.sql 同步
- [ ] commit message 中文简述（动词开头：新增/修复/优化）
- [ ] 更新 CHANGELOG.md

## 开发计划
如果存在 `docs/plans/` 下的 plan 文件，严格按照 plan 实现。Plan 里会包含：
- 完整 SQL migration
- API handler 签名和逻辑
- 前端组件结构和 props
- 要改的文件清单和复用清单
