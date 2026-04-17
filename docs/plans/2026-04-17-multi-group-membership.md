# 学生多分组支持（一个学生可加入多个分组）

## 设计思路

不新建表，直接把 `students.group_name` 从单值字符串改为 **JSON 数组字符串**存储。

| 场景 | 改前（DB） | 改后（DB） | JS 层 |
|------|-----------|-----------|-------|
| 无分组 | `NULL` | `NULL` | `[]` |
| 单组 | `"气氛组"` | `'["气氛组"]'` | `["气氛组"]` |
| 多组 | 不支持 | `'["气氛组","测试组"]'` | `["气氛组","测试组"]` |

**JS 层 `student.group_name` 由单值字符串变为字符串数组**，所有读取处跟着改。

---

## 一、数据库

### 新建 `migrations/0026_group_name_to_array.sql`

```sql
-- 把现有单值 group_name 转为 JSON 数组格式
-- 已经是数组格式的（测试环境可能已手动改过）跳过
UPDATE students
SET group_name = json_array(group_name)
WHERE group_name IS NOT NULL
  AND group_name NOT LIKE '[%';
```

### 同步 `schema.sql`

在 students 表 `group_name` 字段的注释里标注存储格式（字段本身不变）：

```sql
-- group_name 存储 JSON 数组，如 '["第一组","气氛组"]'，无分组为 NULL
group_name TEXT DEFAULT NULL,
```

运行：`npm run db:init:local`

---

## 二、后端 `src-server/index.js`

### 改动 1：normalizeStudent（约 line 480）

```js
// 改前
group_name: row.group_name ?? null,

// 改后：解析 JSON 数组，旧格式（纯字符串）兼容处理
group_name: (() => {
  const raw = row.group_name;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed]; // 兼容旧单值格式
  } catch {
    return [raw]; // 解析失败也兼容
  }
})(),
```

### 改动 2：handleSetStudentGroups（约 line 2061）

**body 格式变更**：`assignments` 中每项由 `{ studentId, groupName: string|null }` 改为 `{ studentId, groupNames: string[] }`

```js
// 改后的 normalizedAssignments 逻辑
const normalizedAssignments = assignments
  .map((assignment) => {
    const studentId = parseId(assignment?.studentId);
    if (!studentId) return null;

    // groupNames 是数组，去重、去空、截长度
    const rawNames = Array.isArray(assignment?.groupNames) ? assignment.groupNames : [];
    const groupNames = [...new Set(
      rawNames.map((n) => String(n).trim()).filter(Boolean).map((n) => n.slice(0, 20))
    )];

    return { studentId, groupNames };
  })
  .filter(Boolean);

// 写库时序列化为 JSON，空数组存 NULL
if (normalizedAssignments.length > 0) {
  await db.batch(
    normalizedAssignments.map(({ studentId, groupNames }) =>
      db.prepare('UPDATE students SET group_name = ? WHERE id = ? AND class_id = ?')
        .bind(
          groupNames.length > 0 ? JSON.stringify(groupNames) : null,
          studentId,
          classId,
        ),
    ),
  );
}
```

---

## 三、前端 API 客户端 `src/api/client.js`

`setStudentGroups` 的调用方式不变，只是 `assignments` 里每项的格式变了（由调用方传）：

```js
// assignments 格式变为：
// [{ studentId: number, groupNames: string[] }]
// 函数签名不变，不需要改 client.js
```

---

## 四、前端 `src/components/PetParadise/PetParadise.jsx`

### 4.1 groupNames 派生数据（改动：从二维数组展平）

```js
// 改前
const groupNames = useMemo(() => {
  const names = students.map((student) => student.group_name).filter(Boolean);
  return [...new Set(names)].sort();
}, [students]);

// 改后：student.group_name 现在是数组，需要展平
const groupNames = useMemo(() => {
  const names = students.flatMap((student) => student.group_name || []);
  return [...new Set(names)].sort();
}, [students]);
```

### 4.2 visibleBulkStudents（改动：includes → 数组交叉）

```js
// 改前
const visibleBulkStudents = useMemo(
  () => activeBulkGroupFilter.length > 0
    ? feedableStudents.filter((student) => activeBulkGroupFilter.includes(student.group_name))
    : feedableStudents,
  [activeBulkGroupFilter, feedableStudents],
);

// 改后：学生的 group_name 是数组，检查是否有交集
const visibleBulkStudents = useMemo(
  () => activeBulkGroupFilter.length > 0
    ? feedableStudents.filter((student) =>
        (student.group_name || []).some((g) => activeBulkGroupFilter.includes(g))
      )
    : feedableStudents,
  [activeBulkGroupFilter, feedableStudents],
);
```

### 4.3 filteredStudents（改动：同上）

```js
// 改前
if (activeGroupFilter.length > 0) {
  list = list.filter((student) => activeGroupFilter.includes(student.group_name));
}

// 改后
if (activeGroupFilter.length > 0) {
  list = list.filter((student) =>
    (student.group_name || []).some((g) => activeGroupFilter.includes(g))
  );
}
```

### 4.4 useEffect 分组消失清理（改动：引用方式）

```js
// 逻辑不变，只是 student.group_name 变成数组了，groupNames 的计算已在 4.1 改好
// 这两个 useEffect 本身不需要改
```

### 4.5 groupDraftAssign 的类型变化（核心改动）

```js
// 改前：{ [studentId]: string | null }
// 改后：{ [studentId]: string[] }

// 初始化（useEffect 里）改为：
students.forEach((student) => {
  init[student.id] = Array.isArray(student.group_name) ? [...student.group_name] : [];
});
```

### 4.6 handleToggleStudentInGroup（核心改动）

```js
// 改前：单值切换
const handleToggleStudentInGroup = (studentId) => {
  if (!selectedGroupName) return;
  setGroupDraftAssign((prev) => {
    const current = prev[studentId];
    if (current === selectedGroupName) return { ...prev, [studentId]: null };
    return { ...prev, [studentId]: selectedGroupName };
  });
};

// 改后：数组切换（toggle in/out）
const handleToggleStudentInGroup = (studentId) => {
  if (!selectedGroupName) return;
  setGroupDraftAssign((prev) => {
    const currentGroups = prev[studentId] || [];
    const isInGroup = currentGroups.includes(selectedGroupName);
    const newGroups = isInGroup
      ? currentGroups.filter((g) => g !== selectedGroupName)  // 移出
      : [...currentGroups, selectedGroupName];                 // 加入
    return { ...prev, [studentId]: newGroups };
  });
};
```

### 4.7 handleSaveGroups 调用改动

```js
// 改前：每项是 { studentId, groupName: string | null }
const assignments = students
  .filter(...)
  .map((student) => ({
    studentId: student.id,
    groupName: groupDraftAssign[student.id] ?? null,
  }));

// 改后：每项是 { studentId, groupNames: string[] }
const assignments = students
  .filter((student) => {
    const original = JSON.stringify([...(student.group_name || [])].sort());
    const draft = JSON.stringify([...(groupDraftAssign[student.id] || [])].sort());
    return original !== draft; // 比较排序后的数组，忽略顺序差异
  })
  .map((student) => ({
    studentId: student.id,
    groupNames: groupDraftAssign[student.id] || [],
  }));
```

### 4.8 管理分组 Modal 中 isInGroup 判断改动

```jsx
// 改前
const isInGroup = groupDraftAssign[student.id] === selectedGroupName;
const otherGroup = groupDraftAssign[student.id] && groupDraftAssign[student.id] !== selectedGroupName
  ? groupDraftAssign[student.id] : null;

// 改后
const currentGroups = groupDraftAssign[student.id] || [];
const isInGroup = currentGroups.includes(selectedGroupName);
// 显示该学生所在的其他分组（排除当前选中的）
const otherGroups = currentGroups.filter((g) => g !== selectedGroupName);
```

显示其他组标签也要改为循环：
```jsx
// 改前
{otherGroup && <span className="group-student-other-tag">{otherGroup}</span>}

// 改后
{otherGroups.map((g) => (
  <span key={g} className="group-student-other-tag">{g}</span>
))}
```

### 4.9 批量互动学生行 group tag 改动

```jsx
// 改前
{student.group_name && (
  <span className="bulk-student-group-tag">{student.group_name}</span>
)}

// 改后（显示所有分组）
{(student.group_name || []).map((g) => (
  <span key={g} className="bulk-student-group-tag">{g}</span>
))}
```

### 4.10 批量互动分组快选计数改动

```jsx
// 改前
const groupCount = feedableStudents.filter((s) => s.group_name === name).length;

// 改后
const groupCount = feedableStudents.filter((s) => (s.group_name || []).includes(name)).length;
```

---

## 五、改动文件总览

| 文件 | 改动 |
|------|------|
| `migrations/0026_group_name_to_array.sql` | 新建，把单值转 JSON 数组 |
| `schema.sql` | 注释说明存储格式 |
| `src-server/index.js` | normalizeStudent 解析为数组 + handleSetStudentGroups 改写入逻辑 |
| `src/components/PetParadise/PetParadise.jsx` | 约 10 处引用 `student.group_name` 的地方改为数组操作 |

**client.js、App.jsx、CSS 不需要改。**

---

## 六、验证步骤

1. `npm run db:init:local` 应用 migration 0026，确认现有"气氛组"/"测试组"学生的 group_name 变为 `["气氛组"]` / `["测试组"]`
2. 管理分组弹窗：选中"气氛组"→ 对某学生打勾 → 切换到"测试组"→ 对同一学生也打勾 → 保存
3. 该学生右侧同时出现两个分组标签
4. 宠物乐园 filter：同时选中"气氛组"和"测试组"→ 该学生只出现一次（去重）
5. 管理分组弹窗重新打开：该学生在"气氛组"和"测试组"都显示勾选状态
6. 批量互动：同时选"气氛组"和"测试组"→ 该学生只出现一次
7. 取消该学生的某个分组 → 保存后只剩一个标签
