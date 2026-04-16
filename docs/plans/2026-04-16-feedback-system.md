# 反馈工单系统（教师提交 + 超管回复 + 铃铛红点）

## Context
通知系统已上线，但目前只是超管 → 教师的单向广播。老师在使用中遇到 Bug、有功能建议或使用疑问时没有便捷的提交渠道。本次要在系统内加一个**工单式反馈系统**：

- 教师可提交三类反馈：**Bug / 功能建议 / 使用问题**
- 超管在后台查看所有反馈并**多轮回复**（工单式对话）
- 教师**只看自己提交过的**反馈
- 超管回复后，教师铃铛处出现**红点提醒**
- 支持**粘贴板图片**上传（Base64 存储 + 客户端压缩到 ~500KB 以内）

最终效果：老师遇到问题能顺手反馈；超管能按类别分流处理；全流程可追溯、可审计。

---

## 一、数据库（migrations/0024_feedback_system.sql）

### 主表 `feedback_tickets`（工单）
```sql
CREATE TABLE IF NOT EXISTS feedback_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                     -- 提交教师
  category TEXT NOT NULL DEFAULT 'question',    -- 'bug' | 'feature' | 'question'
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',          -- 'open' | 'in_progress' | 'resolved' | 'closed'
  user_has_unread_reply INTEGER NOT NULL DEFAULT 0,   -- 0/1，超管回复后设为 1，老师查看后清 0
  admin_has_unread_reply INTEGER NOT NULL DEFAULT 1,  -- 老师提交/回复后设为 1，超管查看后清 0
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_updated ON feedback_tickets(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_updated ON feedback_tickets(status, updated_at DESC);
```

### 对话表 `feedback_messages`（每轮消息）
```sql
CREATE TABLE IF NOT EXISTS feedback_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  sender_user_id INTEGER NOT NULL,
  sender_role TEXT NOT NULL,                   -- 'user' | 'admin'
  content TEXT,                                 -- 文本内容
  image_data TEXT,                              -- Base64 图片（data:image/... 前缀完整保留），可为 null
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES feedback_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_ticket ON feedback_messages(ticket_id, created_at);
```

**注意**：`image_data` 保存完整 data URL（含 `data:image/png;base64,` 前缀），前端直接 `<img src={image_data}>` 即可，不需二次处理。

---

## 二、后端 API（src-server/index.js）

新增 **8 个 handler**。命名和参数风格沿用通知模块（见 `handleGetNotifications` 等）。复用工具：`parseId`、`readBody`、`assertSuperAdmin`、`appendAdminLog`。

### 教师端（4 个）

1. **`GET /api/feedback?userId=xxx`** — 教师查看自己的反馈列表
   - `WHERE user_id = ?`
   - 每条附带 `last_message_preview`、`message_count`（JOIN 聚合）
   - 按 `updated_at DESC`

2. **`GET /api/feedback/:ticketId?userId=xxx`** — 获取单个工单详情 + 所有消息
   - 校验 `user_id = userId`（教师只能看自己的）
   - 查询完毕后：`UPDATE feedback_tickets SET user_has_unread_reply = 0 WHERE id = ?`
   - 返回 `{ ticket, messages }`

3. **`POST /api/feedback`** — 教师新建反馈
   - body: `{ userId, category, title, content, image_data }`
   - 校验：`category ∈ ['bug','feature','question']`、`title` 非空
   - 事务：INSERT ticket → INSERT 第一条 message（role='user'）
   - 设 `admin_has_unread_reply = 1`

4. **`POST /api/feedback/:ticketId/messages`** — 教师追加回复
   - body: `{ userId, content, image_data }`
   - 校验 ticket 归属且 `status != 'closed'`
   - INSERT message(role='user') → `UPDATE ticket SET admin_has_unread_reply = 1, updated_at = now()`

### 超管端（4 个）

5. **`GET /api/admin/feedback?userId=xxx&status=xxx&category=xxx`** — 超管查看全部反馈
   - `assertSuperAdmin`
   - 支持可选 status/category 过滤
   - JOIN users 带上提交者用户名
   - 返回 `unread_count`（admin_has_unread_reply = 1 的总数），用于面板标题角标

6. **`GET /api/admin/feedback/:ticketId?userId=xxx`** — 超管查看工单详情
   - `assertSuperAdmin`
   - 查询完毕：`UPDATE ticket SET admin_has_unread_reply = 0`

7. **`POST /api/admin/feedback/:ticketId/reply`** — 超管回复
   - `assertSuperAdmin`
   - body: `{ userId, content, image_data }`
   - INSERT message(role='admin') → `UPDATE ticket SET user_has_unread_reply = 1, updated_at = now(), status = 'in_progress' (如果当前是 open)`
   - `appendAdminLog(actionType='反馈回复')`

8. **`PATCH /api/admin/feedback/:ticketId`** — 超管更新状态
   - `assertSuperAdmin`
   - body: `{ userId, status }` — 允许 'open' | 'in_progress' | 'resolved' | 'closed'
   - `appendAdminLog(actionType='反馈状态变更')`

### 路由注册位置
在通知路由（`/api/notifications` 附近，~line 4619-4642）之后加入，使用相同的 regex 匹配模式：
```js
const feedbackDetailMatch = path.match(/^\/api\/feedback\/(\d+)$/);
const feedbackMsgMatch    = path.match(/^\/api\/feedback\/(\d+)\/messages$/);
const adminFbDetailMatch  = path.match(/^\/api\/admin\/feedback\/(\d+)$/);
const adminFbReplyMatch   = path.match(/^\/api\/admin\/feedback\/(\d+)\/reply$/);
```

### 安全 & 验证
- **图片体积限制**：`image_data` 长度 > 800000（Base64 压缩后 ~500KB 的字符上限）时返回 400
- **内容长度限制**：`content` 超过 5000 字返回 400
- **速率限制（可选）**：教师 5 分钟内最多创建 3 条新工单（放后续迭代）

---

## 三、前端 API 客户端（src/api/client.js）

新增 8 个函数，紧跟现有通知 API 函数（~line 337 之后）：

```js
// 教师端
export const fetchMyFeedback = ({ userId }) =>
  request(`/feedback?${new URLSearchParams({ userId: String(userId) })}`);

export const fetchFeedbackDetail = ({ userId, ticketId }) =>
  request(`/feedback/${ticketId}?${new URLSearchParams({ userId: String(userId) })}`);

export const createFeedback = ({ userId, category, title, content, imageData }) =>
  request('/feedback', {
    method: 'POST',
    body: JSON.stringify({ userId, category, title, content, image_data: imageData }),
  });

export const replyFeedback = ({ userId, ticketId, content, imageData }) =>
  request(`/feedback/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ userId, content, image_data: imageData }),
  });

// 超管端
export const fetchAdminFeedback = ({ userId, status, category }) => {
  const params = new URLSearchParams({ userId: String(userId) });
  if (status) params.set('status', status);
  if (category) params.set('category', category);
  return request(`/admin/feedback?${params}`);
};

export const fetchAdminFeedbackDetail = ({ userId, ticketId }) =>
  request(`/admin/feedback/${ticketId}?${new URLSearchParams({ userId: String(userId) })}`);

export const replyAdminFeedback = ({ userId, ticketId, content, imageData }) =>
  request(`/admin/feedback/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ userId, content, image_data: imageData }),
  });

export const updateAdminFeedbackStatus = ({ userId, ticketId, status }) =>
  request(`/admin/feedback/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, status }),
  });
```

---

## 四、图片压缩工具（src/lib/imageCompress.js，新建）

客户端压缩：粘贴/选择图片 → Canvas 缩放 → `toDataURL('image/jpeg', quality)` → 递归降低质量直到 ≤ 500KB。

```js
/**
 * 压缩图片到 Base64 data URL（JPEG），保证 ≤ maxBytes
 * @param {File|Blob} file  原始图片
 * @param {number} maxBytes 上限字节数，默认 500KB
 * @param {number} maxDim   最长边像素，默认 1600
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function compressImageToDataUrl(file, maxBytes = 500 * 1024, maxDim = 1600) {
  // 1. FileReader 读为 data URL
  // 2. new Image() 加载
  // 3. Canvas 按比例缩放（width/height ≤ maxDim）
  // 4. 初始 quality = 0.85，循环：toDataURL('image/jpeg', quality)
  // 5. 若超标 → quality -= 0.1（最低 0.4），或进一步缩小 maxDim
  // 6. 返回最终 data URL
}
```

同时导出 `estimateBase64Bytes(dataUrl)` 工具函数（`(dataUrl.length * 3) / 4` 的估算）。

---

## 五、教师端组件（src/components/Feedback/）

### 5.1 `FeedbackList.jsx` — 工单列表（在铃铛面板「我的反馈」tab 内渲染）

- 调 `fetchMyFeedback({ userId })`
- 渲染列表：每条显示 标题 / 类别标签 / 状态 / 最后更新时间 / 未读红点（`user_has_unread_reply`）
- 顶部一个「＋ 提交反馈」按钮 → 切换到 `FeedbackForm`
- 点击条目 → 打开 `FeedbackDetail` 详情弹框

### 5.2 `FeedbackForm.jsx` — 提交表单

- 字段：类别 select（3 项）、标题、正文 textarea、图片（粘贴板或选择文件）
- `onPaste` 监听 textarea / form 容器：
  ```js
  const handlePaste = (e) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
    if (item) {
      e.preventDefault();
      compressImageToDataUrl(item.getAsFile()).then(setImageData);
    }
  };
  ```
- 显示图片预览 + 删除按钮
- 提交调 `createFeedback`，成功后切回列表并刷新

### 5.3 `FeedbackDetail.jsx` — 工单对话详情

- 调 `fetchFeedbackDetail` 加载详情（自动清零 `user_has_unread_reply`）
- 顶部：标题 / 类别 / 状态
- 对话气泡列表：
  - `role = 'user'` 靠右（教师色调）
  - `role = 'admin'` 靠左（蓝色/紫色，带「官方」标签）
  - 每条显示时间 + 内容 + 图片（若有）
- 底部：快速回复 textarea + 图片粘贴 + 发送按钮（仅 `status != 'closed'` 时可见）
- 若 `status = 'closed'`，显示「工单已关闭，如需继续请新建」

### 5.4 CSS `src/components/Feedback/Feedback.css`
沿用 glass-card 风格 + notif-panel 风格，新增：
- `.feedback-bubble-user`、`.feedback-bubble-admin`（对话气泡）
- `.feedback-category-tag.bug/.feature/.question`（三色标签）
- `.feedback-status-badge.open/.in_progress/.resolved/.closed`

---

## 六、超管端组件（AdminConsole.jsx + 新组件）

### 6.1 新建 `src/components/Admin/AdminFeedbackPanel.jsx`

结构类似现有「通知管理」CollapsiblePanel，包含：
- 顶部过滤：全部/Bug/功能建议/使用问题 + 状态过滤
- 列表表格：标题 | 类别 | 状态 | 提交人 | 消息数 | 最后更新 | 未读红点 | 操作（查看 / 改状态 / 关闭）
- 点「查看」 → 打开工单详情 Modal（复用 `FeedbackDetail` 的对话视图 + 超管回复框）
- 状态下拉：`open → in_progress → resolved → closed`
- 分页（沿用 `renderPagination`）

### 6.2 在 `AdminConsole.jsx` 挂载
在「通知管理」面板之后、「超管操作日志」之前新增一个 CollapsiblePanel：
```jsx
<CollapsiblePanel title="反馈工单" description="查看并回复教师提交的问题反馈">
  <AdminFeedbackPanel user={user} />
</CollapsiblePanel>
```

---

## 七、铃铛面板改造 —— 加 Tab（src/App.jsx）

当前 `notif-panel` 只展示系统通知。改成**两 Tab**：
```
┌─ 系统通知 │ 我的反馈 (n) ─┐
```

### 改动
- 新增 state：`notifTab`（'notif' | 'feedback'）、`myFeedbacks`、`feedbackUnread`
- 登录时并发加载：`fetchNotifications` + `fetchMyFeedback`
- 未读数 = 通知未读 + 反馈 `user_has_unread_reply = 1` 条数
- 红点 badge 仍显示合计
- 面板内上方放 Tab 切换器
- 选中「我的反馈」Tab 时渲染 `<FeedbackList>`，点条目打开 `<FeedbackDetail>` Modal

### 入口冗余（给老师多个发现路径）
1. 铃铛面板「我的反馈」Tab 里的「＋ 提交反馈」按钮
2. `UserGuide.jsx` 的 `guide-footer` 区块，把「欢迎通过通知栏的联系方式反馈」改成一个按钮：
   ```jsx
   <button className="guide-feedback-btn" onClick={onOpenFeedback}>
     我要提交反馈
   </button>
   ```
   通过 prop 由 `App.jsx` / `Settings.jsx` 注入回调。

---

## 八、修改文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `migrations/0024_feedback_system.sql` | 新建 | 两表 + 索引 |
| `schema.sql` | 修改 | 同步两表定义 |
| `src-server/index.js` | 修改 | 8 个 handler + 4 条路由匹配 |
| `src/api/client.js` | 修改 | 8 个 API 函数 |
| `src/lib/imageCompress.js` | 新建 | Canvas 压缩工具 |
| `src/components/Feedback/FeedbackList.jsx` | 新建 | 教师工单列表 |
| `src/components/Feedback/FeedbackForm.jsx` | 新建 | 提交表单（含粘贴板） |
| `src/components/Feedback/FeedbackDetail.jsx` | 新建 | 对话详情（含回复） |
| `src/components/Feedback/Feedback.css` | 新建 | 反馈相关样式 |
| `src/components/Admin/AdminFeedbackPanel.jsx` | 新建 | 超管反馈管理面板 |
| `src/components/Admin/AdminConsole.jsx` | 修改 | 挂载新 panel |
| `src/components/Admin/AdminConsole.css` | 修改 | 新 panel 样式补充 |
| `src/App.jsx` | 修改 | 铃铛 Tab 化 + 合并未读数 + Feedback Modal |
| `src/App.css` | 修改 | Tab 样式、对话气泡容器、modal 尺寸 |
| `src/components/Common/UserGuide.jsx` | 修改 | footer 替换成「我要提交反馈」按钮（可选 prop） |

---

## 九、关键复用清单（避免重写）

| 需求 | 复用对象 | 位置 |
|------|---------|------|
| 超管鉴权 | `assertSuperAdmin()` | `src-server/index.js:890` |
| 管理员日志 | `appendAdminLog()` | `src-server/index.js:1480` |
| ID 校验 | `parseId()` | `src-server/index.js:90` |
| 请求体解析 | `readBody()` | `src-server/index.js:695` |
| D1 访问 | `getDb(env)` | `src-server/index.js:707` |
| 前端请求封装 | `request()` | `src/api/client.js:3` |
| 折叠面板 | `CollapsiblePanel` | `AdminConsole.jsx:192` |
| 分页控件 | `renderPagination` | `AdminConsole.jsx:786` |
| 点击外部关闭 | useEffect + ref 模式 | `App.jsx:440` |
| Modal 外壳样式 | `.modal-overlay` + `.notif-detail-modal` | `App.css` |
| 未读 badge | `.notif-badge` | `App.css` |

---

## 十、验证步骤

### 数据库
1. `npm run db:init:local` 应用新 migration；`npx wrangler d1 execute class_pets_db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'feedback_%'"` 应返回两张表。

### 教师端
2. 以教师账号登录 → 点铃铛 → 切到「我的反馈」Tab → 空列表，显示「＋ 提交反馈」按钮。
3. 点提交 → 选 Bug 分类 → 填写标题/内容 → 用截图工具复制一张图 → 在 textarea 按 Cmd+V → 下方出现图片预览。
4. 提交 → 回到列表，新工单在顶部，状态 `open`。
5. （不退出）铃铛应无红点（因为是自己刚发的）。

### 超管端
6. 以超管登录 → 下拉超管控制台 → 看到「反馈工单」面板，条目显示未读红点。
7. 点进工单 → 对话视图显示老师消息 + 图片正常。
8. 回复「收到，正在处理」→ 对话自动刷新，状态变 `in_progress`。

### 回环验证
9. 切回教师账号 → 铃铛红点数 = 1（加在通知未读数之上）。
10. 点铃铛「我的反馈」Tab → 该工单标题有红点 → 点开 → 看到超管回复 → 关闭后红点消失。
11. 教师再回复 → 超管侧铃铛 / 面板红点应再次出现。
12. 超管把状态切到 `resolved` 或 `closed` → 教师端进详情时，`closed` 情况下回复框消失。

### 安全 & 边界
13. 尝试提交 1MB 的原图（未压缩） → 应被压缩到 ≤ 500KB；若强制绕过压缩直传超大 Base64，后端应返回 400。
14. 教师 A 用浏览器 devtools 改 URL 尝试访问教师 B 的 `/api/feedback/{id}` → 返回 403。
15. 超管操作日志中应出现「反馈回复」和「反馈状态变更」记录。
16. 夜间模式下：对话气泡、Tab、红点、按钮对比度正常。
