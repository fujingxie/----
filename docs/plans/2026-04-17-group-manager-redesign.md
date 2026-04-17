# 管理分组弹窗重设计（左右分栏交互）

## 背景

现有实现是「每个学生填一个输入框」，体验差。
新设计是**分组中心式**：左边管理分组列表，右边勾选该分组的学生。

## 新交互逻辑

```
┌─────────────────────────────────────────────────────┐
│  管理分组                                        ×   │
├────────────────────┬────────────────────────────────┤
│  分组列表           │  [🔍 输入姓名搜索]              │
│  ─────────────     │  ─────────────────────────     │
│  ▶ 第一组          │  ☑ 同学 A                      │
│    第二组          │  ☑ 同学 B                      │
│    第三组          │  ☐ 同学 C                      │
│                    │  ☐ 同学 D                      │
│  [＋ 新建分组]     │                                │
├────────────────────┴────────────────────────────────┤
│                                  [取消]  [保存]      │
└─────────────────────────────────────────────────────┘
```

**交互规则：**
1. 左侧点击某分组 → 右侧学生列表显示全班，已属于该组的打勾
2. 勾选/取消勾选学生 → 保存后这些学生的 group_name 变为当前分组
3. 一个学生只能属于一个分组（勾选 A 组再去 B 组打勾会把该学生从 A 移到 B）
4. "＋ 新建分组" → 行内出现输入框，填写名字回车/点确认创建（创建即选中）
5. 搜索框实时过滤右侧学生列表
6. **保存时只提交有变化的学生**，未改动的不发请求

---

## 一、后端 & API 不需要改动

`PATCH /api/students/groups` 接口完全够用，data model 不变。

---

## 二、只改前端两个文件

### 文件 1：`src/components/PetParadise/PetParadise.jsx`

#### 2.1 替换 state（找到 line 133-134，改为以下）

```js
// 删除旧的：
// const [isGroupSettingMode, setIsGroupSettingMode] = useState(false);
// const [groupDraft, setGroupDraft] = useState({});

// 换成：
const [isGroupSettingMode, setIsGroupSettingMode] = useState(false);
const [selectedGroupName, setSelectedGroupName] = useState(null);  // 左侧当前选中的分组
const [groupDraftAssign, setGroupDraftAssign] = useState({});       // { [studentId]: groupName | null }
const [groupSearch, setGroupSearch] = useState('');                  // 右侧搜索
const [newGroupInput, setNewGroupInput] = useState('');              // 新建分组输入框内容
const [isAddingGroup, setIsAddingGroup] = useState(false);           // 是否显示新建分组输入框
```

#### 2.2 删除旧的 useEffect（约 line 246-256，涉及 isGroupSettingMode 初始化 groupDraft 的那段）

找到并删除：
```js
// 删除这整段
useEffect(() => {
  if (!isGroupSettingMode) {
    ...
  }
}, [isGroupSettingMode, students]);
```

#### 2.3 新增分组管理相关的派生数据（在 groupNames 的 useMemo 旁边）

```js
// 打开弹窗时初始化 draft（只在打开时执行一次）
useEffect(() => {
  if (isGroupSettingMode) {
    const init = {};
    students.forEach((s) => { init[s.id] = s.group_name ?? null; });
    setGroupDraftAssign(init);
    setSelectedGroupName(groupNames[0] ?? null); // 默认选第一个分组（没有则 null）
    setGroupSearch('');
    setIsAddingGroup(false);
    setNewGroupInput('');
  }
}, [isGroupSettingMode]); // 故意不加 students/groupNames，只在 open 时初始化
```

#### 2.4 替换 handleSaveGroups（约 line 527，整个函数替换）

```js
const handleSaveGroups = async () => {
  // 只提交有变化的学生
  const assignments = students
    .filter((s) => {
      const original = s.group_name ?? null;
      const draft = groupDraftAssign[s.id] ?? null;
      return original !== draft;
    })
    .map((s) => ({
      studentId: s.id,
      groupName: groupDraftAssign[s.id] ?? null,
    }));

  if (assignments.length === 0) {
    setIsGroupSettingMode(false);
    return;
  }

  try {
    setIsSavingGroups(true);
    await setStudentGroups({
      userId: currentUser.id,
      classId: currentClass.id,
      assignments,
    });
    await onRefreshStudents?.();
    setIsGroupSettingMode(false);
  } catch (e) {
    console.error('[DEBUG] handleSaveGroups failed:', e);
    setGroupError(e?.message || '保存失败，请重试');
  } finally {
    setIsSavingGroups(false);
  }
};
```

#### 2.5 新增分组管理 Modal 内的交互 handlers（放在 handleSaveGroups 后面）

```js
// 左侧选中某分组
const handleSelectGroup = (name) => {
  setSelectedGroupName(name);
  setGroupSearch('');
};

// 右侧勾选/取消勾选学生
const handleToggleStudentInGroup = (studentId) => {
  setGroupDraftAssign((prev) => {
    const current = prev[studentId];
    // 如果已经在当前分组，点击则移出（设为 null）
    if (current === selectedGroupName) {
      return { ...prev, [studentId]: null };
    }
    // 否则加入当前分组（即使之前在别的组，也直接覆盖）
    return { ...prev, [studentId]: selectedGroupName };
  });
};

// 新建分组确认
const handleAddGroup = () => {
  const name = newGroupInput.trim();
  if (!name) return;
  // 选中新分组（groupNames 会在下次渲染时包含它，如果已有同名则直接选）
  setSelectedGroupName(name);
  setIsAddingGroup(false);
  setNewGroupInput('');
};
```

#### 2.6 替换 Modal JSX（约 line 867-901，整个 Modal 替换）

```jsx
<Modal
  isOpen={isGroupSettingMode}
  onClose={() => setIsGroupSettingMode(false)}
  title="管理分组"
  contentClassName="group-manager-modal"
>
  <div className="group-manager-shell">
    {/* 左侧：分组列表 */}
    <div className="group-manager-left">
      <div className="group-manager-list">
        {/* 从 groupDraftAssign 里动态提取当前存在的分组名 */}
        {[...new Set(Object.values(groupDraftAssign).filter(Boolean))].sort().map((name) => (
          <button
            key={name}
            type="button"
            className={`group-manager-item ${selectedGroupName === name ? 'active' : ''}`}
            onClick={() => handleSelectGroup(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {/* 新建分组 */}
      {isAddingGroup ? (
        <div className="group-manager-add-input">
          <input
            type="text"
            className="glass-input compact"
            placeholder="分组名称"
            maxLength={20}
            autoFocus
            value={newGroupInput}
            onChange={(e) => setNewGroupInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddGroup();
              if (e.key === 'Escape') { setIsAddingGroup(false); setNewGroupInput(''); }
            }}
          />
          <button type="button" className="confirm-btn micro" onClick={handleAddGroup}>确认</button>
        </div>
      ) : (
        <button
          type="button"
          className="group-manager-add-btn"
          onClick={() => setIsAddingGroup(true)}
        >
          ＋ 新建分组
        </button>
      )}
    </div>

    {/* 右侧：学生列表 */}
    <div className="group-manager-right">
      <input
        type="text"
        className="glass-input compact group-manager-search"
        placeholder="搜索学生姓名…"
        value={groupSearch}
        onChange={(e) => setGroupSearch(e.target.value)}
      />
      {selectedGroupName ? (
        <div className="group-manager-students">
          {students
            .filter((s) => s.name.includes(groupSearch))
            .map((s) => {
              const isInGroup = groupDraftAssign[s.id] === selectedGroupName;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`group-manager-student-row ${isInGroup ? 'checked' : ''}`}
                  onClick={() => handleToggleStudentInGroup(s.id)}
                >
                  <span className={`group-check-icon ${isInGroup ? 'checked' : ''}`}>
                    {isInGroup ? '☑' : '☐'}
                  </span>
                  <span className="group-student-name">{s.name}</span>
                  {/* 若该学生在别的组，显示当前所属组 */}
                  {groupDraftAssign[s.id] && groupDraftAssign[s.id] !== selectedGroupName && (
                    <span className="group-student-other-tag">{groupDraftAssign[s.id]}</span>
                  )}
                </button>
              );
            })}
        </div>
      ) : (
        <div className="group-manager-empty">先在左侧选择或新建一个分组</div>
      )}
    </div>
  </div>

  {groupError ? <div className="group-setting-error">{groupError}</div> : null}
  <div className="group-setting-actions">
    <button type="button" onClick={() => setIsGroupSettingMode(false)} disabled={isSavingGroups}>
      取消
    </button>
    <button type="button" className="confirm-btn" onClick={handleSaveGroups} disabled={isSavingGroups}>
      {isSavingGroups ? '保存中...' : '保存'}
    </button>
  </div>
</Modal>
```

---

### 文件 2：`src/components/PetParadise/PetParadise.css`

找到现有的 `group-setting-*` 样式（在文件末尾），**全部替换**为以下：

```css
/* ─── 管理分组 Modal ─── */
.group-manager-modal {
  max-width: 580px !important;
  width: 92vw !important;
}

.group-manager-shell {
  display: flex;
  gap: 0;
  height: 400px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  overflow: hidden;
}

/* 左侧分组列表 */
.group-manager-left {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0, 0, 0, 0.07);
  background: rgba(0, 0, 0, 0.02);
}

.group-manager-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-manager-item {
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  transition: background 0.12s;
}

.group-manager-item:hover {
  background: rgba(99, 102, 241, 0.06);
}

.group-manager-item.active {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  font-weight: 700;
}

.group-manager-add-btn {
  margin: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(99, 102, 241, 0.3);
  background: transparent;
  font-size: 12px;
  color: #6366f1;
  cursor: pointer;
  text-align: center;
  transition: background 0.12s;
}

.group-manager-add-btn:hover {
  background: rgba(99, 102, 241, 0.06);
}

.group-manager-add-input {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.group-manager-add-input .glass-input {
  flex: 1;
  min-width: 0;
}

/* 右侧学生列表 */
.group-manager-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 10px 6px;
  gap: 8px;
}

.group-manager-search {
  flex-shrink: 0;
  width: 100%;
}

.group-manager-students {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-manager-student-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s;
}

.group-manager-student-row:hover {
  background: rgba(0, 0, 0, 0.03);
}

.group-manager-student-row.checked {
  background: rgba(99, 102, 241, 0.06);
}

.group-check-icon {
  font-size: 16px;
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.25);
  line-height: 1;
}

.group-check-icon.checked {
  color: #6366f1;
}

.group-student-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-student-other-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  flex-shrink: 0;
}

.group-manager-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  opacity: 0.45;
}

.group-setting-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 6px;
}

.group-setting-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ─── 夜间模式 ─── */
:root[data-theme='night'] .group-manager-shell {
  border-color: rgba(255, 255, 255, 0.08);
}

:root[data-theme='night'] .group-manager-left {
  border-right-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

:root[data-theme='night'] .group-manager-student-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

:root[data-theme='night'] .group-manager-student-row.checked {
  background: rgba(99, 102, 241, 0.12);
}

:root[data-theme='night'] .group-setting-actions {
  border-top-color: rgba(255, 255, 255, 0.06);
}
```

---

## 三、改动文件总览

| 文件 | 改动 |
|------|------|
| `src/components/PetParadise/PetParadise.jsx` | 替换 state、handlers、Modal JSX（约 5 处定点修改） |
| `src/components/PetParadise/PetParadise.css` | 替换 group-setting-* 样式为新的 group-manager-* |

后端、API、数据库不需要任何改动。

---

## 四、验证步骤

1. 点「管理分组」→ 弹窗左右分栏正常显示
2. 左侧无分组时，点「＋ 新建分组」→ 出现输入框，填写"第一组"回车 → 左侧出现"第一组"并自动选中
3. 右侧显示全班学生，全部未勾选
4. 勾选几位同学 → 打勾图标变为 ☑ 且行背景变色
5. 再新建"第二组"，勾选另外几位同学（包括一位已在第一组的）
6. 保存 → 该学生从第一组移到第二组
7. 宠物乐园 filter 栏出现"第一组"/"第二组"按钮
8. 批量互动弹窗学生列表显示分组标签
9. 再次打开管理分组 → 左侧显示已有分组，右侧已勾选状态正确还原
