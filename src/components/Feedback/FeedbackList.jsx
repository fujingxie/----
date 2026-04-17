import React from 'react';
import './Feedback.css';

const CATEGORY_LABELS = {
  bug: 'Bug',
  feature: '建议',
  question: '疑问',
};

const STATUS_LABELS = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  // D1 返回的字符串缺 'Z'，视为 UTC
  const normalized = isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T');
  const withZ = normalized.endsWith('Z') ? normalized : `${normalized}Z`;
  const date = new Date(withZ);
  if (Number.isNaN(date.getTime())) return isoStr;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

/**
 * 教师的反馈工单列表
 * @param {{ tickets: Array, onSelect: (ticket)=>void, onCreate: ()=>void, onDelete?: (ticketId:number)=>void, loading?: boolean }} props
 */
const FeedbackList = ({ tickets, onSelect, onCreate, onDelete, loading }) => {
  return (
    <div className="feedback-root">
      <div className="feedback-list-header">
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {loading ? '加载中…' : `共 ${tickets.length} 条`}
        </span>
        <button type="button" className="feedback-submit-btn" onClick={onCreate}>
          ＋ 提交反馈
        </button>
      </div>

      {tickets.length === 0 && !loading ? (
        <div className="feedback-empty">
          还没有提交过反馈。遇到 Bug、有建议或使用疑问，点右上角「＋ 提交反馈」吧。
        </div>
      ) : (
        <div className="feedback-list">
          {tickets.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              className={`feedback-list-item ${t.user_has_unread_reply ? 'unread' : ''}`}
              onClick={() => onSelect(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(t);
                }
              }}
            >
              <div className="feedback-list-item-top">
                {t.user_has_unread_reply ? <span className="feedback-unread-dot" /> : null}
                <span className="feedback-list-item-title">{t.title}</span>
                {t.status === 'closed' && onDelete ? (
                  <button
                    className="feedback-delete-btn"
                    type="button"
                    title="删除工单"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(t.id);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="feedback-list-item-meta">
                <span className={`feedback-category-tag ${t.category}`}>
                  {CATEGORY_LABELS[t.category] || t.category}
                </span>
                <span className={`feedback-status-badge ${t.status}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
                <span>{t.message_count} 条消息</span>
                <span>· {formatRelativeTime(t.updated_at)}</span>
              </div>
              {t.last_message_preview ? (
                <div className="feedback-list-item-preview">{t.last_message_preview}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackList;
