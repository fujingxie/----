# 超管反馈详情弹窗体验优化

## 问题描述

超管控制台点「查看」打开反馈工单详情时，弹窗存在以下问题：

1. **弹窗尺寸不合理**：复用了 `.notif-detail-modal.help-modal`（max-width 760px），对于对话式布局偏窄，内容挤在一起
2. **对话区域高度不够**：`.feedback-conversation` 设了 `max-height: 50vh`，加上头部和回复框后，实际可视对话区域太小
3. **回复框快被挤出弹窗边界**：弹窗 `max-height: 85vh` + 内部没有合理 flex 分配，内容溢出
4. **头部信息层次不清**：标题、分类标签、状态、提交人、时间都堆在一起

## 目标

- 弹窗宽度更宽，充分利用屏幕空间
- 对话区域自适应撑满中间区域（flex: 1），头部和回复框固定
- 回复框始终可见不被挤出
- 视觉层次更清晰

---

## 改动清单

### 文件 1：`src/App.css`

**新增一个专用 class `.feedback-detail-modal`**（在 `.help-modal` 规则附近，约 line 756-759 之后）：

```css
/* 反馈详情弹窗（比 help-modal 更宽，适合对话布局） */
.feedback-detail-modal {
  max-width: 640px !important;
  width: 92vw !important;
  max-height: 88vh !important;
  padding: 20px 24px !important;
}
```

**说明**：不再复用 `.help-modal`，用专用 class 控制尺寸。640px 宽度比当前 560px 宽但不过分铺开，88vh 高度给对话更多空间。

### 文件 2：`src/components/Feedback/Feedback.css`

修改以下已有规则：

**① `.feedback-detail`（约 line 292-298）**
```css
/* 改前 */
.feedback-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  width: 100%;
}

/* 改后 — 增加 flex: 1 + overflow 控制，让它撑满弹窗 body */
.feedback-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
```

**② `.feedback-conversation`（约 line 323-333）**
```css
/* 改前 */
.feedback-conversation {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 50vh;         /* ← 这个是根源，写死了高度 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 2px;
  min-width: 0;
  width: 100%;
}

/* 改后 — 用 flex: 1 自适应，删掉 max-height */
.feedback-conversation {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;            /* flex 子项必须有这个才能正确滚动 */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 6px 4px 2px; /* 右边多留 4px 给滚动条 */
  min-width: 0;
  width: 100%;
}
```

**③ `.feedback-detail-header`（约 line 300-306）**
```css
/* 改前 */
.feedback-detail-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

/* 改后 — 增加 flex-shrink: 0，防止被对话区压缩 */
.feedback-detail-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}
```

**④ `.feedback-reply-box`（约 line 413-419）**
```css
/* 改前 */
.feedback-reply-box {
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 改后 — 增加 flex-shrink: 0，回复框永远不被压缩 */
.feedback-reply-box {
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
```

**⑤ `.feedback-admin-actions`（约 line 455-462）**
```css
/* 改后 — 同理 flex-shrink: 0 */
.feedback-admin-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 0;
  flex-wrap: wrap;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
```

**⑥ `.feedback-closed-note`（约 line 445-452）**
```css
/* 改后 — 同理 */
.feedback-closed-note {
  padding: 10px;
  font-size: 12px;
  text-align: center;
  background: rgba(107, 114, 128, 0.08);
  border-radius: 8px;
  opacity: 0.8;
  flex-shrink: 0;
}
```

### 文件 3：`src/components/Admin/AdminFeedbackPanel.jsx`

**改动 1**：弹窗容器 class 替换（约 line 305-306）

```jsx
{/* 改前 */}
<div
  className="notif-detail-modal glass-card help-modal"
  onClick={(e) => e.stopPropagation()}
>

{/* 改后 — 用专用 class */}
<div
  className="notif-detail-modal glass-card feedback-detail-modal"
  onClick={(e) => e.stopPropagation()}
>
```

**改动 2**：`.notif-detail-body` 也需要 flex: 1（约 line 314）

给 `.notif-detail-body` 加 inline style 或在 CSS 中追加规则。推荐在 `App.css` 的 `.notif-detail-body` 下方追加：

```css
.feedback-detail-modal .notif-detail-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
```

这样 body 会参与 flex 布局，把多余空间全部给对话区域。

---

## 修改文件总览

| 文件 | 改动 |
|------|------|
| `src/App.css` | 新增 `.feedback-detail-modal` class + `.feedback-detail-modal .notif-detail-body` 规则 |
| `src/components/Feedback/Feedback.css` | 修改 6 个已有规则（增加 flex 布局属性） |
| `src/components/Admin/AdminFeedbackPanel.jsx` | 弹窗 class 从 `help-modal` 改为 `feedback-detail-modal` |

总共改 3 个文件，不涉及 JS 逻辑变更，纯 CSS 布局修复。

---

## 验证步骤

1. 超管登录 → 反馈工单 → 点「查看」
2. 弹窗应宽敞居中，不超出屏幕
3. 对话气泡区域占满中间空间，消息多时可滚动
4. 回复框固定在弹窗底部，始终完整可见
5. 含图片的消息不溢出气泡
6. 切到夜间模式确认样式正常
7. 窗口缩到 768px 宽度时弹窗仍可用（92vw 兜底）
8. 「已关闭」状态的工单：回复框被「工单已关闭」提示替代，不溢出
