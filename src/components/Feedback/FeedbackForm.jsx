import React, { useCallback, useRef, useState } from 'react';
import { compressImageToDataUrl } from '../../lib/imageCompress';
import { createFeedback } from '../../api/client';
import './Feedback.css';

/**
 * 教师提交反馈表单
 * @param {{ userId: number, onCreated: () => void, onCancel: () => void }} props
 */
const FeedbackForm = ({ userId, onCreated, onCancel }) => {
  const [category, setCategory] = useState('bug');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageData, setImageData] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleImageFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setError('只能上传图片格式');
      return;
    }
    try {
      setCompressing(true);
      setError('');
      const dataUrl = await compressImageToDataUrl(file);
      setImageData(dataUrl);
    } catch (e) {
      // 压缩失败：给出明确反馈
      console.error('[DEBUG] compressImageToDataUrl failed:', e);
      setError(e?.message || '图片处理失败');
    } finally {
      setCompressing(false);
    }
  }, []);

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((i) => i.type && i.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      handleImageFile(file);
    }
  }, [handleImageFile]);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  }, [handleImageFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      setError('请填写标题');
      return;
    }
    if (!trimmedContent && !imageData) {
      setError('正文和图片至少填一项');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await createFeedback({
        userId,
        category,
        title: trimmedTitle,
        content: trimmedContent,
        imageData: imageData || null,
      });
      onCreated?.();
    } catch (err) {
      console.error('[DEBUG] createFeedback failed:', err);
      setError(err?.message || '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      <div className="feedback-form-field">
        <label>类别</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="bug">🐛 Bug（功能故障）</option>
          <option value="feature">💡 功能建议</option>
          <option value="question">❓ 使用问题</option>
        </select>
      </div>

      <div className="feedback-form-field">
        <label>标题（必填，简要概括问题）</label>
        <input
          type="text"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：扣分按钮偶尔点不开"
        />
      </div>

      <div className="feedback-form-field">
        <label>正文（可描述复现步骤 / 具体建议）</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          maxLength={5000}
          placeholder="详细描述你遇到的问题或建议。可以直接在此粘贴截图（Cmd/Ctrl + V）。"
        />
        <div className="feedback-paste-hint">支持 Cmd/Ctrl + V 粘贴截图（自动压缩到 500KB 以内）</div>
      </div>

      <div className="feedback-form-field">
        <label>图片（可选）</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />
        {!imageData ? (
          <button
            type="button"
            className="feedback-btn-cancel"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
            style={{ alignSelf: 'flex-start' }}
          >
            {compressing ? '正在压缩…' : '选择图片'}
          </button>
        ) : (
          <div className="feedback-image-preview-wrap">
            <img src={imageData} alt="预览" className="feedback-image-preview" />
            <button
              type="button"
              className="feedback-image-remove"
              onClick={() => setImageData('')}
              title="移除图片"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {error ? <div className="feedback-form-error">{error}</div> : null}

      <div className="feedback-form-actions">
        <button type="button" className="feedback-btn-cancel" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="feedback-submit-btn" disabled={submitting || compressing}>
          {submitting ? '提交中…' : '提交反馈'}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;
