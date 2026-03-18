import React, { useMemo, useState } from 'react';
import './AdminConsole.css';
import { ArrowDownUp, CheckSquare, Copy, Download, History, KeyRound, Shield, Square, Ticket, Users, X } from 'lucide-react';

const EMPTY_CODE_FORM = {
  code: '',
  prefix: 'CLASS',
  level: 'vip1',
  expires_in_days: '30',
  max_uses: '1',
};

const EMPTY_BATCH_FORM = {
  prefix: 'CLASS',
  level: 'vip1',
  expires_in_days: '30',
  max_uses: '1',
  count: '10',
};

const formatExpire = (value) => (value ? value : '长期有效');

const USER_LEVEL_OPTIONS = [
  { value: 'temporary', label: '临时体验' },
  { value: 'vip1', label: '会员一级' },
  { value: 'vip2', label: '会员二级' },
  { value: 'permanent', label: '永久会员' },
];

const USER_ROLE_OPTIONS = [
  { value: 'teacher', label: '教师账号' },
  { value: 'super_admin', label: '超管账号' },
];

const USER_STATUS_OPTIONS = [
  { value: 'active', label: '启用中' },
  { value: 'disabled', label: '已停用' },
];

const USER_REGISTER_SOURCE_OPTIONS = [
  { value: 'all', label: '全部来源' },
  { value: 'activation_code', label: '激活码注册' },
  { value: 'free_register', label: '免激活注册' },
];

const CODE_LEVEL_OPTIONS = [
  { value: 'vip1', label: '会员一级' },
  { value: 'vip2', label: '会员二级' },
  { value: 'permanent', label: '永久会员' },
];

const CODE_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '未使用' },
  { value: 'used', label: '已用完' },
  { value: 'revoked', label: '已作废' },
];

const CODE_LEVEL_FILTER_OPTIONS = [
  { value: 'all', label: '全部等级' },
  { value: 'vip1', label: '会员一级' },
  { value: 'vip2', label: '会员二级' },
  { value: 'permanent', label: '永久会员' },
];

const PAGE_SIZE = 8;

const formatCodeRule = (code) => {
  if (code.expires_in_days === null) {
    return `${code.max_uses} 次 / 长期`;
  }

  return `${code.max_uses} 次 / ${code.expires_in_days} 天`;
};

const getUserLevelLabel = (value) =>
  USER_LEVEL_OPTIONS.find((item) => item.value === value)?.label || value;

const getUserRoleLabel = (value) =>
  USER_ROLE_OPTIONS.find((item) => item.value === value)?.label || value;

const getUserStatusLabel = (value) =>
  USER_STATUS_OPTIONS.find((item) => item.value === value)?.label || value;

const getRegisterSourceLabel = (value) =>
  USER_REGISTER_SOURCE_OPTIONS.find((item) => item.value === value)?.label || value;

const getCodeLevelLabel = (value) =>
  CODE_LEVEL_OPTIONS.find((item) => item.value === value)?.label || value;

const getCodeStatusLabel = (value) =>
  CODE_STATUS_OPTIONS.find((item) => item.value === value)?.label || value;

const formatDateTime = (value) => {
  if (!value) {
    return '暂无';
  }

  return String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 16);
};

const summarizeCode = (value) => {
  if (!value) {
    return '—';
  }

  const parts = String(value).split('-');
  if (parts.length <= 2) {
    return String(value);
  }

  return `${parts.slice(0, 2).join('-')}...${parts[parts.length - 1]}`;
};

const formatAdminLogDetail = (detail) => {
  if (!detail) {
    return '—';
  }

  return String(detail)
    .replace(/temporary/g, '临时体验')
    .replace(/vip1/g, '会员一级')
    .replace(/vip2/g, '会员二级')
    .replace(/permanent/g, '永久会员')
    .replace(/activation_code/g, '激活码注册')
    .replace(/free_register/g, '免激活注册')
    .replace(/until/g, '截止时间')
    .replace(/teacher/g, '教师账号')
    .replace(/super_admin/g, '超管账号')
    .replace(/active/g, '启用中')
    .replace(/disabled/g, '已停用')
    .replace(/revoked/g, '已作废')
    .replace(/used/g, '已用完');
};

function AdminConsole({
  users,
  activationCodes,
  adminLogs,
  freeRegisterConfig,
  isMutating,
  onRefresh,
  onUpdateFreeRegisterConfig,
  onRequestConfirm,
  onUpdateUser,
  onBatchUpdateUsers,
  onResetUserPassword,
  onCreateCode,
  onCreateCodesBatch,
  onUpdateCode,
  onBatchUpdateCodes,
  onBatchRevokeCodes,
}) {
  const [query, setQuery] = useState('');
  const [codeForm, setCodeForm] = useState(EMPTY_CODE_FORM);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH_FORM);
  const [selectedCodeIds, setSelectedCodeIds] = useState([]);
  const [logFilter, setLogFilter] = useState('all');
  const [codeStatusFilter, setCodeStatusFilter] = useState('all');
  const [codeLevelFilter, setCodeLevelFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedCodeId, setSelectedCodeId] = useState(null);
  const [userDraft, setUserDraft] = useState(null);
  const [codeDraft, setCodeDraft] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSort, setUserSort] = useState({ key: 'username', direction: 'asc' });
  const [codeSort, setCodeSort] = useState({ key: 'code', direction: 'asc' });
  const [logQuery, setLogQuery] = useState('');
  const [logDateRange, setLogDateRange] = useState({ start: '', end: '' });
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userLevelFilter, setUserLevelFilter] = useState('all');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSourceFilter, setUserSourceFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const [codePage, setCodePage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [freeRegisterDraft, setFreeRegisterDraft] = useState({
    enabled: Boolean(freeRegisterConfig?.enabled),
    mode: freeRegisterConfig?.mode || 'permanent',
    end_at: freeRegisterConfig?.end_at ? String(freeRegisterConfig.end_at).slice(0, 16) : '',
    default_level: freeRegisterConfig?.default_level || 'temporary',
  });

  const sortBy = (list, { key, direction }) => {
    const factor = direction === 'asc' ? 1 : -1;

    return [...list].sort((left, right) => {
      const a = left?.[key] ?? '';
      const b = right?.[key] ?? '';

      if (typeof a === 'number' && typeof b === 'number') {
        return (a - b) * factor;
      }

      return String(a).localeCompare(String(b), 'zh-Hans-CN', { numeric: true }) * factor;
    });
  };

  const toggleSort = (current, setSort, nextKey) => {
    setSort((prev) =>
      prev.key === nextKey
        ? { key: nextKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key: nextKey, direction: 'asc' },
    );
  };

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const baseList = !keyword
      ? users
      : users.filter((user) =>
          [user.username, user.nickname, user.level, user.role, user.status, user.register_source, user.register_ip, user.same_ip_count]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(keyword)),
        );

    const filterList = baseList.filter((user) => {
      if (userStatusFilter !== 'all' && (user.status || 'active') !== userStatusFilter) {
        return false;
      }

      if (userLevelFilter !== 'all' && user.level !== userLevelFilter) {
        return false;
      }

      if (userRoleFilter !== 'all' && user.role !== userRoleFilter) {
        return false;
      }

      if (userSourceFilter !== 'all' && (user.register_source || 'activation_code') !== userSourceFilter) {
        return false;
      }

      return true;
    });

    return sortBy(filterList, userSort);
  }, [query, users, userSort, userStatusFilter, userLevelFilter, userRoleFilter, userSourceFilter]);

  React.useEffect(() => {
    setFreeRegisterDraft({
      enabled: Boolean(freeRegisterConfig?.enabled),
      mode: freeRegisterConfig?.mode || 'permanent',
      end_at: freeRegisterConfig?.end_at ? String(freeRegisterConfig.end_at).slice(0, 16) : '',
      default_level: freeRegisterConfig?.default_level || 'temporary',
    });
  }, [freeRegisterConfig]);

  const filteredLogs = useMemo(() => {
    const keyword = logQuery.trim().toLowerCase();
    const baseList =
      logFilter === 'all' ? adminLogs : adminLogs.filter((log) => log.action === logFilter);

    const dateFiltered = baseList.filter((log) => {
      const logTime = log.created_at ? new Date(log.created_at).getTime() : NaN;

      if (logDateRange.start) {
        const startTime = new Date(`${logDateRange.start}T00:00:00`).getTime();
        if (Number.isFinite(logTime) && logTime < startTime) {
          return false;
        }
      }

      if (logDateRange.end) {
        const endTime = new Date(`${logDateRange.end}T23:59:59`).getTime();
        if (Number.isFinite(logTime) && logTime > endTime) {
          return false;
        }
      }

      return true;
    });

    if (!keyword) {
      return dateFiltered;
    }

    return dateFiltered.filter((log) =>
      [log.action, log.detail, log.operator, log.created_at]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword)),
    );
  }, [adminLogs, logFilter, logQuery, logDateRange]);

  const filteredCodes = useMemo(() => {
    const baseList = activationCodes.filter((code) => {
      if (codeStatusFilter !== 'all' && code.status !== codeStatusFilter) {
        return false;
      }

      if (codeLevelFilter !== 'all' && code.level !== codeLevelFilter) {
        return false;
      }

      return true;
    });
    return sortBy(baseList, codeSort);
  }, [activationCodes, codeLevelFilter, codeStatusFilter, codeSort]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const codeTotalPages = Math.max(1, Math.ceil(filteredCodes.length / PAGE_SIZE));
  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentUserPage = Math.min(userPage, userTotalPages);
  const currentCodePage = Math.min(codePage, codeTotalPages);
  const currentLogPage = Math.min(logPage, logTotalPages);

  const pagedUsers = useMemo(
    () => filteredUsers.slice((currentUserPage - 1) * PAGE_SIZE, currentUserPage * PAGE_SIZE),
    [filteredUsers, currentUserPage],
  );
  const pagedCodes = useMemo(
    () => filteredCodes.slice((currentCodePage - 1) * PAGE_SIZE, currentCodePage * PAGE_SIZE),
    [filteredCodes, currentCodePage],
  );
  const pagedLogs = useMemo(
    () => filteredLogs.slice((currentLogPage - 1) * PAGE_SIZE, currentLogPage * PAGE_SIZE),
    [filteredLogs, currentLogPage],
  );

  const selectedUser = filteredUsers.find((item) => item.id === selectedUserId) || null;
  const selectedCode = filteredCodes.find((item) => item.id === selectedCodeId) || null;

  const openUserDetail = (user) => {
    setSelectedUserId(user.id);
    setUserDraft({
      nickname: user.nickname,
      level: user.level,
      role: user.role || 'teacher',
      status: user.status || 'active',
      expire_at: user.expire_at || '',
    });
    setPasswordDraft('');
  };

  const openCodeDetail = (code) => {
    setSelectedCodeId(code.id);
    setCodeDraft({
      level: code.level,
      expires_in_days: code.expires_in_days ?? '',
      max_uses: String(code.max_uses || 1),
      status: code.status || 'active',
    });
  };

  const closeUserDetail = () => {
    setSelectedUserId(null);
    setUserDraft(null);
    setPasswordDraft('');
  };

  const closeCodeDetail = () => {
    setSelectedCodeId(null);
    setCodeDraft(null);
  };

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleCopyAllActive = async () => {
    const payload = activationCodes
      .filter((item) => item.status === 'active')
      .map((item) => item.code)
      .join('\n');

    if (payload) {
      await handleCopy(payload);
    }
  };

  const handleExportCodesCsv = () => {
    const header = ['code', 'level', 'status', 'max_uses', 'used_count', 'expires_in_days', 'used_by', 'used_at'];
    const rows = filteredCodes.map((item) => [
      item.code,
      item.level,
      item.status,
      item.max_uses,
      item.used_count,
      item.expires_in_days ?? '',
      item.used_by_nickname || '',
      item.used_at || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `activation-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportUsersCsv = () => {
    const header = ['username', 'nickname', 'level', 'role', 'status', 'register_source', 'register_ip', 'same_ip_count', 'expire_at'];
    const rows = filteredUsers.map((item) => [
      item.username,
      item.nickname,
      item.level,
      item.role,
      item.status || 'active',
      item.register_source || 'activation_code',
      item.register_ip || '',
      item.same_ip_count || 0,
      item.expire_at || '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportLogsCsv = () => {
    const header = ['action', 'detail', 'operator', 'created_at'];
    const rows = filteredLogs.map((item) => [
      item.action,
      item.detail,
      item.operator,
      item.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const toggleCodeSelection = (codeId) => {
    setSelectedCodeIds((prev) =>
      prev.includes(codeId) ? prev.filter((id) => id !== codeId) : [...prev, codeId],
    );
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const toggleSelectAllUsers = () => {
    const visibleUserIds = filteredUsers.map((item) => item.id);

    if (selectedUserIds.length === visibleUserIds.length && visibleUserIds.length > 0) {
      setSelectedUserIds([]);
      return;
    }

    setSelectedUserIds(visibleUserIds);
  };

  const toggleSelectAllCodes = () => {
    const activeCodeIds = filteredCodes.filter((item) => item.status === 'active').map((item) => item.id);

    if (selectedCodeIds.length === activeCodeIds.length && activeCodeIds.length > 0) {
      setSelectedCodeIds([]);
      return;
    }

    setSelectedCodeIds(activeCodeIds);
  };

  const handleBatchUpdateUsers = async (updates, message) => {
    if (selectedUserIds.length === 0) {
      return;
    }

    const confirmed = await onRequestConfirm?.({
      title: '批量更新账号',
      message,
      confirmLabel: '确认执行',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    await onBatchUpdateUsers?.(selectedUserIds, updates);

    setSelectedUserIds([]);
  };

  const handleBatchUpdateCodes = async (updates, message) => {
    if (selectedCodeIds.length === 0) {
      return;
    }

    const confirmed = await onRequestConfirm?.({
      title: '批量更新激活码',
      message,
      confirmLabel: '确认执行',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    await onBatchUpdateCodes?.(selectedCodeIds, updates);

    setSelectedCodeIds([]);
  };

  const renderSortButton = (label, sortState, setSortState, key) => (
    <button
      className={`admin-sort-btn ${sortState.key === key ? 'active' : ''}`}
      onClick={() => toggleSort(sortState, setSortState, key)}
      type="button"
    >
      <span>{label}</span>
      <ArrowDownUp size={14} />
    </button>
  );

  const renderPagination = (page, totalPages, setPage) => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="admin-pagination">
        <button
          className="select-all-btn"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          type="button"
        >
          上一页
        </button>
        <span className="admin-pagination-status">
          第 {page} / {totalPages} 页
        </span>
        <button
          className="select-all-btn"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          type="button"
        >
          下一页
        </button>
      </div>
    );
  };

  const accountOverview = [
    {
      label: '教师账号',
      value: users.filter((item) => item.role === 'teacher').length,
      tone: 'mint',
    },
    {
      label: '超管账号',
      value: users.filter((item) => item.role === 'super_admin').length,
      tone: 'blue',
    },
    {
      label: '启用中',
      value: users.filter((item) => (item.status || 'active') === 'active').length,
      tone: 'teal',
    },
    {
      label: '已停用',
      value: users.filter((item) => item.status === 'disabled').length,
      tone: 'rose',
    },
    {
      label: '免激活注册',
      value: users.filter((item) => item.register_source === 'free_register').length,
      tone: 'amber',
    },
  ];

  const codeOverview = [
    {
      label: '未使用',
      value: activationCodes.filter((item) => item.status === 'active').length,
      tone: 'mint',
    },
    {
      label: '已用完',
      value: activationCodes.filter((item) => item.status === 'used').length,
      tone: 'amber',
    },
    {
      label: '已作废',
      value: activationCodes.filter((item) => item.status === 'revoked').length,
      tone: 'rose',
    },
    {
      label: '多次可用',
      value: activationCodes.filter((item) => Number(item.max_uses) > 1).length,
      tone: 'blue',
    },
  ];

  const renderOverviewCard = (title, description, items) => {
    const total = Math.max(1, items.reduce((sum, item) => sum + item.value, 0));

    return (
      <section className="admin-panel glass-card admin-chart-card">
        <div className="admin-panel-head">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <div className="admin-chart-list">
          {items.map((item) => (
            <div className="admin-chart-row" key={item.label}>
              <div className="admin-chart-meta">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="admin-chart-track">
                <div
                  className={`admin-chart-fill ${item.tone}`}
                  style={{ width: `${Math.max(8, (item.value / total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="admin-console">
      <section className="admin-hero glass-card">
        <div>
          <span className="admin-eyebrow">超管后台</span>
          <h2>账户与激活码中心</h2>
          <p>切回表格视图，先扫列表，再点开详情编辑，更适合持续运营和批量处理。</p>
        </div>
        <div className="admin-hero-actions">
          <button className="select-all-btn" onClick={onRefresh} type="button">
            刷新数据
          </button>
        </div>
      </section>

      <div className="admin-overview-grid">
        <article className="admin-stat-card glass-card">
          <Users size={20} />
          <label>账户总数</label>
          <strong>{users.length}</strong>
        </article>
        <article className="admin-stat-card glass-card">
          <Shield size={20} />
          <label>超管账号</label>
          <strong>{users.filter((item) => item.role === 'super_admin').length}</strong>
        </article>
        <article className="admin-stat-card glass-card">
          <Ticket size={20} />
          <label>有效激活码</label>
          <strong>{activationCodes.filter((item) => item.status === 'active').length}</strong>
        </article>
        <article className="admin-stat-card glass-card">
          <KeyRound size={20} />
          <label>已使用激活码</label>
          <strong>{activationCodes.filter((item) => item.used_count > 0).length}</strong>
        </article>
      </div>

      <div className="admin-overview-panels">
        {renderOverviewCard('账号分布', '快速查看当前账号角色和启用状态的整体结构。', accountOverview)}
        {renderOverviewCard('激活码分布', '先看库存和状态，再决定是否补码、作废或导出。', codeOverview)}
      </div>

      <section className="admin-panel glass-card">
        <div className="admin-panel-head">
          <div>
            <h3>免激活注册</h3>
            <p>开启后，登录页的激活新账号模式将直接注册，不再要求输入激活码。</p>
          </div>
        </div>
        <div className="admin-code-create-grid">
          <section className="admin-code-create-card">
            <div className="admin-code-create-head">
              <strong>策略配置</strong>
              <p>支持永久生效或截止到指定时间，默认只开放到教师账号。</p>
            </div>
            <div className="admin-code-creator batch">
              <label className="admin-field">
                <span>开关状态</span>
                <select
                  className="glass-input compact"
                  value={freeRegisterDraft.enabled ? 'enabled' : 'disabled'}
                  onChange={(event) =>
                    setFreeRegisterDraft((prev) => ({ ...prev, enabled: event.target.value === 'enabled' }))
                  }
                >
                  <option value="disabled">关闭</option>
                  <option value="enabled">开启</option>
                </select>
              </label>
              <label className="admin-field">
                <span>生效方式</span>
                <select
                  className="glass-input compact"
                  value={freeRegisterDraft.mode}
                  onChange={(event) =>
                    setFreeRegisterDraft((prev) => ({ ...prev, mode: event.target.value }))
                  }
                >
                  <option value="permanent">永久生效</option>
                  <option value="until">截止到指定时间</option>
                </select>
              </label>
              <label className="admin-field">
                <span>默认等级</span>
                <select
                  className="glass-input compact"
                  value={freeRegisterDraft.default_level}
                  onChange={(event) =>
                    setFreeRegisterDraft((prev) => ({ ...prev, default_level: event.target.value }))
                  }
                >
                  <option value="temporary">临时体验</option>
                  <option value="vip1">会员一级</option>
                  <option value="vip2">会员二级</option>
                </select>
              </label>
              {freeRegisterDraft.mode === 'until' ? (
                <label className="admin-field">
                  <span>截止时间</span>
                  <input
                    className="glass-input compact"
                    type="datetime-local"
                    value={freeRegisterDraft.end_at}
                    onChange={(event) =>
                      setFreeRegisterDraft((prev) => ({ ...prev, end_at: event.target.value }))
                    }
                  />
                </label>
              ) : null}
              <button
                className="confirm-btn"
                disabled={isMutating}
                onClick={() =>
                  onUpdateFreeRegisterConfig?.({
                    enabled: freeRegisterDraft.enabled,
                    mode: freeRegisterDraft.mode,
                    end_at:
                      freeRegisterDraft.mode === 'until' && freeRegisterDraft.end_at
                        ? new Date(freeRegisterDraft.end_at).toISOString()
                        : null,
                    default_level: freeRegisterDraft.default_level,
                  })
                }
                type="button"
              >
                保存策略
              </button>
            </div>
          </section>

          <section className="admin-code-create-card">
            <div className="admin-code-create-head">
              <strong>当前生效状态</strong>
              <p>这里显示的是前台实际看到的免激活注册结果。</p>
            </div>
            <div className="admin-code-creator batch">
              <div className="admin-info-item">
                <span>当前状态</span>
                <strong>{freeRegisterConfig?.is_active ? '生效中' : freeRegisterConfig?.enabled ? '已开启但未生效' : '已关闭'}</strong>
              </div>
              <div className="admin-info-item">
                <span>默认等级</span>
                <strong>{getUserLevelLabel(freeRegisterConfig?.default_level || 'temporary')}</strong>
              </div>
              <div className="admin-info-item">
                <span>生效方式</span>
                <strong>{freeRegisterConfig?.mode === 'until' ? '截止时间' : '永久生效'}</strong>
              </div>
              <div className="admin-info-item">
                <span>截止时间</span>
                <strong>{freeRegisterConfig?.end_at ? formatDateTime(freeRegisterConfig.end_at) : '暂无'}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <div className="admin-layout tables">
        <section className="admin-panel glass-card">
          <div className="admin-panel-head">
            <div>
              <h3>账户管理</h3>
              <p>表格更适合快速扫账号状态，点任意一行查看详情。</p>
            </div>
          </div>

          <div className="admin-account-toolbar-card">
            <div className="admin-account-toolbar-row">
              <label className="admin-filter-field admin-search-field">
                <span>搜索账户</span>
                <input
                  className="glass-input compact admin-search"
                  placeholder="搜索账号 / 昵称 / 角色"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label className="admin-filter-field">
                <span>状态筛选</span>
                <select
                  className="glass-input compact"
                  value={userStatusFilter}
                  onChange={(event) => setUserStatusFilter(event.target.value)}
                >
                  <option value="all">全部状态</option>
                  {USER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>等级筛选</span>
                <select
                  className="glass-input compact"
                  value={userLevelFilter}
                  onChange={(event) => setUserLevelFilter(event.target.value)}
                >
                  <option value="all">全部等级</option>
                  {USER_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>角色筛选</span>
                <select
                  className="glass-input compact"
                  value={userRoleFilter}
                  onChange={(event) => setUserRoleFilter(event.target.value)}
                >
                  <option value="all">全部角色</option>
                  {USER_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>来源筛选</span>
                <select
                  className="glass-input compact"
                  value={userSourceFilter}
                  onChange={(event) => setUserSourceFilter(event.target.value)}
                >
                  {USER_REGISTER_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="select-all-btn" onClick={handleExportUsersCsv} type="button">
                <Download size={15} />
                <span>导出账号 CSV</span>
              </button>
            </div>
            <div className="admin-account-batch-row">
              <button className="select-all-btn" onClick={toggleSelectAllUsers} type="button">
                {selectedUserIds.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{selectedUserIds.length > 0 ? '取消全选' : '全选当前页'}</span>
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ status: 'active' }, `将选中的 ${selectedUserIds.length} 个账号批量设为启用中？`)
                }
                type="button"
              >
                批量启用
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ status: 'disabled' }, `将选中的 ${selectedUserIds.length} 个账号批量停用？`)
                }
                type="button"
              >
                批量停用
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ level: 'vip1' }, `将选中的 ${selectedUserIds.length} 个账号批量改为会员一级？`)
                }
                type="button"
              >
                批量改为会员一级
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ level: 'vip2' }, `将选中的 ${selectedUserIds.length} 个账号批量改为会员二级？`)
                }
                type="button"
              >
                批量改为会员二级
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ role: 'teacher' }, `将选中的 ${selectedUserIds.length} 个账号批量设为教师账号？`)
                }
                type="button"
              >
                批量改为教师
              </button>
              <button
                className="select-all-btn"
                disabled={selectedUserIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateUsers({ role: 'super_admin' }, `将选中的 ${selectedUserIds.length} 个账号批量设为超管账号？`)
                }
                type="button"
              >
                批量改为超管
              </button>
            </div>
            <div className="admin-account-stats-row">
              <div className="admin-mini-stat">
                <span>当前结果</span>
                <strong>{filteredUsers.length}</strong>
              </div>
              <div className="admin-mini-stat">
                <span>启用账号</span>
                <strong>{filteredUsers.filter((item) => (item.status || 'active') === 'active').length}</strong>
              </div>
              <div className="admin-mini-stat">
                <span>教师账号</span>
                <strong>{filteredUsers.filter((item) => item.role === 'teacher').length}</strong>
              </div>
              <div className="admin-mini-stat">
                <span>超管账号</span>
                <strong>{filteredUsers.filter((item) => item.role === 'super_admin').length}</strong>
              </div>
            </div>
          </div>

          <div className="admin-table-shell">
            <table className="admin-table admin-account-table">
              <thead>
                <tr>
                  <th />
                  <th>{renderSortButton('账号', userSort, setUserSort, 'username')}</th>
                  <th>{renderSortButton('昵称', userSort, setUserSort, 'nickname')}</th>
                  <th>{renderSortButton('等级', userSort, setUserSort, 'level')}</th>
                  <th>{renderSortButton('角色', userSort, setUserSort, 'role')}</th>
                  <th>{renderSortButton('来源', userSort, setUserSort, 'register_source')}</th>
                  <th>{renderSortButton('注册IP', userSort, setUserSort, 'register_ip')}</th>
                  <th>{renderSortButton('同IP账号', userSort, setUserSort, 'same_ip_count')}</th>
                  <th>{renderSortButton('状态', userSort, setUserSort, 'status')}</th>
                  <th>{renderSortButton('到期', userSort, setUserSort, 'expire_at')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="admin-table-empty">没有找到匹配的账号。</td>
                  </tr>
                ) : (
                  pagedUsers.map((item) => (
                    <tr
                      key={item.id}
                      className={selectedUserId === item.id ? 'active' : ''}
                      onClick={() => openUserDetail(item)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <button className="student-select-toggle" onClick={() => toggleUserSelection(item.id)} type="button">
                          {selectedUserIds.includes(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td title={`@${item.username}`}><span className="admin-cell admin-cell-nowrap">@{item.username}</span></td>
                      <td title={item.nickname}><span className="admin-cell admin-cell-nowrap">{item.nickname}</span></td>
                      <td title={getUserLevelLabel(item.level)}><span className="admin-cell admin-cell-nowrap">{getUserLevelLabel(item.level)}</span></td>
                      <td title={getUserRoleLabel(item.role)}><span className="admin-cell admin-cell-nowrap">{getUserRoleLabel(item.role)}</span></td>
                      <td title={getRegisterSourceLabel(item.register_source || 'activation_code')}><span className="admin-cell admin-cell-nowrap">{getRegisterSourceLabel(item.register_source || 'activation_code')}</span></td>
                      <td title={item.register_ip || '暂无'}><span className="admin-cell admin-cell-nowrap">{item.register_ip || '暂无'}</span></td>
                      <td title={String(item.same_ip_count || 0)}><span className="admin-cell admin-cell-nowrap">{item.same_ip_count || 0}</span></td>
                      <td title={getUserStatusLabel(item.status || 'active')}><span className="admin-cell admin-cell-nowrap">{getUserStatusLabel(item.status || 'active')}</span></td>
                      <td title={item.expire_at || '长期有效'}><span className="admin-cell admin-cell-nowrap">{item.expire_at ? formatDateTime(item.expire_at) : '长期有效'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(currentUserPage, userTotalPages, setUserPage)}

        </section>

        <section className="admin-panel glass-card">
          <div className="admin-panel-head">
            <div>
              <h3>激活码管理</h3>
              <p>表格看库存、状态和使用情况，点一行再改详情。</p>
            </div>
          </div>

          <div className="admin-code-toolbar-card">
            <div className="admin-code-filter-row">
              <label className="admin-filter-field">
                <span>状态筛选</span>
                <select
                  className="glass-input compact"
                  value={codeStatusFilter}
                  onChange={(event) => setCodeStatusFilter(event.target.value)}
                >
                  {CODE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-filter-field">
                <span>等级筛选</span>
                <select
                  className="glass-input compact"
                  value={codeLevelFilter}
                  onChange={(event) => setCodeLevelFilter(event.target.value)}
                >
                  {CODE_LEVEL_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-code-actions-row">
              <button className="select-all-btn" onClick={toggleSelectAllCodes} type="button">
                {selectedCodeIds.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{selectedCodeIds.length > 0 ? '取消全选' : '全选有效码'}</span>
              </button>
              <button className="select-all-btn" onClick={handleCopyAllActive} type="button">
                复制全部有效码
              </button>
              <button
                className="select-all-btn"
                disabled={selectedCodeIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateCodes({ level: 'vip1' }, `将选中的 ${selectedCodeIds.length} 个激活码批量改为会员一级？`)
                }
                type="button"
              >
                批量改为会员一级
              </button>
              <button
                className="select-all-btn"
                disabled={selectedCodeIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateCodes({ level: 'vip2' }, `将选中的 ${selectedCodeIds.length} 个激活码批量改为会员二级？`)
                }
                type="button"
              >
                批量改为会员二级
              </button>
              <button
                className="select-all-btn"
                disabled={selectedCodeIds.length === 0 || isMutating}
                onClick={() =>
                  handleBatchUpdateCodes({ status: 'active' }, `将选中的 ${selectedCodeIds.length} 个激活码批量恢复为未使用？`)
                }
                type="button"
              >
                批量恢复未使用
              </button>
              <button className="select-all-btn" onClick={handleExportCodesCsv} type="button">
                <Download size={15} />
                <span>导出 CSV</span>
              </button>
              <button
                className="batch-delete-btn"
                disabled={selectedCodeIds.length === 0 || isMutating}
                onClick={async () => {
                  await onBatchRevokeCodes(selectedCodeIds);
                  setSelectedCodeIds([]);
                }}
                type="button"
              >
                批量作废 ({selectedCodeIds.length})
              </button>
            </div>
          </div>

          <div className="admin-code-create-grid">
            <section className="admin-creator-card">
              <div className="admin-creator-head">
                <h4>单个创建</h4>
                <p>适合手动制作指定激活码，或者临时发放给个别老师。</p>
              </div>
              <div className="admin-code-creator">
              <label className="admin-field">
                <span>自定义激活码</span>
                <input
                  className="glass-input compact"
                  placeholder="留空自动生成"
                  value={codeForm.code}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                />
              </label>
              <label className="admin-field">
                <span>前缀</span>
                <input
                  className="glass-input compact"
                  placeholder="例如 CLASS"
                  value={codeForm.prefix}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, prefix: event.target.value.toUpperCase() }))}
                />
              </label>
              <label className="admin-field">
                <span>激活等级</span>
                <select
                  className="glass-input compact"
                  value={codeForm.level}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, level: event.target.value }))}
                >
                  {CODE_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>有效天数</span>
                <input
                  className="glass-input compact"
                  type="number"
                  min="1"
                  value={codeForm.expires_in_days}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, expires_in_days: event.target.value }))}
                  placeholder="例如 30"
                />
              </label>
              <label className="admin-field">
                <span>可使用次数</span>
                <input
                  className="glass-input compact"
                  type="number"
                  min="1"
                  value={codeForm.max_uses}
                  onChange={(event) => setCodeForm((prev) => ({ ...prev, max_uses: event.target.value }))}
                  placeholder="例如 1"
                />
              </label>
              <button
                className="confirm-btn"
                disabled={isMutating}
                onClick={async () => {
                  await onCreateCode(codeForm);
                  setCodeForm(EMPTY_CODE_FORM);
                }}
                type="button"
              >
                  创建激活码
                </button>
              </div>
            </section>

            <section className="admin-creator-card">
              <div className="admin-creator-head">
                <h4>批量生成</h4>
                <p>统一设置前缀、等级和规则，一次批量生成整组激活码。</p>
              </div>
              <div className="admin-code-creator batch">
              <label className="admin-field">
                <span>前缀</span>
                <input
                  className="glass-input compact"
                  placeholder="例如 CLASS"
                  value={batchForm.prefix}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, prefix: event.target.value.toUpperCase() }))}
                />
              </label>
              <label className="admin-field">
                <span>激活等级</span>
                <select
                  className="glass-input compact"
                  value={batchForm.level}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, level: event.target.value }))}
                >
                  {CODE_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>有效天数</span>
                <input
                  className="glass-input compact"
                  type="number"
                  min="1"
                  value={batchForm.expires_in_days}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, expires_in_days: event.target.value }))}
                  placeholder="例如 30"
                />
              </label>
              <label className="admin-field">
                <span>可使用次数</span>
                <input
                  className="glass-input compact"
                  type="number"
                  min="1"
                  value={batchForm.max_uses}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, max_uses: event.target.value }))}
                  placeholder="例如 1"
                />
              </label>
              <label className="admin-field">
                <span>生成数量</span>
                <input
                  className="glass-input compact"
                  type="number"
                  min="1"
                  max="100"
                  value={batchForm.count}
                  onChange={(event) => setBatchForm((prev) => ({ ...prev, count: event.target.value }))}
                  placeholder="1-100"
                />
              </label>
              <button
                className="confirm-btn"
                disabled={isMutating}
                onClick={async () => {
                  await onCreateCodesBatch(batchForm);
                  setBatchForm(EMPTY_BATCH_FORM);
                }}
                type="button"
              >
                  批量生成
                </button>
              </div>
            </section>
          </div>

          <div className="admin-table-shell">
            <table className="admin-table admin-code-table">
              <thead>
                <tr>
                  <th />
                  <th>{renderSortButton('激活码', codeSort, setCodeSort, 'code')}</th>
                  <th>{renderSortButton('等级', codeSort, setCodeSort, 'level')}</th>
                  <th>{renderSortButton('状态', codeSort, setCodeSort, 'status')}</th>
                  <th>{renderSortButton('次数', codeSort, setCodeSort, 'used_count')}</th>
                  <th>{renderSortButton('剩余', codeSort, setCodeSort, 'max_uses')}</th>
                  <th>{renderSortButton('规则', codeSort, setCodeSort, 'expires_in_days')}</th>
                  <th>{renderSortButton('使用者', codeSort, setCodeSort, 'used_by_nickname')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="admin-table-empty">当前筛选下没有激活码。</td>
                  </tr>
                ) : (
                  pagedCodes.map((code) => (
                    <tr
                      key={code.id}
                      className={selectedCodeId === code.id ? 'active' : ''}
                      onClick={() => openCodeDetail(code)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <button className="student-select-toggle" onClick={() => toggleCodeSelection(code.id)} type="button">
                          {selectedCodeIds.includes(code.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td title={code.code}><span className="admin-cell admin-code-value">{summarizeCode(code.code)}</span></td>
                      <td title={getCodeLevelLabel(code.level)}><span className="admin-cell admin-cell-wrap-2">{getCodeLevelLabel(code.level)}</span></td>
                      <td title={getCodeStatusLabel(code.status)}><span className="admin-cell admin-cell-nowrap">{getCodeStatusLabel(code.status)}</span></td>
                      <td><span className="admin-cell admin-cell-nowrap">{code.used_count}/{code.max_uses}</span></td>
                      <td><span className="admin-cell admin-cell-nowrap">{Math.max(0, (code.max_uses || 0) - (code.used_count || 0))}</span></td>
                      <td title={formatCodeRule(code)}><span className="admin-cell admin-cell-nowrap">{formatCodeRule(code)}</span></td>
                      <td title={code.used_by_nickname || '尚未使用'}><span className="admin-cell admin-cell-wrap-2">{code.used_by_nickname || '尚未使用'}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(currentCodePage, codeTotalPages, setCodePage)}

        </section>
      </div>

      <section className="admin-panel glass-card">
        <div className="admin-panel-head">
          <div>
            <h3>超管操作日志</h3>
            <p>记录账户管理、密码重置、激活码创建和状态修改，方便后续追溯。</p>
          </div>
        <div className="admin-log-toolbar">
          <div className="admin-log-head-icon">
            <History size={18} />
            <span>{filteredLogs.length} 条</span>
          </div>
          <input
            className="glass-input compact admin-log-search"
            placeholder="搜索日志详情 / 操作人"
            value={logQuery}
            onChange={(event) => setLogQuery(event.target.value)}
          />
          <label className="admin-filter-field admin-log-date-field">
            <span>开始日期</span>
            <input
              className="glass-input compact"
              type="date"
              value={logDateRange.start}
              onChange={(event) =>
                setLogDateRange((prev) => ({ ...prev, start: event.target.value }))
              }
            />
          </label>
          <label className="admin-filter-field admin-log-date-field">
            <span>结束日期</span>
            <input
              className="glass-input compact"
              type="date"
              value={logDateRange.end}
              min={logDateRange.start || undefined}
              onChange={(event) =>
                setLogDateRange((prev) => ({ ...prev, end: event.target.value }))
              }
            />
          </label>
          <div className="density-toggle-row">
            {['all', '账号管理', '激活码管理', '系统配置'].map((item) => (
              <button
                key={item}
                className={`density-chip ${logFilter === item ? 'active' : ''}`}
                onClick={() => setLogFilter(item)}
                type="button"
              >
                {item === 'all' ? '全部' : item}
              </button>
            ))}
          </div>
          <button className="select-all-btn" onClick={handleExportLogsCsv} type="button">
            <Download size={15} />
            <span>导出日志 CSV</span>
          </button>
        </div>
        </div>

        <div className="admin-table-shell">
          <table className="admin-table admin-log-table">
            <thead>
              <tr>
                <th>操作类型</th>
                <th>详情</th>
                <th>操作人</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="admin-table-empty">还没有超管操作记录。</td>
                </tr>
              ) : (
                pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td title={log.action}><span className="admin-cell admin-cell-nowrap">{log.action}</span></td>
                    <td title={formatAdminLogDetail(log.detail)}><span className="admin-cell admin-log-detail">{formatAdminLogDetail(log.detail)}</span></td>
                    <td title={log.operator}><span className="admin-cell admin-cell-nowrap">{log.operator}</span></td>
                    <td title={log.created_at}><span className="admin-cell admin-cell-nowrap">{formatDateTime(log.created_at)}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(currentLogPage, logTotalPages, setLogPage)}
      </section>

      {(selectedUser && userDraft) || (selectedCode && codeDraft) ? (
        <div className="admin-drawer-layer" role="presentation">
          <button
            aria-label="关闭详情面板"
            className="admin-drawer-backdrop"
            onClick={selectedUser ? closeUserDetail : closeCodeDetail}
            type="button"
          />

          {selectedUser && userDraft ? (
            <section className="admin-detail-card admin-detail-drawer-panel">
              <div className="admin-drawer-close-row">
                <button className="icon-btn soft" onClick={closeUserDetail} type="button" title="关闭账户详情">
                  <X size={18} />
                </button>
              </div>

              <div className="admin-detail-head">
                <div>
                  <h4>账户详情</h4>
                  <p>当前查看：@{selectedUser.username}</p>
                </div>
                <div className="admin-user-badges">
                  <span className="badge amber">{getUserLevelLabel(selectedUser.level)}</span>
                  <span className={`badge ${selectedUser.role === 'super_admin' ? 'mint' : ''}`}>{getUserRoleLabel(selectedUser.role)}</span>
                  <span className={`badge ${selectedUser.status === 'disabled' ? 'rose' : 'mint'}`}>{getUserStatusLabel(selectedUser.status || 'active')}</span>
                </div>
              </div>

              <div className="admin-info-grid">
                <div className="admin-info-item">
                  <span>账号标识</span>
                  <strong>@{selectedUser.username}</strong>
                </div>
                <div className="admin-info-item">
                  <span>创建时间</span>
                  <strong>{formatDateTime(selectedUser.created_at)}</strong>
                </div>
                <div className="admin-info-item">
                  <span>当前权限</span>
                  <strong>{getUserRoleLabel(selectedUser.role)}</strong>
                </div>
                <div className="admin-info-item">
                  <span>有效期</span>
                  <strong>{selectedUser.expire_at || '长期有效'}</strong>
                </div>
                <div className="admin-info-item">
                  <span>注册来源</span>
                  <strong>{getRegisterSourceLabel(selectedUser.register_source || 'activation_code')}</strong>
                </div>
                <div className="admin-info-item">
                  <span>注册IP</span>
                  <strong>{selectedUser.register_ip || '暂无'}</strong>
                </div>
                <div className="admin-info-item">
                  <span>同IP账号数</span>
                  <strong>{selectedUser.same_ip_count || 0}</strong>
                </div>
                <div className="admin-info-item">
                  <span>来源备注</span>
                  <strong>{selectedUser.source_note || '暂无'}</strong>
                </div>
              </div>

              <div className="admin-form-grid detail">
                <label className="admin-field">
                  <span>昵称</span>
                  <input
                    className="glass-input compact"
                    value={userDraft.nickname}
                    onChange={(event) => setUserDraft((prev) => ({ ...prev, nickname: event.target.value }))}
                    placeholder="输入显示昵称"
                  />
                </label>
                <label className="admin-field">
                  <span>会员等级</span>
                  <select
                    className="glass-input compact"
                    value={userDraft.level}
                    onChange={(event) => setUserDraft((prev) => ({ ...prev, level: event.target.value }))}
                  >
                    {USER_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>账号角色</span>
                  <select
                    className="glass-input compact"
                    value={userDraft.role}
                    onChange={(event) => setUserDraft((prev) => ({ ...prev, role: event.target.value }))}
                  >
                    {USER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>账号状态</span>
                  <select
                    className="glass-input compact"
                    value={userDraft.status}
                    onChange={(event) => setUserDraft((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {USER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field admin-field-span-2">
                  <span>到期时间</span>
                  <input
                    className="glass-input compact"
                    value={userDraft.expire_at}
                    onChange={(event) => setUserDraft((prev) => ({ ...prev, expire_at: event.target.value }))}
                    placeholder="例如 2026-12-31，留空表示长期有效"
                  />
                </label>
              </div>

              <div className="admin-user-foot">
                <div className="admin-password-inline">
                  <input
                    className="glass-input compact"
                    type="password"
                    placeholder="输入新密码"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                  />
                  <button
                    className="select-all-btn"
                    disabled={!passwordDraft || isMutating}
                    onClick={async () => {
                      await onResetUserPassword(selectedUser.id, passwordDraft);
                      setPasswordDraft('');
                    }}
                    type="button"
                  >
                    重置密码
                  </button>
                </div>
                <button
                  className="confirm-btn"
                  disabled={isMutating}
                  onClick={() => onUpdateUser(selectedUser.id, userDraft)}
                  type="button"
                >
                  保存账号
                </button>
              </div>
            </section>
          ) : null}

          {selectedCode && codeDraft ? (
            <section className="admin-detail-card admin-detail-drawer-panel">
              <div className="admin-drawer-close-row">
                <button className="icon-btn soft" onClick={closeCodeDetail} type="button" title="关闭激活码详情">
                  <X size={18} />
                </button>
              </div>

              <div className="admin-detail-head">
                <div>
                  <h4>激活码详情</h4>
                  <p>{selectedCode.code}</p>
                </div>
                <div className="admin-code-head-actions">
                  <span className={`badge ${selectedCode.status === 'active' ? 'mint' : selectedCode.status === 'revoked' ? 'rose' : ''}`}>
                    {getCodeStatusLabel(selectedCode.status)}
                  </span>
                  <button className="icon-btn blue soft" onClick={() => handleCopy(selectedCode.code)} type="button" title="复制激活码">
                    <Copy size={15} />
                  </button>
                </div>
              </div>

              <div className="admin-info-grid">
                <div className="admin-info-item">
                  <span>创建人</span>
                  <strong>{selectedCode.created_by_nickname || '系统预置'}</strong>
                </div>
                <div className="admin-info-item">
                  <span>创建时间</span>
                  <strong>{formatDateTime(selectedCode.created_at)}</strong>
                </div>
                <div className="admin-info-item">
                  <span>最近使用</span>
                  <strong>{selectedCode.used_by_nickname || '尚未使用'}</strong>
                </div>
                <div className="admin-info-item">
                  <span>使用时间</span>
                  <strong>{formatDateTime(selectedCode.used_at)}</strong>
                </div>
                <div className="admin-info-item">
                  <span>剩余次数</span>
                  <strong>{Math.max(0, (selectedCode.max_uses || 0) - (selectedCode.used_count || 0))}</strong>
                </div>
                <div className="admin-info-item">
                  <span>当前规则</span>
                  <strong>{formatCodeRule(selectedCode)}</strong>
                </div>
              </div>

              <div className="admin-code-meta">
                <span>已用 {selectedCode.used_count}/{selectedCode.max_uses}</span>
                <span>{selectedCode.used_by_nickname ? `最近使用：${selectedCode.used_by_nickname}` : '尚未使用'}</span>
                <span>{formatExpire(selectedCode.expires_in_days === null ? null : `${selectedCode.expires_in_days} 天`)}</span>
              </div>

              <div className="admin-form-grid detail">
                <label className="admin-field">
                  <span>激活等级</span>
                  <select
                    className="glass-input compact"
                    value={codeDraft.level}
                    onChange={(event) => setCodeDraft((prev) => ({ ...prev, level: event.target.value }))}
                  >
                    {CODE_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>可使用次数</span>
                  <input
                    className="glass-input compact"
                    type="number"
                    min={selectedCode.used_count || 1}
                    value={codeDraft.max_uses}
                    onChange={(event) => setCodeDraft((prev) => ({ ...prev, max_uses: event.target.value }))}
                  />
                </label>
                <label className="admin-field">
                  <span>有效天数</span>
                  <input
                    className="glass-input compact"
                    type="number"
                    min="1"
                    value={codeDraft.expires_in_days}
                    onChange={(event) => setCodeDraft((prev) => ({ ...prev, expires_in_days: event.target.value }))}
                    placeholder="留空表示长期有效"
                  />
                </label>
                <label className="admin-field">
                  <span>状态</span>
                  <select
                    className="glass-input compact"
                    value={codeDraft.status}
                    onChange={(event) => setCodeDraft((prev) => ({ ...prev, status: event.target.value }))}
                  >
                    {CODE_STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="admin-user-foot">
                <span className="admin-log-operator">创建人：{selectedCode.created_by_nickname || '系统预置'}</span>
                <button
                  className="confirm-btn"
                  disabled={isMutating}
                  onClick={() => onUpdateCode(selectedCode.id, codeDraft)}
                  type="button"
                >
                  保存激活码
                </button>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default AdminConsole;
