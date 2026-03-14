import React, { useState } from 'react';
import './Settings.css';
import { ClipboardList, Key, Plus, Scale, Trash2, User, Users } from 'lucide-react';

const DEFAULT_THRESHOLDS = [10, 20, 30, 50, 70, 100];

const ClassSettingsPanel = ({ currentClass, students, onUpdateClass, onAddStudent, onRemoveStudent }) => {
  const [className, setClassName] = useState(currentClass?.name || '');
  const [newStudentName, setNewStudentName] = useState('');

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) {
      return;
    }

    await onAddStudent(newStudentName);
    setNewStudentName('');
  };

  return (
    <>
      <div className="section-header">
        <h3>班级学生管理</h3>
        <div className="inline-action-row compact">
          <input
            className="glass-input"
            placeholder="输入新学生姓名"
            value={newStudentName}
            onChange={(event) => setNewStudentName(event.target.value)}
          />
          <button className="add-btn" onClick={handleAddStudent} type="button">
            <Plus size={16} /> 添加学生
          </button>
        </div>
      </div>

      <div className="class-rename">
        <label>班级重命名</label>
        <div className="input-group">
          <input
            className="glass-input"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
          />
          <button className="confirm-btn small" onClick={() => onUpdateClass(className)} type="button">
            重命名
          </button>
        </div>
      </div>

      <div className="students-table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>宠物</th>
              <th>金币</th>
              <th>经验</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-table-cell">暂时还没有学生，先添加几个名字吧。</td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.pet_name || '未命名'}</td>
                  <td>💰{student.coins || 0}</td>
                  <td>⭐{student.total_exp || 0}</td>
                  <td className="actions">
                    <button
                      className="icon-btn red"
                      onClick={() => {
                        if (window.confirm(`确定要移除学生 ${student.name} 吗？`)) {
                          onRemoveStudent(student.id, student.name);
                        }
                      }}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

const RulesSettingsPanel = ({ levelThresholds, rules, onAddRule, onDeleteRule, onSaveThresholds }) => {
  const [thresholdDraft, setThresholdDraft] = useState(levelThresholds || DEFAULT_THRESHOLDS);
  const [newRule, setNewRule] = useState({
    name: '',
    icon: '⭐',
    exp: 1,
    coins: 5,
    type: 'positive',
  });

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

    await onSaveThresholds(normalizedThresholds);
  };

  const handleRuleSubmit = async () => {
    if (!newRule.name.trim()) {
      return;
    }

    await onAddRule({
      ...newRule,
      name: newRule.name.trim(),
      exp: Number(newRule.exp),
      coins: Number(newRule.coins),
    });

    setNewRule({
      name: '',
      icon: '⭐',
      exp: 1,
      coins: 5,
      type: 'positive',
    });
  };

  return (
    <>
      <div className="subsection">
        <h4>🔥 等级进阶条件设置</h4>
        <p className="hint">设置达到对应等级所需的累计经验值，数值必须逐级递增。</p>
        <div className="thresholds-grid">
          {thresholdDraft.map((threshold, index) => (
            <div key={index + 2} className="lv-input-box">
              <label>LV.{index + 2}</label>
              <input
                className="glass-input small"
                type="number"
                value={threshold}
                onChange={(event) => handleThresholdChange(index, event.target.value)}
              />
            </div>
          ))}
        </div>
        <button className="confirm-btn" onClick={handleThresholdSubmit} type="button">保存变更</button>
      </div>

      <div className="subsection mt-30">
        <div className="section-header stack-on-mobile">
          <h4>📋 课堂奖惩规则库</h4>
          <div className="rule-form-grid">
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
              placeholder="EXP"
              value={newRule.exp}
              onChange={(event) => setNewRule((prev) => ({ ...prev, exp: event.target.value }))}
            />
            <input
              className="glass-input"
              type="number"
              placeholder="金币"
              value={newRule.coins}
              onChange={(event) => setNewRule((prev) => ({ ...prev, coins: event.target.value }))}
            />
            <select
              className="glass-input"
              value={newRule.type}
              onChange={(event) => setNewRule((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="positive">正向激励</option>
              <option value="negative">需要改进</option>
            </select>
            <button className="add-btn" onClick={handleRuleSubmit} type="button">
              <Plus size={16} /> 新增规则
            </button>
          </div>
        </div>
        <div className="rules-list">
          {rules.length === 0 ? <p className="hint">暂无规则，请先添加一条课堂行为规范。</p> : (
            rules.map((rule) => (
              <div key={rule.id} className="rule-item glass-card">
                <span className="r-icon">{rule.icon}</span>
                <span className="r-name">{rule.name}</span>
                <span className="r-stats">
                  {rule.exp > 0 ? '+' : ''}{rule.exp} EXP / {rule.coins > 0 ? '+' : ''}{rule.coins} 金币
                </span>
                {rule.isSystem && <span className="system-tag">系统预设</span>}
                <div className="actions">
                  <button
                    className="icon-btn red"
                    onClick={() => onDeleteRule(rule.id)}
                    disabled={rule.isSystem}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const Settings = ({
  user,
  currentClass,
  students,
  rules,
  logs = [],
  levelThresholds,
  onUpdateClass,
  onAddStudent,
  onRemoveStudent,
  onAddRule,
  onDeleteRule,
  onSaveThresholds,
}) => {
  const [activeMenu, setActiveMenu] = useState('account');

  const menuItems = [
    { id: 'account', label: '账号管理', icon: <User size={18} /> },
    { id: 'class', label: '班级学生', icon: <Users size={18} /> },
    { id: 'rules', label: '分值规则', icon: <Scale size={18} /> },
    { id: 'logs', label: '操作日志', icon: <ClipboardList size={18} /> },
  ];

  const hasClass = Boolean(currentClass);

  return (
    <div className="settings-container glass-card">
      <aside className="settings-sidebar">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
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
          <div className="settings-section">
            <h3>账号信息</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>昵称</label>
                <span>{user.nickname}</span>
              </div>
              <div className="info-item">
                <label>特权等级</label>
                <span className="badge amber">{user.level}</span>
              </div>
              <div className="info-item">
                <label>有效期至</label>
                <span>{user.expire_at || '永久有效'}</span>
              </div>
            </div>
            <div className="password-reset">
              <h4><Key size={16} /> 演示账号说明</h4>
              <p className="hint inline-hint">当前阶段使用演示登录，后续可继续接入真实密码校验与激活码流程。</p>
            </div>
          </div>
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
                onAddStudent={onAddStudent}
                onRemoveStudent={onRemoveStudent}
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
                key={`${currentClass.id}-${(levelThresholds || DEFAULT_THRESHOLDS).join('-')}`}
                levelThresholds={levelThresholds}
                rules={rules}
                onAddRule={onAddRule}
                onDeleteRule={onDeleteRule}
                onSaveThresholds={onSaveThresholds}
              />
            )}
          </div>
        )}

        {activeMenu === 'logs' && (
          <div className="settings-section">
            <h3>📝 全系统操作日志</h3>
            {!hasClass ? (
              <div className="empty-settings-state">请先选择一个班级，日志会按班级维度展示。</div>
            ) : (
              <div className="log-list">
                {logs.length === 0 ? <p className="hint">暂无操作记录...</p> : (
                  logs.map(log => (
                    <div key={log.id} className="log-item">
                      <span className="log-time">{log.time}</span>
                      <span className="log-badge">{log.action}</span>
                      <span className="log-detail">{log.detail}</span>
                      <span className="log-user">{log.operator}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
