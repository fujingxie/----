import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../Common/Modal';
import { fetchStudentLogs } from '../../api/client';
import './StudentLogModal.css';

const formatLogDate = (dateString, filter = 'time') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  if (filter === 'date') {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今天 ' + date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天 ' + date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const StudentLogModal = ({ isOpen, onClose, student, currentClass, onInteraction }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeFilter, setActiveFilter] = useState('all'); // all, positive, negative, redeem, system

  const loadLogs = React.useCallback(async (isLoadMore = false, currentLogsLen = 0) => {
    if (!student || !currentClass) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const offset = isLoadMore ? currentLogsLen : 0;
      const res = await fetchStudentLogs({
        classId: currentClass.id,
        studentId: student.id,
        limit: 30,
        offset
      });
      
      setLogs((prev) => isLoadMore ? [...prev, ...(res.logs || [])] : (res.logs || []));
      setTotal(res.total || 0);
      setHasMore(res.hasMore || false);
    } catch (err) {
      setError(err.message || '加载奖惩记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [student, currentClass]);

  useEffect(() => {
    if (isOpen && student && currentClass) {
      loadLogs(false, 0);
      setActiveFilter('all');
    }
  }, [isOpen, student, currentClass, loadLogs]);

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return logs;
    return logs.filter((log) => {
      if (activeFilter === 'positive') return log.expDelta > 0;
      if (activeFilter === 'negative') return log.expDelta < 0 || log.coinsDelta < 0;
      if (activeFilter === 'redeem') return log.action === 'redeem';
      if (activeFilter === 'system') return ['decay', 'bulk_feed', 'system'].includes(log.action);
      return true;
    });
  }, [logs, activeFilter]);

  const logsByDate = useMemo(() => {
    const groups = {};
    filteredLogs.forEach(log => {
      const dateKey = formatLogDate(log.createdAt, 'date');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const stats = useMemo(() => {
    let positiveCount = 0;
    let negativeCount = 0;
    let totalExpDelta = 0;
    let totalCoinsDelta = 0;

    logs.forEach(log => {
      if (log.expDelta > 0 && log.action !== 'redeem') positiveCount++;
      if ((log.expDelta < 0 || log.coinsDelta < 0) && log.action !== 'redeem') negativeCount++;
      totalExpDelta += log.expDelta;
      totalCoinsDelta += (log.action === 'redeem' ? 0 : log.coinsDelta); 
    });

    return { positiveCount, negativeCount, totalExpDelta, totalCoinsDelta };
  }, [logs]);

  const filterOptions = [
    { id: 'all', label: '全部' },
    { id: 'positive', label: '奖励' },
    { id: 'negative', label: '惩罚/扣分' },
    { id: 'redeem', label: '兑换记录' },
    { id: 'system', label: '系统通知' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${student?.name} 的成长记录 (${total})`}
      contentClassName="student-log-modal-shell"
      bodyClassName="student-log-modal-body"
    >
      <div className="student-log-modal">
        <div className="student-log-layout">
          <div className="student-log-main">
            <div className="student-log-filters">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  className={`student-log-filter ${activeFilter === option.id ? 'active' : ''}`}
                  onClick={() => setActiveFilter(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

            {error && <div className="student-log-error">{error}</div>}

            <div className="student-log-timeline">
              {Object.keys(logsByDate).length === 0 && !isLoading && !error && (
                <div className="student-log-empty">
                  <div className="empty-emoji">🌱</div>
                  <p>这里还是一片空白，开始第一次互动吧！</p>
                  {onInteraction && (
                    <button className="empty-action-btn" onClick={() => { onClose(); onInteraction(student); }} type="button">
                      去课堂互动
                    </button>
                  )}
                </div>
              )}

              {Object.entries(logsByDate).map(([dateKey, groupLogs]) => (
                <div key={dateKey} className="timeline-group">
                  <h4 className="timeline-date-label">
                    <span className="timeline-date-line"></span>
                    {dateKey}
                  </h4>
                  <div className="timeline-items">
                    {groupLogs.map(log => {
                      const isPositive = log.expDelta > 0;
                      const isNegative = log.expDelta < 0 || log.coinsDelta < 0;
                      const isRedeem = log.action === 'redeem';
                      
                      let entryClass = 'neutral';
                      if (isRedeem) entryClass = 'redeem';
                      else if (isPositive) entryClass = 'positive';
                      else if (isNegative) entryClass = 'negative';

                      return (
                        <div key={log.id} className={`timeline-entry type-${entryClass}`}>
                          <div className="timeline-time">{formatLogDate(log.createdAt, 'time')}</div>
                          <div className="timeline-content glass-card">
                            <div className="timeline-header">
                              <span className="timeline-rule-icon">{log.ruleIcon || '✨'}</span>
                              <strong className="timeline-rule-name">{log.ruleName || '未知操作'}</strong>
                            </div>
                            <div className="timeline-deltas">
                              {log.expDelta !== 0 && (
                                <span className={`delta exp ${log.expDelta > 0 ? 'plus' : 'minus'}`}>
                                  {log.expDelta > 0 ? '+' : ''}{log.expDelta} EXP
                                </span>
                              )}
                              {log.coinsDelta !== 0 && (
                                <span className={`delta coins ${log.coinsDelta > 0 ? 'plus' : 'minus'}`}>
                                  {log.coinsDelta > 0 ? '+' : ''}{log.coinsDelta} 💰
                                </span>
                              )}
                            </div>
                            <div className="timeline-footer">
                              Lv.{log.levelAfter || student?.pet_level || 0} → 总计 {log.expAfter} EXP / 余额 {log.coinsAfter} 💰
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasMore && (
                <button 
                  className="timeline-load-more" 
                  onClick={() => loadLogs(true, logs.length)} 
                  disabled={isLoading}
                  type="button"
                >
                  {isLoading ? '加载中...' : '加载更多记录'}
                </button>
              )}
            </div>
          </div>

          <aside className="student-log-aside glass-card">
            <h4>累计统计</h4>
            <div className="student-stats-grid">
              <div className="stat-card">
                <span>总奖励次数</span>
                <strong className="positive">{stats.positiveCount}</strong>
              </div>
              <div className="stat-card">
                <span>总惩罚/扣分</span>
                <strong className="negative">{stats.negativeCount}</strong>
              </div>
              <div className="stat-card">
                <span>净获取经验</span>
                <strong className={stats.totalExpDelta >= 0 ? 'positive' : 'negative'}>
                  {stats.totalExpDelta > 0 ? '+' : ''}{stats.totalExpDelta} EXP
                </strong>
              </div>
              <div className="stat-card">
                <span>净获取金币</span>
                <strong className={stats.totalCoinsDelta >= 0 ? 'positive' : 'negative'}>
                  {stats.totalCoinsDelta > 0 ? '+' : ''}{stats.totalCoinsDelta} 💰
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
};

export default StudentLogModal;
