# Plan A：超管后台所有面板默认收缩

## 改动范围

**只改一个文件**：`src/components/Admin/AdminConsole.jsx`

当前有 3 个面板写了 `defaultOpen`（意为默认展开），把它们全部去掉即可。
其余面板本来就是 `defaultOpen={false}`（或未传，默认值 false），无需改动。

---

## 具体改动

找到以下三处，把 `defaultOpen` 属性删掉（或改为 `defaultOpen={false}`）：

### 改动 1 — 渠道入口管理（约 line 945）

```jsx
// 改前
<CollapsiblePanel
  title="渠道入口管理"
  description="..."
  defaultOpen
>

// 改后
<CollapsiblePanel
  title="渠道入口管理"
  description="..."
>
```

### 改动 2 — 免激活注册（约 line 1143）

```jsx
// 改前
<CollapsiblePanel
  title="免激活注册"
  description="..."
  defaultOpen
>

// 改后
<CollapsiblePanel
  title="免激活注册"
  description="..."
>
```

### 改动 3 — 账户管理（约 line 1318）

```jsx
// 改前
<CollapsiblePanel
  title="账户管理"
  description="..."
  defaultOpen
>

// 改后
<CollapsiblePanel
  title="账户管理"
  description="..."
>
```

---

## 验证

1. 超管登录，进入控制台
2. 所有面板（渠道入口管理、免激活注册、账户管理、激活码管理、通知管理、反馈工单、超管操作日志等）初始均为**收缩状态**
3. 点击任意面板标题可正常展开/收缩
