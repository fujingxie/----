# 班级养宠 — AI 开发指引

## 技术栈
- 后端：Cloudflare Workers + D1（SQLite），单文件 `src-server/index.js`
- 前端：React 19 + Vite，函数组件 + Hooks
- 无 JWT/session，`userId` 参数鉴权，超管用 `assertSuperAdmin(env, userId)`

## 核心约定

### 数据库
- 改表必须新建 `migrations/00NN_xxx.sql` + 同步 `schema.sql`
- D1 没有 `ON UPDATE CURRENT_TIMESTAMP`，`updated_at` 手动写 `datetime('now')`
- 应用迁移：`npm run db:init:local`

### API
- 教师接口 `/api/<resource>`，超管 `/api/admin/<resource>`
- 超管写操作必须调 `appendAdminLog(env, userId, actionType, details)`
- 请求体用 `readBody(request)`，ID 用 `parseId`

### 前端
- 无全局状态库，`App.jsx` 顶层 useState + props 传递
- API 调用用 `src/api/client.js` 的 `request()` 封装
- 注释用中文，解释"为什么"

### 业务规则（最易踩坑）
- **本宠经验**：扣分会减，毕业归零
- **累积经验 lifetime_exp**：只增不减，毕业保留，决定战力榜
- 加分两个都加，扣分只扣本宠经验

## 关键文件
- `src-server/index.js` — 全部后端逻辑
- `src/api/client.js` — 前端 API 封装
- `src/App.jsx` — 主框架、导航、铃铛面板
- `schema.sql` — 完整建库脚本

## 已知陷阱
- Flex 子项图片溢出：加 `min-width: 0` + `overflow: hidden`
- DOMPurify 只能前端用，Workers 没有 window
- `git add .` 会误提 .DS_Store，用具体文件名

## 改完必做
- `npm run build` 通过
- `npm run lint` 无新 error
- commit message 中文简述（动词开头：新增/修复/优化）
- 更新 `CHANGELOG.md`
