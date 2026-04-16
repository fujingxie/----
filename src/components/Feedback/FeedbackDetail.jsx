import React, { useCallback, useEffect, useRef, useState } from 'react';
import { compressImageToDataUrl } from '../../lib/imageCompress';
import './Feedback.css';

const CATEGORY_LABELS = {
  bug: 'Bug',
  feature: '功能建议',
  question: '使用问题',
};

const STATUS_LABELS = {
  open: '待处理',
  in_progress: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

function formatAbsoluteTime(isoStr) {
  if (!isoStr) return '';
  const normalized = isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T');
  const withZ = normalized.endsWith('Z') ? normalized : `${normalized}Z`;
  const date = new Date(withZ);
  if (Number.isNaN(date.getTime())) return isoStr;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 反馈工单对话详情（教师端 / 超管端共用）
 *
 * @param {{
 *   ticket: object,
 *   messages: Array,
 *   role: 'user' | 'admin',
 *   onReply: ({ content, imageData }) => Promise<void>,
 *   adminActions?: React.ReactNode  // 超管专用：状态变更按钮条
 * }} props
 */
const FeedbackDetail = ({ ticket, messages, role, onReply, adminActions }) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const isClosed = ticket?.status === 'closed';

  // 新消息时滚到底部
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages?.length]);

  const handleImageFile = useCallback(async (file) => {
    if (!file || !file.type?.startsWith('image/')) {
      setError('只能上传图片');
      return;
    }
    try {
      setCompressing(true);
      setError('');
      const dataUrl = await compressImageToDataUrl(file);
      setReplyImage(dataUrl);
    } catch (e) {
      console.error('[DEBUG] reply compress failed:', e);
      setError(e?.message || '图片处理失败');
    } finally {
      setCompressing(false);
    }
  }, []);

  const handlePaste = useCallback((e) => {
    const imgItem = Array.from(e.clipboardData?.items || []).find(
      (i) => i.type && i.type.startsWith('image/'),
    );
    if (imgItem) {
      e.preventDefault();
      handleImageFile(imgItem.getAsFile());
    }
  }, [handleImageFile]);

  const handleSend = async () => {
    const trimmed = replyContent.trim();
    if (!trimmed && !replyImage) {
      setError('请填写回复内容或附上图片');
      return;
    }
    try {
      setSending(true);
      setError('');
      await onReply({ content: trimmed, imageData: replyImage || null });
      setReplyContent('');
      setReplyImage('');
    } catch (e) {
      console.error('[DEBUG] feedback reply failed:', e);
      setError(e?.message || '发送失败，请重试');
    } finally {
      setSending(false);
    }
  };

  if (!ticket) return null;

  return (
    <div className="feedback-detail">
      <div className="feedback-detail-header">
        <h3 className="feedback-detail-title">{ticket.title}</h3>
        <div className="feedback-detail-meta">
          <span className={`feedback-category-tag ${ticket.category}`}>
            {CATEGORY_LABELS[ticket.category] || ticket.category}
          </span>
          <span className={`feedback-status-badge ${ticket.status}`}>
            {STATUS_LABELS[ticket.status] || ticket.status}
          </span>
          {role === 'admin' && ticket.user_name ? (
            <span>提交人：{ticket.user_name}</span>
          ) : null}
          <span>创建：{formatAbsoluteTime(ticket.created_at)}</span>
        </div>
      </div>

      {adminActions}

      <div className="feedback-conversation">
        {(messages || []).map((m) => (
          <div key={m.id} className={`feedback-bubble-row ${m.sender_role}`}>
            <div className="feedback-bubble">
              <div className="feedback-bubble-sender">
                {m.sender_role === 'admin' ? (
                  <>
                    <span className="official-tag">官方</span>
                    <span>{m.sender_name || '官方'}</span>
                  </>
                ) : (
                  <span>{m.sender_name || '我'}</span>
                )}
              </div>
              {m.content ? <div>{m.content}</div> : null}
              {m.image_data ? (
                <img
                  src={m.image_data}
                  alt="附件"
                  className="feedback-bubble-image"
                  onClick={() => window.open(m.image_data, '_blank')}
                />
              ) : null}
              <div className="feedback-bubble-time">{formatAbsoluteTime(m.created_at)}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isClosed ? (
        <div className="feedback-closed-note">
          工单已关闭。如有新问题欢迎重新提交。
        </div>
      ) : (
        <div className="feedback-reply-box">
          <textarea
            className="feedback-reply-textarea"
            placeholder={role === 'admin' ? '回复教师（支持粘贴图片）…' : '继续描述或补充信息（支持粘贴图片）…'}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onPaste={handlePaste}
            maxLength={5000}
          />
          {replyImage ? (
            <div className="feedback-image-preview-wrap">
              <img src={replyImage} alt="附件预览" className="feedback-image-preview" />
              <button
                type="button"
                className="feedback-image-remove"
                onClick={() => setReplyImage('')}
              >
                ×
              </button>
            </div>
          ) : null}
          {error ? <div className="feedback-form-error">{error}</div> : null}
          <div className="feedback-reply-actions">
            <span className="feedback-paste-hint">
              {compressing ? '图片压缩中…' : 'Cmd/Ctrl + V 可粘贴截图'}
            </span>
            <button
              type="button"
              className="feedback-submit-btn"
              onClick={handleSend}
              disabled={sending || compressing}
            >
              {sending ? '发送中…' : '发送'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackDetail;
