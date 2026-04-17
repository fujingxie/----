# 变更记录

每次功能迭代或 bug 修复都往这里追加一条。格式：日期 + 简述 + 影响文件/表 + 关键决策。

---

## 2026-04-17 — 学生分组与分组批量互动

**Migration**: `0025_student_groups.sql`（`students` 新增 `group_name` 字段与班级分组索引）

**功能**：
- 宠物乐园新增「管理分组」，教师可为学生填写自定义分组名
- 宠物乐园列表可按已有分组筛选
- 批量互动弹窗支持按分组快选已有宠物的学生，并在学生行显示分组标签

**修改范围**：
- `src-server/index.js` — 学生查询返回 `group_name`，新增 `PATCH /api/students/groups`
- `src/api/client.js` — 新增 `setStudentGroups`
- `src/App.jsx` — 接收分组保存后的最新学生与日志
- `src/components/PetParadise/PetParadise.jsx/.css` — 分组管理、筛选与批量快选 UI
- `schema.sql` — 同步 `students.group_name` 和索引

---

## 2026-04-16 — 反馈工单系统

**Migration**: `0024_feedback_system.sql`（新增 `feedback_tickets` / `feedback_messages` 两表）

**功能**：
- 教师可按 Bug / 功能建议 / 使用问题 三类提交反馈
- 工单式多轮对话，超管回复后教师铃铛红点提醒
- 图片粘贴板上传（Cmd+V），客户端 Canvas 压缩到 ≤500KB Base64 存库
- 超管可改状态（open / in_progress / resolved / closed），关闭后教师侧回复框自动隐藏

**新增文件**：
- `src/components/Feedback/` — 教师端组件（List / Form / Detail）
- `src/components/Admin/AdminFeedbackPanel.jsx` — 超管管理面板
- `src/components/Common/UserGuide.jsx/.css` — 共享使用说明组件（Settings + 帮助弹框共用）
- `src/lib/imageCompress.js` — Canvas 图片压缩工具

**修改文件**：
- `src/App.jsx/.css` — 铃铛面板加 Tab（系统通知 / 我的反馈），合并未读数
- `src/components/Admin/AdminConsole.jsx` — 挂载 AdminFeedbackPanel
- `src-server/index.js` — 8 个新 handler（4 教师端 + 4 超管端）
- `src/api/client.js` — 8 个新 API 函数

**关键决策**：
- 图片用 Base64 存 D1 而不是对象存储（简化部署，体积小且频率低）
- 已读状态用双 boolean（`user_has_unread_reply` / `admin_has_unread_reply`）而不是每消息读取时间戳，查询简单
- UserGuide 抽成共享组件，避免 Settings 和帮助弹框两份文案漂移

**设计文档**：`docs/plans/2026-04-16-feedback-system.md`

---

## 2026-04-15 — 系统通知广播

**Migration**: `0023_notifications.sql`

**功能**：
- 超管可向全体教师广播通知（富文本，DOMPurify 过滤）
- 教师铃铛收到红点，点开查看详情
- 已读状态按教师维度跟踪

**修改范围**：
- `src-server/index.js` — 通知 CRUD handler
- `src/App.jsx/.css` — 铃铛组件 + 通知面板
- `src/components/Admin/AdminConsole.*` — 通知管理面板
- `package.json` — 新增 `dompurify` 依赖

---

## 2026-04 — 超管学生管理与加减分日志

- 45fbcba 超管学生管理新增查看加减分日志功能
- 6575564 新增超管账户学生管理功能
- 0802cd5 / 0b0dfb6 账户表格列宽样式修复

## 2026-04 — 战力榜经验值修复

- 293358c 修复战力榜 lifetime_exp 不更新的问题
- migration 0022: 新增 `lifetime_exp` 字段，拆分"本宠经验"与"累积经验"
- cdec27c 修复 handleUpdateStudent 未同步累加 lifetime_exp 的问题

## 此前历史

早期 migrations（0001 ~ 0021）包含：用户表、学生表、宠物系统、分值规则、商店、批量喂养、衰减配置、操作日志、规则排序/模板等。详见 `migrations/` 目录与 `git log`。
