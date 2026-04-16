# CLAUDE.md — 班级养宠项目开发指南

> 这份文档给 Claude（和未来任何接手的 AI agent）读。开发者是独立一人，只有一个 agent 在改代码，所以**直接在主仓 `main` 分支开发，不再用 worktree**。

## 项目简介

**班级养宠**是一个给老师课堂使用的宠物养成激励系统：学生有虚拟宠物，老师加减分喂养，宠物升级毕业。

- **后端**：Cloudflare Workers + D1（SQLite）
- **前端**：React 19 + Vite
- **部署**：Cloudflare Pages（前端）+ Workers（API）
- **鉴权**：无 JWT，通过 `userId` 传递 + 服务端 `assertSuperAdmin` 校验身份

## 目录结构

```
班级养宠/
├── src-server/
│   └── index.js            # Workers 入口，所有 API handler 都在这个单文件
├── src/
│   ├── App.jsx             # 前端主框架：导航、铃铛面板、Modal
│   ├── App.css             # 全局样式 + 导航/面板样式
│   ├── api/
│   │   └── client.js       # 前端 API 封装（fetch 包装）
│   ├── components/
│   │   ├── Admin/          # 超管控制台（账户管理、通知、反馈、日志）
│   │   ├── Common/         # 共享组件（UserGuide 等）
│   │   ├── Feedback/       # 教师反馈工单组件
│   │   ├── Login/          # 登录/注册
│   │   ├── PetParadise/    # 宠物乐园（加减分、喂养）
│   │   ├── Rank/           # 战力榜 / 进步榜
│   │   ├── Settings/       # 系统设置（规则、衰减、使用说明）
│   │   ├── Shop/           # 商店（金币兑换）
│   │   └── Toolbox/        # 工具箱（批量操作、导出等）
│   └── lib/
│       └── imageCompress.js  # Canvas 客户端图片压缩
├── migrations/             # D1 迁移文件（0001_...sql ~ 0024_...sql）
├── schema.sql              # 完整建库脚本（与最新 migration 保持同步）
├── docs/
│   └── plans/              # 归档的功能设计文档（.gitignore 例外放行）
└── CHANGELOG.md            # 变更记录（每次新功能/改动都追加一条）
```

## 关键命令

| 命令 | 用途 |
|------|------|
| `npm run dev:web` | 启动前端（Vite，端口 5173） |
| `npm run dev:api` | 启动 Workers 本地 API（端口 8787） |
| `npm run db:init:local` | 对本地 D1 应用最新 migrations |
| `npm run db:init:remote` | 对线上 D1 应用 migrations（部署前必做） |
| `npm run build` | 生产构建（前端） |
| `npm run lint` | ESLint 检查 |
| `npm run verify:contracts` | 校验 API 契约脚本 |

本地开发要同时跑前端和 API：分两个终端各跑 `dev:web` / `dev:api`。

## 数据库改动规范（非常重要）

每次加表/改字段必须：

1. 在 `migrations/` 新建 `00NN_description.sql`（编号递增）
2. 同步更新 `schema.sql` 里的 CREATE 语句（这个文件是"完整建库"的视角，不累加）
3. `npm run db:init:local` 应用到本地数据库
4. 如果 remote 也要生效，部署前或当场跑 `npm run db:init:remote`

**已知坑**：`d1_migrations` 表如果本地和 remote 不同步，migrations 会跳过或重复执行。遇到时先 `wrangler d1 execute class_pets_db --local --command "SELECT * FROM d1_migrations"` 看状态。

## 开发约定

### 代码风格
- 前端：函数组件 + Hooks，不用 Class
- 注释用中文，解释"为什么"不解释"是什么"
- 时间值统一用 `datetime('now')`（SQLite），前端用 `toLocaleString` 展示

### API 设计
- 路径：`/api/<resource>` 教师可调用，`/api/admin/<resource>` 超管专用
- 超管接口统一用 `assertSuperAdmin(env, userId)` 校验
- 超管写操作调 `appendAdminLog(env, userId, actionType, details)`
- 请求体解析用 `readBody(request)`，ID 解析用 `parseId`

### 前端状态
- 没有全局状态库（Redux/Zustand），`App.jsx` 顶层 `useState` + `props` 传递
- API 请求用 `src/api/client.js` 的 `request()` 封装，自动带 base URL

### 图片存储
- 反馈工单图片：**Base64 存 D1**（≤500KB，客户端 `lib/imageCompress.js` 压缩）
- 宠物图片等静态资源：`public/` 目录

### 鉴权约定
- 无密码登录，`userId` 走 URL/body，浏览器 `localStorage` 存 `user` 对象
- 没有 JWT/session，所有接口都接受 `userId` 参数，服务端做权限校验

## 关键业务规则（改代码前必读）

### 经验值双轨制
- **本宠经验**：当前宠物身上的经验，扣分会减，毕业归零，决定宠物等级
- **累积经验（lifetime_exp）**：学生一生总经验，只增不减，毕业保留，决定战力榜排名

加分时两个都加，扣分只扣本宠经验。`handleUpdateStudent` 和加减分流程都要保证同步，否则战力榜会失准（migration 0022 专门修过这个 bug）。

### 宠物状态衰减
- 饥饿 / 虚弱 / 休眠 三档，默认 2 / 4 / 7 天未加分进入
- 衰减只扣**本宠经验**，不扣累积经验
- 周末/节假日可配置暂停

## 工作流（单人单 agent）

1. **一个分支就够了**：直接在 `main` 上开发、提交。不再建 `claude/*` 分支或 worktree
2. **每次改动前**：`git pull` + 浏览 `CHANGELOG.md` 最新几条看看之前改过什么
3. **每次改完后**：
   - 提交前跑 `npm run build` + `npm run lint`
   - commit message 用中文简述（动词开头：新增 / 修复 / 优化 / 重构）
   - 把本次改动追加到 `CHANGELOG.md`，重要功能额外在 `docs/plans/` 建设计文档
4. **设计先行**：复杂功能（3+ 文件）先让 agent 出 plan 并归档到 `docs/plans/YYYY-MM-DD-feature.md`，再动手

## 已知陷阱

- **Flex 容器图片溢出**：Flex 子项默认 `min-width: auto`，图片会把容器撑爆。加 `min-width: 0` + `overflow: hidden` 到父级
- **DOMPurify 必须在前端**：Workers 里没有 window，不能在服务端用。通知的富文本在前端渲染时才过滤
- **D1 没有 `ON UPDATE CURRENT_TIMESTAMP`**：`updated_at` 得在每次 UPDATE 时手动写 `datetime('now')`
- **`git add .` 危险**：有 `.DS_Store`、node_modules 漏网风险，用具体文件名或 glob
