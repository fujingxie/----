# 通知和反馈工单删除功能

## 解决的问题

通知和反馈列表只增不减，没有清理入口。

## 删除权限设计

| 操作 | 谁能做 |
|------|--------|
| 删除通知 | 超管（创建者） |
| 删除反馈工单 | 超管（任意）/ 教师（只能删自己的） |

---

## 一、后端 `src-server/index.js`

### 新增 Handler 1：超管删除通知 `handleAdminDeleteNotification`

```js
// DELETE /api/admin/notifications/:id
async function handleAdminDeleteNotification(request, env, notificationId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const db = getDb(env);

  // notification_reads 无 CASCADE，先手动删
  await db.prepare('DELETE FROM notification_reads WHERE notification_id = ?')
    .bind(notificationId).run();
  await db.prepare('DELETE FROM notifications WHERE id = ?')
    .bind(notificationId).run();

  await appendAdminLog(env, userId, '删除通知', `通知 ID: ${notificationId}`);

  return json({ success: true });
}
```

### 新增 Handler 2：超管删除反馈工单 `handleAdminDeleteFeedback`

```js
// DELETE /api/admin/feedback/:ticketId?userId=xxx
async function handleAdminDeleteFeedback(request, env, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const db = getDb(env);

  // feedback_messages 已有 ON DELETE CASCADE，删 ticket 自动删消息
  const result = await db.prepare('DELETE FROM feedback_tickets WHERE id = ?')
    .bind(ticketId).run();

  if (!result.meta?.changes) {
    return error('工单不存在', 404);
  }

  await appendAdminLog(env, userId, '删除反馈工单', `工单 ID: ${ticketId}`);

  return json({ success: true });
}
```

### 新增 Handler 3：教师删除自己的反馈工单 `handleUserDeleteFeedback`

```js
// DELETE /api/feedback/:ticketId?userId=xxx
async function handleUserDeleteFeedback(request, env, ticketId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  if (!userId) return error('缺少 userId', 400);

  const db = getDb(env);

  // 只能删自己的
  const ticket = await db.prepare(
    'SELECT id FROM feedback_tickets WHERE id = ? AND user_id = ?'
  ).bind(ticketId, userId).first();

  if (!ticket) return error('工单不存在或无权限', 403);

  await db.prepare('DELETE FROM feedback_tickets WHERE id = ?').bind(ticketId).run();

  return json({ success: true });
}
```

### 路由注册（在现有 feedback 路由附近，注意顺序）

```js
// 超管删除通知（放在现有 adminFbDetailMatch 路由附近）
const adminNotifDeleteMatch = path.match(/^\/api\/admin\/notifications\/(\d+)$/);
if (adminNotifDeleteMatch && method === 'DELETE') {
  return handleAdminDeleteNotification(request, env, Number(adminNotifDeleteMatch[1]));
}

// 超管删除反馈工单
const adminFbDeleteMatch = path.match(/^\/api\/admin\/feedback\/(\d+)$/);
if (adminFbDeleteMatch && method === 'DELETE') {
  return handleAdminDeleteFeedback(request, env, Number(adminFbDeleteMatch[1]));
}

// 注意：adminFbDeleteMatch 和 adminFbDetailMatch 的 regex 相同，靠 method 区分
// 确保 DELETE 判断在 GET/PATCH 之前，或者合并到同一个 if 分支里

// 教师删除自己的工单
const feedbackDeleteMatch = path.match(/^\/api\/feedback\/(\d+)$/);
if (feedbackDeleteMatch && method === 'DELETE') {
  return handleUserDeleteFeedback(request, env, Number(feedbackDeleteMatch[1]));
}
// 注意：同上，feedbackDeleteMatch 和 feedbackDetailMatch 的 regex 相同，靠 method 区分
```

**路由顺序注意**：现有代码里 `adminFbDetailMatch` 用于 GET，`feedbackDetailMatch` 用于 GET。新增的 DELETE 可以直接加在对应 regex 的 if 语句里，用 `else if (method === 'DELETE')` 分支。

---

## 二、前端 API 客户端 `src/api/client.js`

```js
// 超管删除通知
export const adminDeleteNotification = ({ userId, notificationId }) =>
  request(`/admin/notifications/${notificationId}?userId=${userId}`, {
    method: 'DELETE',
  });

// 超管删除反馈工单
export const adminDeleteFeedback = ({ userId, ticketId }) =>
  request(`/admin/feedback/${ticketId}?userId=${userId}`, {
    method: 'DELETE',
  });

// 教师删除自己的反馈工单
export const deleteMyFeedback = ({ userId, ticketId }) =>
  request(`/feedback/${ticketId}?userId=${userId}`, {
    method: 'DELETE',
  });
```

---

## 三、超管通知管理面板 `src/components/Admin/AdminConsole.jsx`

在通知列表每条记录的操作列，加「删除」按钮（找到通知列表的 `<tr>` 操作栏）：

```jsx
// 在现有「发送」或「查看」按钮旁边加
<button
  className="confirm-btn micro danger"
  type="button"
  onClick={() => handleDeleteNotification(notif.id)}
>
  删除
</button>
```

新增 handler（在通知管理相关逻辑附近）：

```js
const handleDeleteNotification = async (notifId) => {
  const confirmed = window.confirm('确认删除这条通知？所有教师将看不到此通知。');
  if (!confirmed) return;
  try {
    await adminDeleteNotification({ userId: user.id, notificationId: notifId });
    // 从本地列表移除
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  } catch (e) {
    alert(e?.message || '删除失败');
  }
};
```

**需要 import**：在文件顶部 import 列表加 `adminDeleteNotification`。

---

## 四、超管反馈工单面板 `src/components/Admin/AdminFeedbackPanel.jsx`

在工单列表每条记录的「查看」按钮旁加「删除」按钮：

```jsx
<button
  className="confirm-btn micro danger"
  type="button"
  onClick={() => handleDeleteTicket(t.id)}
>
  删除
</button>
```

新增 handler：

```js
const handleDeleteTicket = useCallback(async (ticketId) => {
  const confirmed = window.confirm('确认删除此工单？操作不可撤销，所有对话记录也将删除。');
  if (!confirmed) return;
  try {
    await adminDeleteFeedback({ userId: currentUser.id, ticketId });
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicket?.id === ticketId) closeTicket();
  } catch (e) {
    alert(e?.message || '删除失败');
  }
}, [currentUser?.id, selectedTicket, closeTicket]);
```

**需要 import**：`adminDeleteFeedback`。

---

## 五、教师我的反馈列表 `src/components/Feedback/FeedbackList.jsx`

在每条反馈工单行尾加删除按钮（小图标，只有 closed 状态才显示，避免误删进行中的工单）：

```jsx
{ticket.status === 'closed' && (
  <button
    className="feedback-delete-btn"
    type="button"
    title="删除工单"
    onClick={(e) => {
      e.stopPropagation(); // 不触发 onOpen
      onDelete(ticket.id);
    }}
  >
    ×
  </button>
)}
```

在 FeedbackList 的父组件（`App.jsx` 铃铛面板里渲染 `<FeedbackList>` 的地方）传入 `onDelete` prop：

```jsx
// App.jsx 里新增
const handleDeleteMyFeedback = async (ticketId) => {
  try {
    await deleteMyFeedback({ userId: user.id, ticketId });
    setMyFeedbacks((prev) => prev.filter((t) => t.id !== ticketId));
    setFeedbackUnread(
      (prev) => Math.max(0, prev - (myFeedbacks.find((t) => t.id === ticketId)?.user_has_unread_reply ? 1 : 0))
    );
  } catch (e) {
    alert(e?.message || '删除失败');
  }
};

// 传给 FeedbackList
<FeedbackList
  ...
  onDelete={handleDeleteMyFeedback}
/>
```

**CSS（`Feedback.css`）**：

```css
.feedback-delete-btn {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.feedback-list-item:hover .feedback-delete-btn {
  opacity: 1;
}
```

---

## 六、改动文件总览

| 文件 | 改动 |
|------|------|
| `src-server/index.js` | 3 个新 handler + 路由注册 |
| `src/api/client.js` | 3 个新 API 函数 |
| `src/components/Admin/AdminConsole.jsx` | 通知列表加删除按钮 + handler |
| `src/components/Admin/AdminFeedbackPanel.jsx` | 工单列表加删除按钮 + handler |
| `src/components/Feedback/FeedbackList.jsx` | closed 工单加删除按钮 |
| `src/components/Feedback/Feedback.css` | 删除按钮样式 |
| `src/App.jsx` | handleDeleteMyFeedback + 传 onDelete prop |

---

## 七、验证步骤

1. 超管删除通知 → 列表消失，教师铃铛刷新后看不到该通知
2. 超管删除反馈工单 → 列表消失，若工单详情正在打开则自动关闭
3. 教师在「我的反馈」中，已关闭工单悬停显示 × 按钮 → 点击删除 → 列表移除
4. 进行中的工单（open / in_progress / resolved）不显示教师侧删除按钮
5. 超管操作日志中出现「删除通知」「删除反馈工单」记录
6. 删除工单后对应的 feedback_messages 也自动级联删除（查 DB 验证）
