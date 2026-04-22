# 自定义宠物系统 — 模块二：领养弹窗改造 + 合并静态与自定义宠物

## 背景

模块一完成了 R2 上传和超管管理界面。本模块让自定义宠物出现在领养流程中：
- 领养弹窗加类别 Tab，合并静态 + DB 自定义宠物
- 批量领养随机时也包含自定义宠物
- 自定义宠物图片通过 `/api/pets/images/:key` 代理展示

**核心设计**：
- 自定义宠物的 `pet_type_id` 格式：`custom:${db_id}`（如 `custom:3`）
- `getPetImagePath` 扩展支持 `custom:` 前缀，通过模块级缓存查找 R2 key
- 不改动 `activateStudentPet` 和后端学生数据结构

---

## 一、后端 `src-server/index.js` — 新增 1 个公开接口

### 新增 `handleGetPublicCustomPets`

```js
// GET /api/pets/custom （无需鉴权，前端公开获取）
async function handleGetPublicCustomPets(request, env) {
  const db = getDb(env);
  const { results } = await db.prepare(
    'SELECT * FROM custom_pets ORDER BY category, name'
  ).all();
  return json({ pets: results || [] });
}
```

### 路由注册（在现有 `/api/pets/images` 路由附近）

```js
if (path === '/api/pets/custom' && method === 'GET') {
  return handleGetPublicCustomPets(request, env);
}
```

---

## 二、前端 API `src/api/client.js` — 新增 1 个函数

```js
// 公开获取自定义宠物列表（无需 userId）
export const fetchPublicCustomPets = () =>
  request('/pets/custom');
```

---

## 三、`src/api/petLibrary.js` — 扩展支持自定义宠物

### 3.1 新增模块级缓存 + setter

```js
// 模块级缓存，由 App.jsx 登录后调用 setCustomPetsCache 写入
let _customPetsCache = [];

export const setCustomPetsCache = (pets) => {
  _customPetsCache = Array.isArray(pets) ? pets : [];
};

export const getCustomPetsCache = () => _customPetsCache;
```

### 3.2 修改 `getPetImagePath` 支持 `custom:` 前缀

```js
// 改前
export const getPetImagePath = (id, level) => {
  if (!id) return PET_IMAGE_FALLBACK;
  const lv = level || 1;
  return `/assets/pets/${id}${lv}.png`;
};

// 改后
export const getPetImagePath = (id, level) => {
  if (!id) return PET_IMAGE_FALLBACK;
  const lv = Math.min(Math.max(Number(level) || 1, 1), 7);

  if (String(id).startsWith('custom:')) {
    const customId = Number(String(id).replace('custom:', ''));
    const pet = _customPetsCache.find((p) => p.id === customId);
    if (!pet) return PET_IMAGE_FALLBACK;
    const key = pet[`image_lv${lv}`];
    return key ? `/api/pets/images/${key}` : PET_IMAGE_FALLBACK;
  }

  return `/assets/pets/${id}${lv}.png`;
};
```

### 3.3 新增 `buildCustomPetEntry` 和 `getFullPetLibrary`

```js
// 把 DB 宠物记录转成和静态库相同格式的 entry
export const buildCustomPetEntry = (dbPet) => ({
  id: `custom:${dbPet.id}`,
  slug: `custom:${dbPet.id}`,
  name: dbPet.name,
  category: dbPet.category,   // animal | plant | dinosaur | robot
  adoptable: true,
  icon: dbPet.image_lv1 ? `/api/pets/images/${dbPet.image_lv1}` : PET_IMAGE_FALLBACK,
  // 保存原始 DB 记录，供图片路径查找用
  _dbPet: dbPet,
});

// 合并静态库 + 自定义库（去重：自定义宠物追加在后）
export const getFullPetLibrary = () => [
  ...ADOPTABLE_PET_LIBRARY,
  ..._customPetsCache.map(buildCustomPetEntry),
];
```

---

## 四、`src/App.jsx` — 登录后加载自定义宠物

### 4.1 import

在现有 import 中加：
```js
import { fetchPublicCustomPets } from './api/client';
import { setCustomPetsCache } from './api/petLibrary';
```

### 4.2 登录成功后加载（找到登录成功 / 用户加载完成的位置，追加）

```js
// 登录成功后，初始化自定义宠物缓存
const loadCustomPets = async () => {
  try {
    const { pets } = await fetchPublicCustomPets();
    setCustomPetsCache(pets);
  } catch (e) {
    // 静默失败，不影响主流程
    setCustomPetsCache([]);
  }
};
loadCustomPets();
```

> **位置**：找到现有的 `fetchNotifications` 或 `fetchMyFeedback` 调用处（登录后并发加载的地方），把 `loadCustomPets()` 加进去一起并发执行。

---

## 五、`src/components/PetParadise/PetSelectionModal.jsx` — 加类别 Tab + 合并宠物

### 5.1 import 修改

```js
// 改前
import { ADOPTABLE_PET_LIBRARY, PET_IMAGE_FALLBACK } from '../../api/petLibrary';

// 改后
import { getFullPetLibrary, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
```

### 5.2 新增 state + 类别常量

```js
const CATEGORIES = [
  { key: 'all',      label: '全部' },
  { key: 'animal',   label: '动物' },
  { key: 'plant',    label: '植物' },
  { key: 'dinosaur', label: '恐龙' },
  { key: 'robot',    label: '机器人' },
];

// 组件内新增
const [activeCategory, setActiveCategory] = useState('all');
```

### 5.3 合并宠物列表 + 按类别过滤

```js
const allPets = useMemo(() => getFullPetLibrary(), []);

const filteredPets = useMemo(
  () => activeCategory === 'all'
    ? allPets
    : allPets.filter((p) => p.category === activeCategory),
  [allPets, activeCategory],
);

// 只显示有宠物的类别 tab（动态过滤空类别）
const availableCategories = useMemo(
  () => CATEGORIES.filter(
    (c) => c.key === 'all' || allPets.some((p) => p.category === c.key)
  ),
  [allPets],
);
```

### 5.4 JSX 改动

在 `.pet-grid` 之前插入类别 Tab：

```jsx
{availableCategories.length > 1 && (
  <div className="pet-category-tabs">
    {availableCategories.map((c) => (
      <button
        key={c.key}
        type="button"
        className={`pet-category-tab ${activeCategory === c.key ? 'active' : ''}`}
        onClick={() => { setActiveCategory(c.key); setSelectedPet(null); }}
      >
        {c.label}
      </button>
    ))}
  </div>
)}
```

`.pet-grid` 改用 `filteredPets`：

```jsx
// 改前
{ADOPTABLE_PET_LIBRARY.map((pet) => (

// 改后
{filteredPets.map((pet) => (
```

---

## 六、`src/components/PetParadise/PetParadise.jsx` — 批量领养含自定义宠物

```js
// 改前（约 line 719）
import { ADOPTABLE_PET_LIBRARY, getPetImagePath, getPetNameById } from '../../api/petLibrary';
...
const randomPet = ADOPTABLE_PET_LIBRARY[Math.floor(Math.random() * ADOPTABLE_PET_LIBRARY.length)];

// 改后
import { getFullPetLibrary, getPetImagePath, getPetNameById } from '../../api/petLibrary';
...
const fullLibrary = getFullPetLibrary();
const randomPet = fullLibrary[Math.floor(Math.random() * fullLibrary.length)];
```

---

## 七、CSS `src/components/PetParadise/PetSelectionModal.css` — 类别 Tab 样式

在现有样式末尾追加：

```css
/* 宠物类别 Tab */
.pet-category-tabs {
  display: flex;
  gap: 6px;
  padding: 0 4px 12px;
  flex-wrap: wrap;
}

.pet-category-tab {
  padding: 4px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color, rgba(255,255,255,0.15));
  background: transparent;
  color: var(--text-secondary, rgba(255,255,255,0.6));
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.pet-category-tab:hover {
  border-color: var(--accent-color, #6366f1);
  color: var(--accent-color, #6366f1);
}

.pet-category-tab.active {
  background: var(--accent-color, #6366f1);
  border-color: var(--accent-color, #6366f1);
  color: #fff;
}
```

---

## 八、改动文件总览

| 文件 | 改动 |
|------|------|
| `src-server/index.js` | 新增 `handleGetPublicCustomPets` + 路由 |
| `src/api/client.js` | 新增 `fetchPublicCustomPets` |
| `src/api/petLibrary.js` | 缓存机制 + `getPetImagePath` 扩展 + `getFullPetLibrary` |
| `src/App.jsx` | 登录后 `loadCustomPets()` |
| `src/components/PetParadise/PetSelectionModal.jsx` | 类别 Tab + 合并宠物列表 |
| `src/components/PetParadise/PetSelectionModal.css` | Tab 样式 |
| `src/components/PetParadise/PetParadise.jsx` | 批量领养改用 `getFullPetLibrary()` |

**不需要改**：`PetCard.jsx`、`PetCollectionModal.jsx`、`petCollection.js`（`getPetImagePath` 已统一处理）

---

## 九、注意事项

1. **`getFullPetLibrary()` 每次调用都会重新合并**，在 `useMemo` 里调用即可，依赖为 `[]`（缓存变化时组件重新 mount 就会刷新）
2. **类别 Tab 动态显示**：只有 DB 里真正有对应类别的宠物，Tab 才出现；目前只有「动物」静态宠物，所以植物/恐龙/机器人 Tab 只有上传后才出现
3. **`custom:` 前缀**不会和现有静态宠物的 ID 冲突（静态 ID 都是纯英文，如 `baimao`）
4. **批量领养**：`getFullPetLibrary()` 是纯合并，已经过滤 `adoptable: false` 的宠物（`ADOPTABLE_PET_LIBRARY` 已过滤；自定义宠物默认 `adoptable: true`）

---

## 十、验证步骤

1. 超管先通过模块一上传一只「植物」类别的自定义宠物（7 张图）
2. 进入宠物乐园，点击神秘蛋 → 领养弹窗出现「全部 / 动物 / 植物」三个 Tab
3. 点「动物」→ 只显示静态宠物；点「植物」→ 只显示刚上传的自定义宠物
4. 选择自定义宠物 → 填名字 → 确认领养 → 学生卡片展示自定义宠物图片（Lv1）
5. 给该学生加分升级 → 宠物图片切换到对应等级（Lv2、Lv3...）
6. 批量领养：含神秘蛋的学生，批量领养后部分可能得到自定义宠物
7. 刷新页面 → 自定义宠物图片依然正常显示（缓存在模块加载后重新拉取）
