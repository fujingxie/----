import React, { useMemo, useState } from 'react';
import './Settings.css';
import {
  CheckSquare,
  ClipboardList,
  Download,
  GraduationCap,
  Key,
  PenSquare,
  Plus,
  RotateCcw,
  Scale,
  Skull,
  Square,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { graduateToNewEgg } from '../../lib/petCollection';

const DEFAULT_THRESHOLDS = [10, 20, 30, 50, 70, 100];
const DEFAULT_PET_CONDITION_CONFIG = {
  hungry_days: 2,
  weak_days: 4,
  sleeping_days: 7,
  hungry_decay: 0,
  weak_decay: 1,
  sleeping_decay: 2,
};
const EMPTY_RULE = {
  name: '',
  icon: '⭐',
  exp: 1,
  coins: 5,
  type: 'positive',
};

const formatAccountExpireAt = (value) => {
  if (!value) {
    return '永久有效';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ClassSettingsPanel = ({
  currentClass,
  students,
  onUpdateClass,
  onImportStudents,
  onRemoveStudent,
  onBatchRemoveStudents,
  onRenameStudent,
  onResetStudentPet,
  onRequestConfirm,
}) => {
  const [className, setClassName] = useState(currentClass?.name || '');
  const [bulkStudentText, setBulkStudentText] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingStudentName, setEditingStudentName] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const handleBulkImport = async () => {
    const names = bulkStudentText
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length === 0) {
      return;
    }

    await onImportStudents(names);
    setBulkStudentText('');
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
      return;
    }

    setSelectedStudentIds(students.map((student) => student.id));
  };

  const startEditingStudent = (student) => {
    setEditingStudentId(student.id);
    setEditingStudentName(student.name);
  };

  const handleRenameStudent = async (student) => {
    if (!editingStudentName.trim()) {
      return;
    }

    await onRenameStudent(student, editingStudentName.trim());
    setEditingStudentId(null);
    setEditingStudentName('');
  };

  const handleBatchDelete = async () => {
    if (selectedStudentIds.length === 0) {
      return;
    }

    const confirmed = await onRequestConfirm({
      title: '批量删除学生',
      message: `确定要批量移除 ${selectedStudentIds.length} 名学生吗？该操作会把这些学生从当前班级中移除。`,
      tone: 'danger',
      confirmLabel: '确认删除',
    });
    if (confirmed) {
      await onBatchRemoveStudents(selectedStudentIds);
      setSelectedStudentIds([]);
    }
  };

  return (
    <>
      <div className="section-header">
        <div>
          <h3>班级学生管理</h3>
          <p className="hint inline-hint">支持换行批量导入和批量删除，适合快速维护整班名单。</p>
        </div>
        <div className="student-summary-chip">{students.length} 名学生</div>
      </div>

      <div className="students-admin-shell">
        <section className="students-rename-panel glass-card">
          <div className="students-panel-title">
            <PenSquare size={26} />
            <h4>班级重命名</h4>
          </div>
          <div className="students-rename-row">
            <input
              className="glass-input students-rename-input"
              placeholder="输入新班级名称"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
            <button className="students-save-btn" onClick={() => onUpdateClass(className)} type="button">
              保存
            </button>
          </div>
        </section>

        <section className="students-bulk-panel glass-card">
          <div className="students-panel-title">
            <GraduationCap size={28} />
            <h4>新增学生</h4>
          </div>
          <div className="students-bulk-entry">
            <textarea
              className="glass-input batch-student-textarea"
              placeholder={'输入新生姓名（支持换行批量导入）\n例如：\n王小明\n李小红\n张乐乐'}
              value={bulkStudentText}
              onChange={(event) => setBulkStudentText(event.target.value)}
              rows={5}
            />
            <button className="students-assign-btn" onClick={handleBulkImport} type="button">
              分配蛋
            </button>
          </div>
          <div className="students-bulk-footer">
            <h5>当前学生名册</h5>
            <div className="students-batch-actions">
              <button className="select-all-btn" onClick={toggleSelectAll} type="button">
                {selectedStudentIds.length === students.length && students.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                <span>{selectedStudentIds.length === students.length && students.length > 0 ? '取消全选' : '全选学生'}</span>
              </button>
              <button
                className="batch-delete-btn"
                onClick={handleBatchDelete}
                disabled={selectedStudentIds.length === 0}
                type="button"
              >
                <Trash2 size={16} /> 批量删除 ({selectedStudentIds.length})
              </button>
            </div>
          </div>
        </section>

        <div className="students-selection-bar">
          <span className="selection-hint">已选 {selectedStudentIds.length} / {students.length}</span>
        </div>

        {students.length === 0 ? (
          <div className="empty-settings-state">暂时还没有学生，先添加几个名字吧。</div>
        ) : (
          <div className="students-table-wrapper">
            <table className="students-table students-table-modern">
              <thead>
                <tr>
                  <th className="checkbox-col">选择</th>
                  <th>学生姓名</th>
                  <th>宠物状态</th>
                  <th>宠物名称</th>
                  <th>等级</th>
                  <th>金币</th>
                  <th>经验</th>
                  <th className="actions-col">操作</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const isEditing = editingStudentId === student.id;
                  const isSelected = selectedStudentIds.includes(student.id);

                  return (
                    <tr key={student.id} className={isSelected ? 'selected-row' : ''}>
                      <td className="checkbox-col">
                        <button className="student-row-select" onClick={() => toggleStudentSelection(student.id)} type="button">
                          {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="student-inline-editor">
                            <input
                              className="glass-input compact"
                              value={editingStudentName}
                              onChange={(event) => setEditingStudentName(event.target.value)}
                            />
                            <button className="confirm-btn micro" onClick={() => handleRenameStudent(student)} type="button">
                              保存
                            </button>
                          </div>
                        ) : (
                          <div className="student-name-cell">
                            <strong>{student.name}</strong>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`student-admin-status ${student.pet_status === 'egg' ? 'egg' : 'active'}`}>
                          {student.pet_status === 'egg' ? '待唤醒' : '已激活'}
                        </span>
                      </td>
                      <td>{student.pet_status === 'egg' ? '神秘蛋' : student.pet_name || '未命名伙伴'}</td>
                      <td>{student.pet_status === 'egg' ? '-' : `Lv.${student.pet_level || 0}`}</td>
                      <td>💰 {student.coins || 0}</td>
                      <td>⭐ {student.total_exp || 0}</td>
                      <td className="actions-col">
                        <div className="actions">
                          {!isEditing && (
                            <button
                              className="icon-btn blue"
                              onClick={() => startEditingStudent(student)}
                              type="button"
                              title="编辑学生姓名"
                            >
                              <PenSquare size={14} />
                            </button>
                          )}
                          {!isEditing && (
                            <button
                              className="icon-btn amber"
                              onClick={async () => {
                                const confirmed = await onRequestConfirm({
                                  title: '重置宠物',
                                  message: `确定要将 ${student.name} 的当前宠物重置为神秘蛋吗？当前宠物会回到待唤醒状态。`,
                                  tone: 'danger',
                                  confirmLabel: '确认重置',
                                });
                                if (confirmed) {
                                  onResetStudentPet(student);
                                }
                              }}
                              type="button"
                              title="重置宠物"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            className="icon-btn red"
                            onClick={async () => {
                              const confirmed = await onRequestConfirm({
                                title: '删除学生',
                                message: `确定要移除学生 ${student.name} 吗？该学生会从当前班级列表中移除。`,
                                tone: 'danger',
                                confirmLabel: '确认移除',
                              });
                              if (confirmed) {
                                onRemoveStudent(student.id, student.name);
                              }
                            }}
                            type="button"
                            title="删除学生"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const RulesSettingsPanel = ({
  levelThresholds,
  petConditionConfig,
  rules,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onSaveThresholds,
}) => {
  const [thresholdDraft, setThresholdDraft] = useState(levelThresholds || DEFAULT_THRESHOLDS);
  const [conditionDraft, setConditionDraft] = useState(petConditionConfig || DEFAULT_PET_CONDITION_CONFIG);
  const [newRule, setNewRule] = useState(EMPTY_RULE);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRule, setEditingRule] = useState(EMPTY_RULE);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);

  const positiveRules = useMemo(
    () => rules.filter((rule) => rule.type !== 'negative'),
    [rules],
  );
  const negativeRules = useMemo(
    () => rules.filter((rule) => rule.type === 'negative'),
    [rules],
  );

  const handleThresholdChange = (index, value) => {
    setThresholdDraft((prev) =>
      prev.map((threshold, thresholdIndex) =>
        thresholdIndex === index ? Number(value || 0) : threshold,
      ),
    );
  };

  const handleThresholdSubmit = async () => {
    const normalizedThresholds = thresholdDraft.map((value) => Number(value || 0));
    const isAscending = normalizedThresholds.every((value, index) => {
      if (index === 0) {
        return value > 0;
      }

      return value > normalizedThresholds[index - 1];
    });

    if (!isAscending) {
      window.alert('等级阈值需要保持递增，且必须大于 0');
      return;
    }

    const normalizedCondition = {
      hungry_days: Number(conditionDraft.hungry_days || 0),
      weak_days: Number(conditionDraft.weak_days || 0),
      sleeping_days: Number(conditionDraft.sleeping_days || 0),
      hungry_decay: Number(conditionDraft.hungry_decay || 0),
      weak_decay: Number(conditionDraft.weak_decay || 0),
      sleeping_decay: Number(conditionDraft.sleeping_decay || 0),
    };

    if (
      normalizedCondition.hungry_days < 1
      || normalizedCondition.weak_days <= normalizedCondition.hungry_days
      || normalizedCondition.sleeping_days <= normalizedCondition.weak_days
      || normalizedCondition.hungry_decay < 0
      || normalizedCondition.weak_decay < 0
      || normalizedCondition.sleeping_decay < 0
    ) {
      window.alert('宠物状态配置需要满足：饥饿 < 虚弱 < 休眠，衰减经验不能小于 0');
      return;
    }

    await onSaveThresholds({
      thresholds: normalizedThresholds,
      petConditionConfig: normalizedCondition,
    });
  };

  const submitRule = async (rule, onDone) => {
    if (!rule.name.trim()) {
      return;
    }

    const normalizedRule = {
      ...rule,
      name: rule.name.trim(),
      exp: Number(rule.exp),
      coins: Number(rule.coins),
    };

    await onDone(normalizedRule);
  };

  const startEditingRule = (rule) => {
    setEditingRuleId(rule.id);
    setEditingRule({
      id: rule.id,
      name: rule.name,
      icon: rule.icon,
      exp: rule.exp,
      coins: rule.coins,
      type: rule.type,
    });
  };

  const cancelEditingRule = () => {
    setEditingRuleId(null);
    setEditingRule(EMPTY_RULE);
  };

  const renderRuleCard = (rule, theme = 'positive') => {
    const isEditing = editingRuleId === rule.id;
    const currentRule = isEditing ? editingRule : rule;

    return (
      <article
        key={rule.id}
        className={`rule-card glass-card ${theme === 'negative' ? 'negative' : 'positive'} ${isEditing ? 'editing' : ''}`}
      >
        <div className={`rule-icon-badge ${theme === 'negative' ? 'negative' : 'positive'}`}>
          <span>{currentRule.icon || '⭐'}</span>
        </div>

        {isEditing ? (
          <div className="rule-card-edit">
            <input
              className="glass-input compact"
              value={editingRule.name}
              onChange={(event) => setEditingRule((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="规则名称"
            />
            <div className="rule-edit-inline">
              <input
                className="glass-input compact icon-input"
                value={editingRule.icon}
                onChange={(event) => setEditingRule((prev) => ({ ...prev, icon: event.target.value }))}
                placeholder="图标"
              />
              <select
                className="glass-input compact select-input"
                value={editingRule.type}
                onChange={(event) => setEditingRule((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="positive">积极行为</option>
                <option value="negative">需要改进</option>
              </select>
            </div>
            <div className="rule-edit-inline">
              <input
                className="glass-input compact stat-input"
                type="number"
                step="1"
                value={editingRule.exp}
                onChange={(event) => setEditingRule((prev) => ({ ...prev, exp: event.target.value }))}
                placeholder="EXP"
              />
              <input
                className="glass-input compact stat-input"
                type="number"
                step="1"
                value={editingRule.coins}
                onChange={(event) => setEditingRule((prev) => ({ ...prev, coins: event.target.value }))}
                placeholder="金币"
              />
            </div>
            <div className="rule-card-actions editing">
              <button
                className="confirm-btn micro"
                onClick={() =>
                  submitRule(editingRule, async (normalizedRule) => {
                    await onUpdateRule(normalizedRule);
                    cancelEditingRule();
                  })
                }
                type="button"
              >
                保存
              </button>
              <button className="select-all-btn" onClick={cancelEditingRule} type="button">
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rule-card-body">
              <h5>{rule.name}</h5>
              {rule.isSystem && <span className="system-tag">系统预设</span>}
            </div>

            <div className="rule-reward-row">
              <div className="rule-reward-pill exp">
                <span>EXP</span>
                <strong>{rule.exp > 0 ? '+' : ''}{rule.exp}</strong>
              </div>
              <div className="rule-reward-pill coins">
                <span>金币</span>
                <strong>{rule.coins > 0 ? '+' : ''}{rule.coins}</strong>
              </div>
            </div>

            <div className="rule-card-actions">
              <button className="icon-btn blue soft" onClick={() => startEditingRule(rule)} type="button" title="编辑规则">
                <PenSquare size={16} />
              </button>
              <button
                className="icon-btn red soft"
                onClick={() => onDeleteRule(rule.id)}
                type="button"
                title="删除规则"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </article>
    );
  };

  return (
    <>
      <section className="rules-hero-panel glass-card">
        <div>
          <h4>我的课堂规则库</h4>
          <p className="hint inline-hint">这些规则将显示在打分面板中，您可以自由增删改。 </p>
        </div>
        <button
          className="rules-create-btn"
          onClick={() => setIsCreatePanelOpen((prev) => !prev)}
          type="button"
        >
          <Plus size={18} /> {isCreatePanelOpen ? '收起表单' : '新建规则'}
        </button>
      </section>

      {isCreatePanelOpen && (
        <section className="rules-create-panel glass-card">
          <div className="rules-create-grid">
            <input
              className="glass-input"
              placeholder="规则名称"
              value={newRule.name}
              onChange={(event) => setNewRule((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="glass-input"
              placeholder="图标"
              value={newRule.icon}
              onChange={(event) => setNewRule((prev) => ({ ...prev, icon: event.target.value }))}
            />
            <input
              className="glass-input"
              type="number"
              step="1"
              placeholder="EXP"
              value={newRule.exp}
              onChange={(event) => setNewRule((prev) => ({ ...prev, exp: event.target.value }))}
            />
            <input
              className="glass-input"
              type="number"
              step="1"
              placeholder="金币"
              value={newRule.coins}
              onChange={(event) => setNewRule((prev) => ({ ...prev, coins: event.target.value }))}
            />
            <select
              className="glass-input"
              value={newRule.type}
              onChange={(event) => setNewRule((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="positive">积极行为</option>
              <option value="negative">需要改进</option>
            </select>
            <button
              className="confirm-btn"
              onClick={() =>
                submitRule(newRule, async (normalizedRule) => {
                  await onAddRule(normalizedRule);
                  setNewRule(EMPTY_RULE);
                  setIsCreatePanelOpen(false);
                })
              }
              type="button"
            >
              保存规则
            </button>
          </div>
        </section>
      )}

      <section className="rules-group-block">
        <div className="rules-group-heading positive">
          <span className="rules-group-accent" />
          <h5>积极行为</h5>
        </div>
        {positiveRules.length === 0 ? (
          <div className="empty-settings-state">还没有积极行为规则，先新建一条吧。</div>
        ) : (
          <div className="rule-card-grid">
            {positiveRules.map((rule) => renderRuleCard(rule, 'positive'))}
          </div>
        )}
      </section>

      <section className="rules-group-block">
        <div className="rules-group-heading negative">
          <span className="rules-group-accent" />
          <h5>需要改进</h5>
        </div>
        {negativeRules.length === 0 ? (
          <div className="empty-settings-state">当前还没有惩罚类规则。</div>
        ) : (
          <div className="rule-card-grid">
            {negativeRules.map((rule) => renderRuleCard(rule, 'negative'))}
          </div>
        )}
      </section>

      <div className="subsection mt-30 thresholds-panel">
        <div className="thresholds-panel-header">
          <div>
            <h4>自定义进阶条件</h4>
            <p className="hint inline-hint">设置达到对应等级所需的累计经验值，数值必须逐级递增。</p>
          </div>
          <button className="confirm-btn" onClick={handleThresholdSubmit} type="button">保存变更</button>
        </div>
        <div className="thresholds-grid">
          {thresholdDraft.map((threshold, index) => (
            <div key={index + 2} className="lv-input-box">
              <label>LV.{index + 2}</label>
              <input
                className="glass-input small"
                type="number"
                min="1"
                step="1"
                value={threshold}
                onChange={(event) => handleThresholdChange(index, event.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="subsection mt-30 thresholds-panel">
        <div className="thresholds-panel-header">
          <div>
            <h4>宠物状态时间</h4>
            <p className="hint inline-hint">设置宠物在多少天未获得积极课堂互动后进入饥饿、虚弱和休眠。</p>
          </div>
        </div>
        <div className="thresholds-grid pet-condition-grid">
          <div className="lv-input-box">
            <label>进入饥饿</label>
            <input
              className="glass-input small"
              type="number"
              min="1"
              step="1"
              value={conditionDraft.hungry_days}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, hungry_days: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">天</span>
          </div>
          <div className="lv-input-box">
            <label>进入虚弱</label>
            <input
              className="glass-input small"
              type="number"
              min="2"
              step="1"
              value={conditionDraft.weak_days}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, weak_days: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">天</span>
          </div>
          <div className="lv-input-box">
            <label>进入休眠</label>
            <input
              className="glass-input small"
              type="number"
              min="3"
              step="1"
              value={conditionDraft.sleeping_days}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, sleeping_days: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">天</span>
          </div>
        </div>
        <div className="thresholds-grid pet-condition-grid">
          <div className="lv-input-box">
            <label>饥饿日衰减</label>
            <input
              className="glass-input small"
              type="number"
              min="0"
              step="1"
              value={conditionDraft.hungry_decay}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, hungry_decay: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">EXP / 天</span>
          </div>
          <div className="lv-input-box">
            <label>虚弱日衰减</label>
            <input
              className="glass-input small"
              type="number"
              min="0"
              step="1"
              value={conditionDraft.weak_decay}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, weak_decay: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">EXP / 天</span>
          </div>
          <div className="lv-input-box">
            <label>休眠日衰减</label>
            <input
              className="glass-input small"
              type="number"
              min="0"
              step="1"
              value={conditionDraft.sleeping_decay}
              onChange={(event) =>
                setConditionDraft((prev) => ({ ...prev, sleeping_decay: Number(event.target.value || 0) }))
              }
            />
            <span className="input-unit">EXP / 天</span>
          </div>
        </div>
      </div>
    </>
  );
};

const formatLogDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseLogDateValue = (value) => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const LogsPanel = ({ logs, onUndoLog, isMutating }) => {
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const startDate = useMemo(() => (startAt ? new Date(startAt) : null), [startAt]);
  const inclusiveEndDate = useMemo(() => {
    if (!endAt) {
      return null;
    }

    const endDate = new Date(endAt);
    return new Date(endDate.getTime() + 59 * 1000 + 999);
  }, [endAt]);
  const endDate = useMemo(() => (endAt ? new Date(endAt) : null), [endAt]);
  const rangeError = Boolean(startDate && endDate && endDate < startDate);

  const filteredLogs = useMemo(() => {
    if (rangeError) {
      return [];
    }

    return logs.filter((log) => {
      const createdAt = parseLogDateValue(log.created_at || '');

      if (!createdAt) {
        return true;
      }

      if (startDate && createdAt < startDate) {
        return false;
      }

      if (inclusiveEndDate && createdAt > inclusiveEndDate) {
        return false;
      }

      return true;
    });
  }, [inclusiveEndDate, logs, rangeError, startDate]);

  return (
    <div className="settings-section">
      <div className="section-header stack-on-mobile">
        <div>
          <h3>最近操作日志</h3>
          <p className="hint inline-hint">支持按开始和结束时间筛选最近日志记录。</p>
        </div>
        <div className="logs-filter-bar">
          <div className="logs-filter-item">
            <label>开始时间</label>
            <input
              className="glass-input compact"
              type="datetime-local"
              value={startAt}
              max={endAt || undefined}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </div>
          <div className="logs-filter-item">
            <label>结束时间</label>
            <input
              className="glass-input compact"
              type="datetime-local"
              value={endAt}
              min={startAt || undefined}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </div>
          <button
            className="icon-btn blue logs-reset-btn"
            onClick={() => {
              setStartAt('');
              setEndAt('');
            }}
            type="button"
            title="清空时间筛选"
          >
            重置
          </button>
        </div>
      </div>

      {rangeError && (
        <p className="account-feedback error">结束时间不能早于开始时间，请调整筛选范围。</p>
      )}

      {logs.length === 0 ? (
        <div className="empty-settings-state">当前班级还没有操作记录。</div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-settings-state">当前筛选条件下没有匹配的日志。</div>
      ) : (
        <div className="logs-list">
          {filteredLogs.map((log) => (
            <article key={log.id} className="log-item glass-card">
              <div className="log-meta">
                <strong>{log.action}</strong>
                <span>{formatLogDate(log.created_at) || log.time}</span>
              </div>
              <p>{log.detail}</p>
              <div className="log-footer">
                <span className="log-operator">{log.operator}</span>
                {log.canUndo && (
                  <button
                    className="log-undo-btn"
                    disabled={isMutating}
                    onClick={() => onUndoLog(log.id)}
                    type="button"
                  >
                    {isMutating ? '撤销中...' : '撤销最近一次'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const AccountPanel = ({
  user,
  theme,
  themeOptions,
  density,
  densityOptions,
  soundEnabled,
  soundVolume,
  onThemeChange,
  onDensityChange,
  onSoundEnabledChange,
  onSoundVolumeChange,
  onUpdatePassword,
}) => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    nextPassword: '',
    confirmPassword: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  const membershipLabel = useMemo(() => {
    if (user.level === 'permanent') {
      return '永久会员';
    }

    if (user.level === 'vip2') {
      return 'VIP 2';
    }

    if (user.level === 'vip1') {
      return 'VIP 1';
    }

    return '临时体验';
  }, [user.level]);

  const handlePasswordSubmit = async () => {
    setPasswordMessage('');

    if (!passwordForm.currentPassword || !passwordForm.nextPassword) {
      setPasswordMessage('请完整填写当前密码和新密码');
      return;
    }

    if (passwordForm.nextPassword.length < 6) {
      setPasswordMessage('新密码至少需要 6 位');
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('两次输入的新密码不一致');
      return;
    }

    await onUpdatePassword({
      currentPassword: passwordForm.currentPassword,
      nextPassword: passwordForm.nextPassword,
    });

    setPasswordForm({
      currentPassword: '',
      nextPassword: '',
      confirmPassword: '',
    });
    setPasswordMessage('密码修改成功，下次请使用新密码登录');
  };

  return (
    <div className="settings-section account-section">
      <div className="account-layout">
        <div className="account-primary">
          <h3>账号信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>昵称</label>
              <span>{user.nickname}</span>
            </div>
            <div className="info-item">
              <label>账号</label>
              <span>{user.username}</span>
            </div>
            <div className="info-item">
              <label>特权等级</label>
              <span className="badge amber">{membershipLabel}</span>
            </div>
            <div className="info-item">
              <label>原始等级值</label>
              <span>{user.level}</span>
            </div>
            <div className="info-item">
              <label>有效期至</label>
              <span>{formatAccountExpireAt(user.expire_at)}</span>
            </div>
          </div>
          <div className="password-reset">
            <h4><Key size={16} /> 修改密码</h4>
            <p className="hint">为了保证账号安全，你可以随时更新当前登录密码。</p>
            <div className="password-form-grid">
              <input
                className="glass-input"
                type="password"
                placeholder="当前密码"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              />
              <input
                className="glass-input"
                type="password"
                placeholder="新密码（至少 6 位）"
                value={passwordForm.nextPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))}
              />
              <input
                className="glass-input"
                type="password"
                placeholder="确认新密码"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              />
              <button className="confirm-btn" onClick={handlePasswordSubmit} type="button">
                更新密码
              </button>
            </div>
            {passwordMessage && <p className={`account-feedback ${passwordMessage.includes('成功') ? 'success' : 'error'}`}>{passwordMessage}</p>}
          </div>
        </div>

        <aside className="account-aside">
          <section className="account-side-card glass-card membership-card">
            <span className="account-side-label">当前状态</span>
            <strong>{membershipLabel}</strong>
            <p>{user.expire_at ? `账号有效期至 ${formatAccountExpireAt(user.expire_at)}` : '当前账号长期有效，可持续管理多个班级和高级功能。'}</p>
          </section>

          <section className="account-side-card glass-card">
            <span className="account-side-label">安全建议</span>
            <ul className="account-side-list">
              <li>定期更新密码，避免长期使用同一组口令。</li>
              <li>公共设备使用后及时退出登录。</li>
              <li>重要班级操作前确认当前账号身份。</li>
            </ul>
          </section>

          <section className="account-side-card glass-card">
            <span className="account-side-label">账号能力</span>
            <div className="account-side-metrics">
              <div>
                <label>功能范围</label>
                <strong>{user.level === 'temporary' ? '基础功能' : '完整功能'}</strong>
              </div>
              <div>
                <label>会员标识</label>
                <strong>{user.level}</strong>
              </div>
            </div>
          </section>

          <section className="account-side-card glass-card">
            <span className="account-side-label">界面主题</span>
            <div className="theme-option-grid">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`theme-option-card ${theme === option.id ? 'active' : ''}`}
                  onClick={() => onThemeChange(option.id)}
                  type="button"
                >
                  <div className={`theme-preview theme-${option.id}`}>
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>{option.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="account-side-card glass-card">
            <span className="account-side-label">界面密度</span>
            <div className="density-toggle-row">
              {densityOptions.map((option) => (
                <button
                  key={option.id}
                  className={`density-chip ${density === option.id ? 'active' : ''}`}
                  onClick={() => onDensityChange(option.id)}
                  type="button"
                >
                  {option.name}
                </button>
              ))}
            </div>
            <p>{density === 'compact' ? '更适合信息密度高的管理场景。' : '留白更舒展，适合课堂展示。'}</p>
          </section>

          <section className="account-side-card glass-card">
            <span className="account-side-label">提示音</span>
            <div className="density-toggle-row">
              <button
                className={`density-chip ${soundEnabled ? 'active' : ''}`}
                onClick={() => onSoundEnabledChange(true)}
                type="button"
              >
                开启
              </button>
              <button
                className={`density-chip ${!soundEnabled ? 'active' : ''}`}
                onClick={() => onSoundEnabledChange(false)}
                type="button"
              >
                关闭
              </button>
            </div>
            <div className="sound-slider-row">
              <label htmlFor="sound-volume">音量</label>
              <input
                id="sound-volume"
                type="range"
                min="0"
                max="100"
                value={Math.round(soundVolume * 100)}
                onChange={(event) => onSoundVolumeChange(Number(event.target.value) / 100)}
              />
              <strong>{Math.round(soundVolume * 100)}%</strong>
            </div>
            <p>{soundEnabled ? '奖励、惩罚、领养等课堂动作会播放提示音。' : '已关闭所有动作提示音。'}</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

const DangerZonePanel = ({ currentClass, onResetClassProgress, onArchiveClassStudents, onRequestConfirm }) => {
  const handleReset = async () => {
    const className = currentClass?.name || '';
    const confirmed = await onRequestConfirm({
      title: '重置全班进度',
      message: `确定要重置班级 ${className} 的全班进度吗？金币会清零，宠物会全部回到神秘蛋，但会保留学生名册和历史账单。`,
      tone: 'danger',
      confirmLabel: '确认重置',
      requireMatch: className,
      matchLabel: `请输入班级名“${className}”以确认重置`,
      matchPlaceholder: className,
    });
    if (!confirmed) {
      return;
    }

    await onResetClassProgress();
  };

  const handleWipe = async () => {
    const className = currentClass?.name || '';
    const confirmed = await onRequestConfirm({
      title: '一键毕业归档',
      message: `确定要将班级 ${className} 的全部学生执行毕业归档大清洗吗？学生会从前端界面彻底移除，且不可恢复。`,
      tone: 'danger',
      confirmLabel: '确认归档',
      requireMatch: className,
      matchLabel: `请输入班级名“${className}”以确认归档`,
      matchPlaceholder: className,
    });
    if (!confirmed) {
      return;
    }

    await onArchiveClassStudents();
  };

  return (
    <div className="danger-zone-shell">
      <section className="danger-zone-panel glass-card">
        <div className="danger-zone-header">
          <div className="danger-zone-title">
            <Skull size={34} />
            <h3>高危操作核弹区</h3>
          </div>
          <p className="danger-zone-warning">
            警告：此区域的操作会直接改写当前班级数据，请在确认后再执行，避免误操作影响日常使用。
          </p>
        </div>

        <article className="danger-action-card recharge">
          <div>
            <h4>全班“新学期”重置</h4>
            <p>金币归零，所有宠物打回神秘蛋。保留学生名册和历史账单。</p>
          </div>
          <button className="danger-action-btn recharge" onClick={handleReset} type="button">
            重置全班进度
          </button>
        </article>

        <article className="danger-action-card destructive">
          <div>
            <h4>全班“毕业归档”大清洗</h4>
            <p>一键将当前班级的所有学生彻底清理出前端界面，不可恢复。</p>
          </div>
          <button className="danger-action-btn destructive" onClick={handleWipe} type="button">
            一键毕业归档
          </button>
        </article>
      </section>
    </div>
  );
};

const ExportPanel = ({ currentClass, students, rules, logs, onExportClassData }) => {
  const redemptionLogs = useMemo(
    () => logs.filter((log) => (log.actionType || log.action) === '商品兑换'),
    [logs],
  );

  return (
    <div className="settings-section export-section">
      <div className="export-panel glass-card">
        <div className="export-panel-head">
          <div>
            <h3>班级数据导出</h3>
            <p>导出当前班级的学生、宠物、规则和兑换记录，方便留档或交接。</p>
          </div>
          <button className="confirm-btn export-btn" onClick={onExportClassData} type="button">
            <Download size={16} />
            <span>导出 JSON</span>
          </button>
        </div>

        <div className="export-summary-grid">
          <div className="export-summary-card">
            <label>当前班级</label>
            <strong>{currentClass?.name || '未命名班级'}</strong>
          </div>
          <div className="export-summary-card">
            <label>学生名单</label>
            <strong>{students.length} 人</strong>
          </div>
          <div className="export-summary-card">
            <label>规则数量</label>
            <strong>{rules.length} 条</strong>
          </div>
          <div className="export-summary-card">
            <label>兑换记录</label>
            <strong>{redemptionLogs.length} 条</strong>
          </div>
        </div>

        <div className="export-scope-card">
          <span className="account-side-label">将包含以下内容</span>
          <ul className="account-side-list">
            <li>学生名单、金币、经验和当前宠物状态。</li>
            <li>宠物图鉴记录、奖励次数和毕业进度。</li>
            <li>课堂规则、等级阈值和小卖部商品。</li>
            <li>独立的商品兑换日志，便于复盘发货情况。</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const Settings = ({
  user,
  theme,
  themeOptions,
  density,
  densityOptions,
  soundEnabled,
  soundVolume,
  currentClass,
  students,
  rules,
  logs = [],
  levelThresholds,
  petConditionConfig,
  onUpdateClass,
  onImportStudents,
  onRemoveStudent,
  onBatchRemoveStudents,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onSaveThresholds,
  onUpdateStudent,
  onUpdatePassword,
  onResetClassProgress,
  onArchiveClassStudents,
  onUndoLog,
  onExportClassData,
  onThemeChange,
  onDensityChange,
  onSoundEnabledChange,
  onSoundVolumeChange,
  onRequestConfirm,
  isMutating,
}) => {
  const [activeMenu, setActiveMenu] = useState('account');

  const menuItems = [
    { id: 'account', label: '账号管理', icon: <User size={18} /> },
    { id: 'class', label: '班级学生', icon: <Users size={18} /> },
    { id: 'rules', label: '分值规则', icon: <Scale size={18} /> },
    { id: 'logs', label: '操作日志', icon: <ClipboardList size={18} /> },
    { id: 'export', label: '数据导出', icon: <Download size={18} /> },
    { id: 'danger', label: '危险操作区', icon: <Skull size={18} />, danger: true },
  ];

  const hasClass = Boolean(currentClass);

  const handleRenameStudent = async (student, newName) => {
    await onUpdateStudent({
      ...student,
      name: newName,
    }, '学生管理', `将学生 ${student.name} 更名为 ${newName}`);
  };

  const handleResetStudentPet = async (student) => {
    const resetStudent =
      student.pet_status === 'egg'
        ? {
            ...student,
            pet_name: null,
            pet_type_id: null,
            pet_level: 0,
            pet_points: 0,
            total_exp: 0,
          }
        : graduateToNewEgg(student);

    await onUpdateStudent(
      resetStudent,
      '宠物重置',
      `将 ${student.name} 的当前宠物重置为神秘蛋`,
    );
  };

  return (
    <div className="settings-container glass-card">
      <aside className="settings-sidebar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${item.danger ? 'danger' : ''} ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => setActiveMenu(item.id)}
            type="button"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      <main className="settings-main">
        {activeMenu === 'account' && (
          <AccountPanel
            user={user}
            theme={theme}
            themeOptions={themeOptions}
            density={density}
            densityOptions={densityOptions}
            soundEnabled={soundEnabled}
            soundVolume={soundVolume}
            onThemeChange={onThemeChange}
            onDensityChange={onDensityChange}
            onSoundEnabledChange={onSoundEnabledChange}
            onSoundVolumeChange={onSoundVolumeChange}
            onUpdatePassword={onUpdatePassword}
          />
        )}

        {activeMenu === 'class' && (
          <div className="settings-section">
            {!hasClass ? (
              <div className="empty-settings-state">请先创建班级，再管理学生与宠物数据。</div>
            ) : (
              <ClassSettingsPanel
                key={`${currentClass.id}-${currentClass.name}`}
                currentClass={currentClass}
                students={students}
                onUpdateClass={onUpdateClass}
                onImportStudents={onImportStudents}
                onRemoveStudent={onRemoveStudent}
                onBatchRemoveStudents={onBatchRemoveStudents}
                onRenameStudent={handleRenameStudent}
                onResetStudentPet={handleResetStudentPet}
                onRequestConfirm={onRequestConfirm}
              />
            )}
          </div>
        )}

        {activeMenu === 'rules' && (
          <div className="settings-section">
            {!hasClass ? (
              <div className="empty-settings-state">请先创建班级，再设置课堂奖惩规则。</div>
            ) : (
              <RulesSettingsPanel
                key={`${currentClass.id}-${(levelThresholds || DEFAULT_THRESHOLDS).join('-')}-${
                  (petConditionConfig?.hungry_days || DEFAULT_PET_CONDITION_CONFIG.hungry_days)
                }-${(petConditionConfig?.weak_days || DEFAULT_PET_CONDITION_CONFIG.weak_days)}-${
                  petConditionConfig?.sleeping_days || DEFAULT_PET_CONDITION_CONFIG.sleeping_days
                }-${(petConditionConfig?.hungry_decay ?? DEFAULT_PET_CONDITION_CONFIG.hungry_decay)}-${
                  petConditionConfig?.weak_decay ?? DEFAULT_PET_CONDITION_CONFIG.weak_decay
                }-${petConditionConfig?.sleeping_decay ?? DEFAULT_PET_CONDITION_CONFIG.sleeping_decay
                }`}
                levelThresholds={levelThresholds}
                petConditionConfig={petConditionConfig}
                rules={rules}
                onAddRule={onAddRule}
                onUpdateRule={onUpdateRule}
                onDeleteRule={onDeleteRule}
                onSaveThresholds={onSaveThresholds}
              />
            )}
          </div>
        )}

        {activeMenu === 'logs' && <LogsPanel logs={logs} onUndoLog={onUndoLog} isMutating={isMutating} />}

        {activeMenu === 'export' && (
          <div className="settings-section">
            {!hasClass ? (
              <div className="empty-settings-state">请先创建班级，再导出完整数据。</div>
            ) : (
              <ExportPanel
                currentClass={currentClass}
                students={students}
                rules={rules}
                logs={logs}
                onExportClassData={onExportClassData}
              />
            )}
          </div>
        )}

        {activeMenu === 'danger' && (
          <div className="settings-section">
            {!hasClass ? (
              <div className="empty-settings-state">请先创建班级，再执行重置或归档等危险操作。</div>
            ) : (
              <DangerZonePanel
                currentClass={currentClass}
                onResetClassProgress={onResetClassProgress}
                onArchiveClassStudents={onArchiveClassStudents}
                onRequestConfirm={onRequestConfirm}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
