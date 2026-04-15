import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crown, Search, Trophy } from 'lucide-react';
import { getPetNameById } from '../../api/petLibrary';
import {
  fetchAdminClassSettings,
  fetchAdminClassStudents,
  fetchAdminUserClasses,
  fetchAdminStudentLogs,
  updateAdminStudent,
} from '../../api/client';

const DEFAULT_THRESHOLDS = [10, 20, 30, 50, 70, 100];

const PET_STATUS_LABEL = {
  egg: '待唤醒',
  active: '已激活',
  'active-egg': '已激活',
};

const AdminUserDetail = ({ user, adminId, onBack }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [searchName, setSearchName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 日志弹框状态
  const [logStudent, setLogStudent] = useState(null);
  const [studentLogs, setStudentLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsOffset, setLogsOffset] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const LOGS_PAGE_SIZE = 30;

  // 编辑弹框状态
  const [editingStudent, setEditingStudent] = useState(null);
  const [editTotalExp, setEditTotalExp] = useState('');
  const [editLifetimeExp, setEditLifetimeExp] = useState('');
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 加载班级列表
  useEffect(() => {
    if (!user?.id) return;
    fetchAdminUserClasses({ adminId, userId: user.id })
      .then((res) => {
        const list = res.classes || [];
        setClasses(list);
        if (list.length > 0) setSelectedClassId(list[0].id);
      })
      .catch((e) => setErrorMsg(e.message));
  }, [adminId, user?.id]);

  // 加载班级学生和设置
  const loadClassData = useCallback(async (classId) => {
    if (!classId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [studentsRes, settingsRes] = await Promise.all([
        fetchAdminClassStudents({ adminId, classId }),
        fetchAdminClassSettings({ adminId, classId }),
      ]);
      setStudents(studentsRes.students || []);
      setThresholds(settingsRes.level_thresholds || DEFAULT_THRESHOLDS);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    if (selectedClassId) loadClassData(selectedClassId);
  }, [selectedClassId, loadClassData]);

  // 过滤后的学生列表
  const filteredStudents = useMemo(() => {
    const q = searchName.trim();
    if (!q) return students;
    return students.filter((s) => s.name.includes(q));
  }, [students, searchName]);

  // 战力榜 Top10
  const battleRanking = useMemo(
    () => [...students].sort((a, b) => (b.lifetime_exp || 0) - (a.lifetime_exp || 0)).slice(0, 10),
    [students],
  );

  // 打开日志弹框
  const openLogs = async (student) => {
    setLogStudent(student);
    setStudentLogs([]);
    setLogsTotal(0);
    setLogsOffset(0);
    setIsLoadingLogs(true);
    try {
      const res = await fetchAdminStudentLogs({ adminId, studentId: student.id, limit: LOGS_PAGE_SIZE, offset: 0 });
      setStudentLogs(res.logs || []);
      setLogsTotal(res.total || 0);
      setLogsOffset(LOGS_PAGE_SIZE);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const loadMoreLogs = async () => {
    if (!logStudent || isLoadingLogs) return;
    setIsLoadingLogs(true);
    try {
      const res = await fetchAdminStudentLogs({ adminId, studentId: logStudent.id, limit: LOGS_PAGE_SIZE, offset: logsOffset });
      setStudentLogs((prev) => [...prev, ...(res.logs || [])]);
      setLogsOffset((prev) => prev + LOGS_PAGE_SIZE);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const closeLogs = () => setLogStudent(null);

  // 打开编辑弹框
  const openEdit = (student) => {
    setEditingStudent(student);
    setEditTotalExp(String(student.total_exp || 0));
    setEditLifetimeExp(String(student.lifetime_exp || 0));
    setEditError('');
  };

  const closeEdit = () => {
    setEditingStudent(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    const totalExp = Number(editTotalExp);
    const lifetimeExp = Number(editLifetimeExp);
    if (Number.isNaN(totalExp) || totalExp < 0) {
      setEditError('本宠经验必须为非负整数');
      return;
    }
    if (Number.isNaN(lifetimeExp) || lifetimeExp < 0) {
      setEditError('累积经验必须为非负整数');
      return;
    }
    if (lifetimeExp < totalExp) {
      setEditError('累积经验不能小于本宠经验');
      return;
    }
    setIsSaving(true);
    setEditError('');
    try {
      const res = await updateAdminStudent({
        adminId,
        studentId: editingStudent.id,
        totalExp,
        lifetimeExp,
      });
      setStudents((prev) => prev.map((s) => (s.id === editingStudent.id ? res.student : s)));
      closeEdit();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-user-detail">
      {/* 顶部导航 */}
      <div className="aud-header">
        <button className="aud-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          返回账户列表
        </button>
        <div className="aud-title">
          <span className="aud-label">账户</span>
          <strong>{user.nickname || user.username}</strong>
          <span className="aud-username">@{user.username}</span>
        </div>
      </div>

      {/* 班级选择 + 搜索 */}
      <div className="aud-toolbar glass-card">
        <div className="aud-toolbar-left">
          <label className="aud-field">
            <span>班级</span>
            <select
              className="glass-input"
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
            >
              {classes.length === 0 && <option value="">（暂无班级）</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.student_count} 人）
                </option>
              ))}
            </select>
          </label>
          <label className="aud-field aud-search">
            <Search size={14} />
            <input
              className="glass-input"
              placeholder="搜索学生姓名"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </label>
        </div>
      </div>

      {errorMsg && <div className="aud-error">{errorMsg}</div>}

      {/* 进化规则 + 战力榜 */}
      <div className="aud-panels">
        <div className="aud-panel glass-card">
          <div className="aud-panel-title">
            <Trophy size={15} />
            宠物进化规则
          </div>
          <div className="aud-thresholds">
            {thresholds.map((exp, idx) => (
              <div key={idx} className="aud-threshold-row">
                <span className="aud-lv">Lv.{idx + 1}</span>
                <span className="aud-arrow">→</span>
                <span className="aud-exp">{exp} EXP</span>
              </div>
            ))}
          </div>
        </div>

        <div className="aud-panel glass-card">
          <div className="aud-panel-title">
            <Crown size={15} />
            班级战力榜（Top 10）
          </div>
          {battleRanking.length === 0 ? (
            <div className="aud-empty">暂无数据</div>
          ) : (
            <div className="aud-ranking">
              {battleRanking.map((s, idx) => (
                <div key={s.id} className="aud-rank-row">
                  <span className={`aud-rank-num ${idx < 3 ? `top${idx + 1}` : ''}`}>#{idx + 1}</span>
                  <span className="aud-rank-name">{s.name}</span>
                  <span className="aud-rank-exp">{s.lifetime_exp || 0} EXP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 学生列表 */}
      <div className="aud-table-wrap glass-card">
        {isLoading ? (
          <div className="aud-loading">加载中...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="aud-empty">
            {searchName ? `未找到「${searchName}」` : '该班级暂无学生'}
          </div>
        ) : (
          <table className="aud-table">
            <thead>
              <tr>
                <th>学生姓名</th>
                <th>状态</th>
                <th>当前宠物</th>
                <th>毕业数</th>
                <th>本宠经验</th>
                <th>累积经验</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>
                    <span className={`student-admin-status ${s.pet_status === 'egg' ? 'egg' : 'active'}`}>
                      {PET_STATUS_LABEL[s.pet_status] || s.pet_status}
                    </span>
                  </td>
                  <td>
                    {s.pet_status === 'egg'
                      ? '神秘蛋'
                      : `${getPetNameById(s.pet_type_id)} Lv.${s.pet_level || 0}`}
                  </td>
                  <td>🎓 {s.graduated_count || 0}</td>
                  <td>⭐ {s.total_exp || 0}</td>
                  <td>🏆 {s.lifetime_exp || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        className="confirm-btn micro"
                        onClick={() => openEdit(s)}
                        type="button"
                      >
                        编辑经验
                      </button>
                      <button
                        className="confirm-btn micro"
                        onClick={() => openLogs(s)}
                        type="button"
                        style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
                      >
                        查看日志
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 日志弹框 */}
      {logStudent && (
        <div className="modal-overlay" onClick={closeLogs}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>加减分日志 — {logStudent.name}</h3>
              <button className="icon-btn" onClick={closeLogs} type="button">✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {studentLogs.length === 0 && !isLoadingLogs ? (
                <div className="aud-empty">暂无日志记录</div>
              ) : (
                <table className="aud-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>规则</th>
                      <th>经验变化</th>
                      <th>变化后经验</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, opacity: 0.6 }}>
                          {new Date(log.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <span>{log.ruleIcon} {log.ruleName}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: log.expDelta > 0 ? '#22c55e' : log.expDelta < 0 ? '#f87171' : undefined }}>
                          {log.expDelta > 0 ? `+${log.expDelta}` : log.expDelta}
                        </td>
                        <td>{log.expAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {isLoadingLogs && <div className="aud-loading">加载中...</div>}
              {!isLoadingLogs && studentLogs.length < logsTotal && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <button className="confirm-btn micro" onClick={loadMoreLogs} type="button">加载更多</button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 10 }}>共 {logsTotal} 条记录</div>
          </div>
        </div>
      )}

      {/* 编辑弹框 */}
      {editingStudent && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3 style={{ marginBottom: 16 }}>编辑经验值 — {editingStudent.name}</h3>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                本宠经验（当前宠物，毕业后归零）
              </span>
              <input
                className="glass-input"
                type="number"
                min="0"
                value={editTotalExp}
                onChange={(e) => setEditTotalExp(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 4 }}>
                累积经验（历史总经验，不得低于本宠经验）
              </span>
              <input
                className="glass-input"
                type="number"
                min="0"
                value={editLifetimeExp}
                onChange={(e) => setEditLifetimeExp(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            {editError && (
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{editError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="confirm-btn"
                onClick={closeEdit}
                type="button"
                style={{ background: 'transparent' }}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleSaveEdit}
                disabled={isSaving}
                type="button"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetail;
