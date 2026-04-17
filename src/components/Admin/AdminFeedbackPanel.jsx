import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  fetchAdminFeedback,
  fetchAdminFeedbackDetail,
  replyAdminFeedback,
  updateAdminFeedbackStatus,
} from '../../api/client';
import FeedbackDetail from '../Feedback/FeedbackDetail';
import '../Feedback/Feedback.css';

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

const PAGE_SIZE = 20;

function formatDateTime(iso) {
  if (!iso) return '';
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T');
  const withZ = normalized.endsWith('Z') ? normalized : `${normalized}Z`;
  const d = new Date(withZ);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 超管反馈工单管理面板
 * @param {{ currentUser: { id: number }, onUnreadChange?: (count:number)=>void }} props
 */
const AdminFeedbackPanel = ({ currentUser, onUnreadChange }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailMessages, setDetailMessages] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const loadList = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await fetchAdminFeedback({
        userId: currentUser.id,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setTickets(res?.tickets || []);
      if (onUnreadChange) onUnreadChange(res?.unread_count || 0);
    } catch (e) {
      console.error('[DEBUG] fetchAdminFeedback failed:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, statusFilter, categoryFilter, onUnreadChange]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / PAGE_SIZE));
  const pagedTickets = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tickets.slice(start, start + PAGE_SIZE);
  }, [tickets, page]);

  const openTicket = useCallback(async (ticket) => {
    try {
      setLoadingDetail(true);
      setDetailError('');
      setSelectedTicket(ticket);
      setDetailMessages([]);
      const detail = await fetchAdminFeedbackDetail({
        userId: currentUser.id,
        ticketId: ticket.id,
      });
      setSelectedTicket(detail.ticket);
      setDetailMessages(detail.messages || []);
      // 本地清 admin_has_unread_reply
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, admin_has_unread_reply: false } : t)),
      );
      if (onUnreadChange) {
        // 重新计算未读
        const newUnread = tickets.reduce(
          (acc, t) => acc + ((t.id === ticket.id ? 0 : t.admin_has_unread_reply ? 1 : 0)),
          0,
        );
        onUnreadChange(newUnread);
      }
    } catch (e) {
      console.error('[DEBUG] fetchAdminFeedbackDetail failed:', e);
      setDetailError(e?.message || '加载详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, [currentUser?.id, tickets, onUnreadChange]);

  const closeTicket = useCallback(() => {
    setSelectedTicket(null);
    setDetailMessages([]);
    // 刷新列表拿最新的 updated_at / message_count
    loadList();
  }, [loadList]);

  const handleReply = useCallback(async ({ content, imageData }) => {
    if (!selectedTicket) return;
    await replyAdminFeedback({
      userId: currentUser.id,
      ticketId: selectedTicket.id,
      content,
      imageData,
    });
    // 重新拉详情以获取新消息
    const detail = await fetchAdminFeedbackDetail({
      userId: currentUser.id,
      ticketId: selectedTicket.id,
    });
    setSelectedTicket(detail.ticket);
    setDetailMessages(detail.messages || []);
  }, [currentUser?.id, selectedTicket]);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!selectedTicket) return;
    try {
      await updateAdminFeedbackStatus({
        userId: currentUser.id,
        ticketId: selectedTicket.id,
        status: newStatus,
      });
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t)),
      );
    } catch (e) {
      console.error('[DEBUG] updateAdminFeedbackStatus failed:', e);
      alert(e?.message || '状态更新失败');
    }
  }, [currentUser?.id, selectedTicket]);

  return (
    <div className="admin-notif-section">
      {/* 过滤条 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <label className="admin-field" style={{ minWidth: 140 }}>
          <span>分类</span>
          <select
            className="glass-input compact"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">全部分类</option>
            <option value="bug">🐛 Bug</option>
            <option value="feature">💡 功能建议</option>
            <option value="question">❓ 使用问题</option>
          </select>
        </label>
        <label className="admin-field" style={{ minWidth: 140 }}>
          <span>状态</span>
          <select
            className="glass-input compact"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="open">待处理</option>
            <option value="in_progress">处理中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </select>
        </label>
        <button
          type="button"
          className="confirm-btn micro"
          onClick={loadList}
          disabled={loading}
          style={{ alignSelf: 'flex-end' }}
        >
          {loading ? '加载中…' : '刷新'}
        </button>
      </div>

      {/* 表格 */}
      <div className="admin-table-shell">
        <table className="admin-table admin-notif-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>提交人</th>
              <th>消息数</th>
              <th>最后更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pagedTickets.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-table-empty">
                  {loading ? '加载中…' : '暂无反馈'}
                </td>
              </tr>
            ) : (
              pagedTickets.map((t) => (
                <tr key={t.id}>
                  <td title={t.title}>
                    <span className="admin-cell" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {t.admin_has_unread_reply ? (
                        <span className="feedback-unread-dot" />
                      ) : null}
                      {t.title}
                    </span>
                  </td>
                  <td>
                    <span className={`feedback-category-tag ${t.category}`}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                  </td>
                  <td>
                    <span className={`feedback-status-badge ${t.status}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td>
                    <span className="admin-cell admin-cell-nowrap">{t.user_name}</span>
                  </td>
                  <td>
                    <span className="admin-cell admin-cell-nowrap">{t.message_count}</span>
                  </td>
                  <td>
                    <span className="admin-cell admin-cell-nowrap">{formatDateTime(t.updated_at)}</span>
                  </td>
                  <td>
                    <button
                      className="confirm-btn micro"
                      onClick={() => openTicket(t)}
                      type="button"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="admin-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            上一页
          </button>
          <span className="admin-pagination-status">
            第 {page} / {totalPages} 页
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            下一页
          </button>
        </div>
      ) : null}

      {/* 详情 Modal */}
      {selectedTicket ? createPortal(
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
        document.body,
      ) : null}
    </div>
  );
};

export default AdminFeedbackPanel;
