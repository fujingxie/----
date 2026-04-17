# Plan B：宠物乐园学生分组 + 批量互动按分组

## 功能描述

- 老师可以给班级学生划分自定义分组（如"第一组"、"A 组"）
- 宠物乐园可以按分组过滤显示
- 批量互动弹窗里可以快速选中某个分组的所有学生

---

## 一、数据库

### 新建 `migrations/0025_student_groups.sql`

```sql
-- 给学生表添加分组字段（nullable，不分组的学生为 null）
ALTER TABLE students ADD COLUMN group_name TEXT DEFAULT NULL;

-- 分组查询索引（按班级查分组列表时用）
CREATE INDEX IF NOT EXISTS idx_students_group ON students(class_id, group_name);
```

### 同步更新 `schema.sql`

在 students 表的 CREATE TABLE 语句里（`reward_count` 字段之后）添加：

```sql
group_name TEXT DEFAULT NULL,
```

运行：`npm run db:init:local`

---

## 二、后端 `src-server/index.js`

### 改动 1：STUDENT_SELECT_FIELDS 加入 group_name（line 15）

```js
// 改前
const STUDENT_SELECT_FIELDS = `id, class_id, name, pet_status, pet_condition, last_fed_at, last_decay_at, pet_condition_locked_at, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, lifetime_exp, total_coins, reward_count, pet_collection, created_at`;

// 改后（末尾加 group_name）
const STUDENT_SELECT_FIELDS = `id, class_id, name, pet_status, pet_condition, last_fed_at, last_decay_at, pet_condition_locked_at, pet_name, pet_type_id, pet_level, pet_points, coins, total_exp, lifetime_exp, total_coins, reward_count, pet_collection, created_at, group_name`;
```

### 改动 2：normalizeStudent 加入 group_name（约 line 464）

在 normalizeStudent 函数返回对象里加一行：

```js
group_name: raw.group_name ?? null,
```

### 改动 3：新增批量设置分组的 handler

在通知路由附近新增 handler（函数名 `handleSetStudentGroups`）：

```js
// PATCH /api/students/groups
// body: { userId, classId, assignments: [{ studentId, groupName }] }
// 功能：批量设置学生分组，groupName 为 null 时清空分组
async function handleSetStudentGroups(request, env) {
  const { userId, classId, assignments } = await readBody(request);
  if (!userId || !classId || !Array.isArray(assignments)) {
    return error('参数不完整', 400);
  }
  const db = getDb(env);
  // 验证 classId 归属（userId 是该班级的老师）
  const cls = await db.prepare(
    'SELECT id FROM classes WHERE id = ? AND user_id = ?'
  ).bind(classId, userId).first();
  if (!cls) return error('无权限', 403);

  // 批量 UPDATE
  const statements = assignments.map(({ studentId, groupName }) =>
    db.prepare(
      'UPDATE students SET group_name = ? WHERE id = ? AND class_id = ?'
    ).bind(groupName || null, studentId, classId)
  );
  if (statements.length > 0) {
    await db.batch(statements);
  }
  return ok({ updated: statements.length });
}
```

### 改动 4：注册路由

在 `PATCH /api/students` 附近加（精确匹配 `/api/students/groups`）：

```js
if (method === 'PATCH' && path === '/api/students/groups') {
  return handleSetStudentGroups(request, env);
}
```

**注意**：这条路由要放在其他 `/api/students/...` 路由之前，避免被更宽泛的正则误匹配。

---

## 三、前端 API 客户端 `src/api/client.js`

在文件末尾追加：

```js
// 批量设置学生分组
export const setStudentGroups = ({ userId, classId, assignments }) =>
  request('/students/groups', {
    method: 'PATCH',
    body: JSON.stringify({ userId, classId, assignments }),
  });
```

---

## 四、宠物乐园前端 `src/components/PetParadise/PetParadise.jsx`

### 4.1 新增 import

```js
import { setStudentGroups } from '../../api/client';
```

### 4.2 新增 state（紧跟 activeFilter 附近，约 line 128）

```js
const [activeGroupFilter, setActiveGroupFilter] = useState(null); // null = 不按分组过滤
const [isGroupSettingMode, setIsGroupSettingMode] = useState(false); // 分组设置弹窗
```

### 4.3 新增派生数据（紧跟 filteredStudents 之后，约 line 172）

```js
// 当前班级所有有效分组名（去重、排序）
const groupNames = useMemo(() => {
  const names = students
    .map((s) => s.group_name)
    .filter(Boolean);
  return [...new Set(names)].sort();
}, [students]);
```

### 4.4 更新 filteredStudents（约 line 162）

在现有过滤逻辑基础上再叠加分组过滤：

```js
const filteredStudents = useMemo(() => {
  let list = students;

  if (activeFilter === 'attention') {
    list = list.filter((s) => s.pet_status !== 'egg' && s.pet_condition !== 'healthy');
  } else if (activeFilter === 'sleeping') {
    list = list.filter((s) => s.pet_status !== 'egg' && s.pet_condition === 'sleeping');
  }

  // 新增：按分组过滤
  if (activeGroupFilter) {
    list = list.filter((s) => s.group_name === activeGroupFilter);
  }

  return list;
}, [activeFilter, activeGroupFilter, students]);
```

### 4.5 过滤行加分组按钮（约 line 736-758）

在现有的"全部 / 需喂养 / 已休眠"三个 chip 之后，追加分组按钮区块：

```jsx
{/* 分组筛选：只有存在分组数据时才显示 */}
{groupNames.length > 0 && (
  <>
    <span className="pet-filter-divider">|</span>
    {groupNames.map((name) => (
      <button
        key={name}
        className={`pet-filter-chip group ${activeGroupFilter === name ? 'active' : ''}`}
        onClick={() => setActiveGroupFilter((prev) => (prev === name ? null : name))}
        type="button"
      >
        {name}
      </button>
    ))}
  </>
)}
```

### 4.6 "管理分组"按钮（放在顶部工具栏，紧跟"批量互动"按钮之后）

```jsx
<button
  type="button"
  className="pet-action-btn secondary"
  onClick={() => setIsGroupSettingMode(true)}
>
  管理分组
</button>
```

### 4.7 批量互动 Modal 里加分组快选（约 line 851-871）

在「选择学生」panel 的 head 下方，列表上方，加一行分组快选工具：

```jsx
{/* 分组快选 */}
{groupNames.length > 0 && (
  <div className="bulk-group-chips">
    {groupNames.map((name) => {
      const groupIds = feedableStudents
        .filter((s) => s.group_name === name)
        .map((s) => s.id);
      const allSelected = groupIds.length > 0 && groupIds.every((id) => selectedStudentIds.includes(id));
      return (
        <button
          key={name}
          type="button"
          className={`bulk-group-chip ${allSelected ? 'active' : ''}`}
          onClick={() => {
            if (allSelected) {
              // 取消选中本组
              setSelectedStudentIds((prev) => prev.filter((id) => !groupIds.includes(id)));
            } else {
              // 选中本组（合并已选）
              setSelectedStudentIds((prev) => [...new Set([...prev, ...groupIds])]);
            }
          }}
        >
          {name}（{groupIds.length}人）
        </button>
      );
    })}
  </div>
)}
```

学生列表行也顺带显示分组标签（name 右侧），方便对照：

```jsx
<button
  key={student.id}
  className={`bulk-student-row ${isSelected ? 'active' : ''}`}
  onClick={() => toggleSelectStudent(student)}
  type="button"
>
  <span className="bulk-student-name">{student.name}</span>
  {student.group_name && (
    <span className="bulk-student-group-tag">{student.group_name}</span>
  )}
</button>
```

### 4.8 分组设置 Modal（新增组件或内嵌实现）

在 PetParadise.jsx 内嵌一个简单的分组设置 Modal（直接复用 `<Modal>` 外壳）：

**state：**
```js
const [groupDraft, setGroupDraft] = useState({}); // { [studentId]: groupName }
```

**打开时初始化 draft：**
```js
useEffect(() => {
  if (isGroupSettingMode) {
    const init = {};
    students.forEach((s) => { init[s.id] = s.group_name || ''; });
    setGroupDraft(init);
  }
}, [isGroupSettingMode, students]);
```

**保存逻辑：**
```js
const handleSaveGroups = async () => {
  const assignments = students.map((s) => ({
    studentId: s.id,
    groupName: groupDraft[s.id]?.trim() || null,
  }));
  await setStudentGroups({ userId: currentUser.id, classId: currentClass.id, assignments });
  await onRefreshStudents?.(); // 重新拉取学生数据
  setIsGroupSettingMode(false);
};
```

**Modal 内容：**
```jsx
<Modal
  isOpen={isGroupSettingMode}
  onClose={() => setIsGroupSettingMode(false)}
  title="管理分组"
>
  <div className="group-setting-hint">
    填写分组名（如"第一组"），相同名字会归为一组，留空表示不分组。
  </div>
  <div className="group-setting-list">
    {students.map((s) => (
      <div key={s.id} className="group-setting-row">
        <span className="group-setting-name">{s.name}</span>
        <input
          type="text"
          className="glass-input compact group-input"
          placeholder="不分组"
          maxLength={20}
          value={groupDraft[s.id] ?? ''}
          onChange={(e) => setGroupDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
        />
      </div>
    ))}
  </div>
  <div className="group-setting-actions">
    <button type="button" onClick={() => setIsGroupSettingMode(false)}>取消</button>
    <button type="button" className="confirm-btn" onClick={handleSaveGroups}>保存</button>
  </div>
</Modal>
```

---

## 五、CSS `src/components/PetParadise/PetParadise.css`

追加以下样式（在文件末尾）：

```css
/* ─── 分组筛选芯片 ─── */
.pet-filter-divider {
  color: rgba(0, 0, 0, 0.15);
  margin: 0 2px;
  font-size: 14px;
  align-self: center;
}

.pet-filter-chip.group {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.pet-filter-chip.group.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: rgba(245, 158, 11, 0.4);
  font-weight: 700;
}

/* ─── 批量互动分组快选 ─── */
.bulk-group-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 8px;
}

.bulk-group-chip {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.bulk-group-chip.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: rgba(245, 158, 11, 0.5);
}

.bulk-student-group-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  flex-shrink: 0;
}

/* ─── 分组设置 Modal ─── */
.group-setting-hint {
  font-size: 13px;
  opacity: 0.6;
  margin-bottom: 12px;
  line-height: 1.5;
}

.group-setting-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 55vh;
  overflow-y: auto;
  padding-right: 4px;
}

.group-setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.group-setting-name {
  font-size: 14px;
  font-weight: 600;
  width: 72px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-input {
  flex: 1;
}

.group-setting-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* 夜间模式 */
:root[data-theme='night'] .pet-filter-divider {
  color: rgba(255, 255, 255, 0.15);
}

:root[data-theme='night'] .bulk-group-chips {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

:root[data-theme='night'] .group-setting-actions {
  border-top-color: rgba(255, 255, 255, 0.06);
}
```

---

## 六、改动文件总览

| 文件 | 类型 | 说明 |
|------|------|------|
| `migrations/0025_student_groups.sql` | 新建 | students 表加 group_name 字段 |
| `schema.sql` | 修改 | 同步 group_name 字段定义 |
| `src-server/index.js` | 修改 | STUDENT_SELECT_FIELDS + normalizeStudent + 新 handler + 路由 |
| `src/api/client.js` | 修改 | 新增 setStudentGroups 函数 |
| `src/components/PetParadise/PetParadise.jsx` | 修改 | 分组 state + 过滤逻辑 + 按钮 + 分组设置 Modal |
| `src/components/PetParadise/PetParadise.css` | 修改 | 分组相关样式 |

---

## 七、验证步骤

1. `npm run db:init:local` 应用 0025 migration，确认 students 表有 group_name 列
2. 宠物乐园 → 点「管理分组」→ 给几位学生填写分组名（如"第一组"/"第二组"）→ 保存
3. 页面刷新后，filter 芯片行出现分组按钮
4. 点分组按钮，仅显示该分组的学生
5. 再次点击分组按钮，取消过滤，回到全部显示
6. 打开「批量互动」→ 学生面板顶部出现分组快选按钮
7. 点分组快选按钮 → 该组所有已有宠物的学生被选中 → 再点一次 → 取消选中
8. 学生行右侧显示分组标签
9. 对"第一组"执行批量互动 → 日志中只有第一组学生的记录
10. 夜间模式下样式正常
