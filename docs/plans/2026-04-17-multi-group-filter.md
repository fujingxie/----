# 分组多选过滤修复

## 问题

当前宠物乐园 filter 和批量互动的分组过滤都是**单选**（activeGroupFilter / activeBulkGroupFilter 是 `string | null`），用户无法同时选中多个分组。

## 数据模型说明（不需要改）

学生仍然是"1个学生只能属于1个分组"（group_name TEXT 单值），这是正确的。
多选分组的语义是**并集**：选中"第一组"和"第二组"，显示属于第一组 OR 第二组的所有学生。
不存在"一个学生在多个组"的情况，所以没有去重问题。

---

## 只改一个文件：`src/components/PetParadise/PetParadise.jsx`

### 改动 1：state 类型从 `string | null` 改为 `string[]`

```js
// 改前（约 line 130-131）
const [activeGroupFilter, setActiveGroupFilter] = useState(null);
const [activeBulkGroupFilter, setActiveBulkGroupFilter] = useState(null);

// 改后
const [activeGroupFilter, setActiveGroupFilter] = useState([]);    // 空数组 = 不过滤
const [activeBulkGroupFilter, setActiveBulkGroupFilter] = useState([]); // 空数组 = 不过滤
```

### 改动 2：filteredStudents 过滤逻辑

```js
// 改前（约 line 201）
if (activeGroupFilter) {
  list = list.filter((student) => student.group_name === activeGroupFilter);
}

// 改后
if (activeGroupFilter.length > 0) {
  list = list.filter((student) => activeGroupFilter.includes(student.group_name));
}
```

### 改动 3：visibleBulkStudents 过滤逻辑

```js
// 改前（约 line 159）
const visibleBulkStudents = useMemo(
  () => activeBulkGroupFilter
    ? feedableStudents.filter((student) => student.group_name === activeBulkGroupFilter)
    : feedableStudents,
  [activeBulkGroupFilter, feedableStudents],
);

// 改后
const visibleBulkStudents = useMemo(
  () => activeBulkGroupFilter.length > 0
    ? feedableStudents.filter((student) => activeBulkGroupFilter.includes(student.group_name))
    : feedableStudents,
  [activeBulkGroupFilter, feedableStudents],
);
```

### 改动 4：分组消失时清理逻辑（两个 useEffect）

```js
// 改前（约 line 262）
useEffect(() => {
  if (activeGroupFilter && !groupNames.includes(activeGroupFilter)) {
    setActiveGroupFilter(null);
  }
}, [activeGroupFilter, groupNames]);

useEffect(() => {
  if (activeBulkGroupFilter && !groupNames.includes(activeBulkGroupFilter)) {
    setActiveBulkGroupFilter(null);
  }
}, [activeBulkGroupFilter, groupNames]);

// 改后（过滤掉已不存在的分组名）
useEffect(() => {
  setActiveGroupFilter((prev) => prev.filter((name) => groupNames.includes(name)));
}, [groupNames]);

useEffect(() => {
  setActiveBulkGroupFilter((prev) => prev.filter((name) => groupNames.includes(name)));
}, [groupNames]);
```

### 改动 5：宠物乐园 filter 栏分组按钮点击逻辑

```jsx
// 改前（约 line 922）
onClick={() => setActiveGroupFilter((prev) => (prev === name ? null : name))}

// 改后（切换选中/取消选中，支持多选）
onClick={() =>
  setActiveGroupFilter((prev) =>
    prev.includes(name)
      ? prev.filter((n) => n !== name)   // 已选中 → 取消
      : [...prev, name]                   // 未选中 → 加入
  )
}

// 激活态判断也要改
className={`pet-filter-chip group ${activeGroupFilter.includes(name) ? 'active' : ''}`}
```

### 改动 6：批量互动弹窗分组快选按钮点击逻辑

```jsx
// 改前（约 line 1148）
onClick={() => setActiveBulkGroupFilter((prev) => (prev === name ? null : name))}

// 改后
onClick={() =>
  setActiveBulkGroupFilter((prev) =>
    prev.includes(name)
      ? prev.filter((n) => n !== name)
      : [...prev, name]
  )
}

// 激活态判断
className={`bulk-group-chip ${activeBulkGroupFilter.includes(name) ? 'active' : ''}`}
```

---

## 验证步骤

1. 宠物乐园 filter 栏：同时点击"第一组"和"第二组"→ 两个按钮都高亮，显示两组所有学生
2. 再点一次"第一组"→ 取消，只剩第二组学生
3. 全部取消 → 显示所有学生
4. 批量互动弹窗：同时选中多个分组 → 两组学生都出现在列表
5. 「全选可见学生」按钮 → 只全选当前过滤后的学生
6. 管理分组中保存，某分组消失后 → 宠物乐园和批量互动已选该组的状态自动清空
