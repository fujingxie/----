# 反馈详情弹窗 Portal 修复

## 问题

反馈详情弹窗渲染在 AdminConsole → CollapsiblePanel 的 DOM 内部。父级元素存在 `backdrop-filter` / `transform` 等 CSS 属性，会创建新的层叠上下文（containing block），导致弹窗的 `position: fixed` 被"困住"，无法正确覆盖全屏。

## 解法

用 `ReactDOM.createPortal` 把弹窗渲染到 `document.body`，彻底脱离父级 DOM 树。

## 改动

**只改一个文件**：`src/components/Admin/AdminFeedbackPanel.jsx`

### 步骤 1：顶部增加 import

在文件第 1 行的 `import React` 旁边，加上 `ReactDOM`：

```jsx
// 改前（约 line 1）
import React, { useCallback, useEffect, useMemo, useState } from 'react';

// 改后
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
```

### 步骤 2：用 createPortal 包裹弹窗

找到详情 Modal 部分（约 line 301-347），把整个弹窗用 `ReactDOM.createPortal` 包一层：

```jsx
      {/* 详情 Modal */}
      {selectedTicket ? ReactDOM.createPortal(
        <div className="modal-overlay feedback-modal-overlay" onClick={closeTicket}>
          <div
            className="notif-detail-modal glass-card feedback-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notif-detail-header">
              <h3 style={{ margin: 0, fontSize: 16 }}>反馈详情 #{selectedTicket.id}</h3>
              <button className="icon-btn" onClick={closeTicket} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="notif-detail-body">
              {loadingDetail ? (
                <div className="feedback-empty">加载中…</div>
              ) : detailError ? (
                <div className="feedback-form-error">{detailError}</div>
              ) : (
                <FeedbackDetail
                  ticket={selectedTicket}
                  messages={detailMessages}
                  role="admin"
                  onReply={handleReply}
                  adminActions={
                    <div className="feedback-admin-actions">
                      <label>状态：</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                      >
                        <option value="open">待处理</option>
                        <option value="in_progress">处理中</option>
                        <option value="resolved">已解决</option>
                        <option value="closed">已关闭</option>
                      </select>
                      <span style={{ fontSize: 11, opacity: 0.55 }}>
                        修改状态会记录到超管操作日志
                      </span>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
```

**改动要点**：
- 原来：`{selectedTicket ? (<div className="modal-overlay ..."> ... </div>) : null}`
- 改后：`{selectedTicket ? ReactDOM.createPortal(<div className="modal-overlay ..."> ... </div>, document.body) : null}`

就是在外面包了一层 `ReactDOM.createPortal(...)` ，第二个参数是 `document.body`。弹窗的内容、class、事件全部不变。

## 不需要改的

- `App.css` — 不需要改
- `Feedback.css` — 不需要改
- 上一轮的 CSS 改动（flex 布局修复）全部保留，不要回退

## 验证

1. 超管登录 → 反馈工单 → 点「查看」
2. 弹窗应全屏居中，遮罩覆盖整个页面，不被父级面板截断
3. 对话区域可滚动，回复框固定在底部
4. 点遮罩区域或 × 按钮能正常关闭
5. 关闭后回到反馈列表，列表正常显示
