# 自定义宠物系统 — 模块一：R2 配置 + 后端 API + 超管管理界面

## 背景

现有宠物全部是 `public/assets/pets/` 下的静态资源，命名规则为 `{id}{level}.png`（如 `baimao1.png`）。
新系统允许超管上传自定义宠物（名称 + 类别 + 7 张等级图），图片存 Cloudflare R2，元数据存 D1。

**本模块不改动任何现有领养逻辑**，只做基础设施 + 数据管理入口。

---

## 零、前置操作（需手动在 Cloudflare 控制台完成）

1. 进入 Cloudflare 控制台 → R2 → 新建 bucket，名称：`pet-images`
2. 不需要开启公开访问（图片通过 Worker 代理提供）
3. 进入 Workers & Pages → class-pets-api → Settings → Bindings → 添加 R2 binding：
   - Variable name：`PET_IMAGES`
   - R2 bucket：`pet-images`

---

## 一、`wrangler.toml` — 新增 R2 binding

在现有 `[[d1_databases]]` 之后追加：

```toml
[[r2_buckets]]
binding = "PET_IMAGES"
bucket_name = "pet-images"
```

---

## 二、数据库 `migrations/0027_custom_pets.sql`

```sql
CREATE TABLE IF NOT EXISTS custom_pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'animal',  -- animal | plant | dinosaur | robot
  image_lv1 TEXT NOT NULL,   -- R2 对象 key（不是完整 URL，通过 Worker 代理访问）
  image_lv2 TEXT NOT NULL,
  image_lv3 TEXT NOT NULL,
  image_lv4 TEXT NOT NULL,
  image_lv5 TEXT NOT NULL,
  image_lv6 TEXT NOT NULL,
  image_lv7 TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

同步更新 `schema.sql`，在 `feedback_tickets` 之后加上此表定义。

---

## 三、后端 `src-server/index.js` — 新增 4 个 handler + 路由

### Handler 1：图片上传 `handleUploadPetImage`

```js
// POST /api/admin/pets/upload?userId=xxx
// Content-Type: multipart/form-data，字段名 "file"
async function handleUploadPetImage(request, env) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file) return error('缺少文件', 400);

  // 限制类型和大小（2MB）
  if (!file.type.startsWith('image/')) return error('只支持图片文件', 400);
  if (file.size > 2 * 1024 * 1024) return error('图片不能超过 2MB', 400);

  // 生成唯一 key：时间戳 + 随机数 + 扩展名
  const ext = file.name.split('.').pop() || 'png';
  const key = `pets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await env.PET_IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return json({ key });
}
```

### Handler 2：图片代理访问 `handleGetPetImage`

```js
// GET /api/pets/images/:key  （key 可能包含 /，用 path 截取）
async function handleGetPetImage(request, env, key) {
  const object = await env.PET_IMAGES.get(key);
  if (!object) return error('图片不存在', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000'); // 1 年缓存

  return new Response(object.body, { headers });
}
```

### Handler 3：超管新增宠物 `handleCreateCustomPet`

```js
// POST /api/admin/pets?userId=xxx
// body: { name, category, imageLv1...imageLv7 }（均为 R2 key）
async function handleCreateCustomPet(request, env) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const body = await readBody(request);
  const { name, category, imageLv1, imageLv2, imageLv3, imageLv4, imageLv5, imageLv6, imageLv7 } = body;

  if (!name?.trim()) return error('宠物名称不能为空', 400);
  if (!['animal', 'plant', 'dinosaur', 'robot'].includes(category)) return error('无效的分类', 400);
  if (!imageLv1 || !imageLv2 || !imageLv3 || !imageLv4 || !imageLv5 || !imageLv6 || !imageLv7) {
    return error('请上传全部 7 个等级的图片', 400);
  }

  const db = getDb(env);
  const result = await db.prepare(
    `INSERT INTO custom_pets (name, category, image_lv1, image_lv2, image_lv3, image_lv4, image_lv5, image_lv6, image_lv7)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(name.trim(), category, imageLv1, imageLv2, imageLv3, imageLv4, imageLv5, imageLv6, imageLv7).run();

  await appendAdminLog(env, userId, '新增自定义宠物', `宠物名称: ${name.trim()}, 分类: ${category}`);

  return json({ success: true, id: result.meta?.last_row_id });
}
```

### Handler 4：超管查询宠物列表 `handleListCustomPets`

```js
// GET /api/admin/pets?userId=xxx
async function handleListCustomPets(request, env) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const db = getDb(env);
  const { results } = await db.prepare(
    'SELECT * FROM custom_pets ORDER BY created_at DESC'
  ).all();

  return json({ pets: results });
}
```

### Handler 5：超管删除宠物 `handleDeleteCustomPet`

```js
// DELETE /api/admin/pets/:id?userId=xxx
async function handleDeleteCustomPet(request, env, petId) {
  const url = new URL(request.url);
  const userId = parseId(url.searchParams.get('userId'));
  await assertSuperAdmin(env, userId);

  const db = getDb(env);

  // 取出 7 个 key，从 R2 删除
  const pet = await db.prepare('SELECT * FROM custom_pets WHERE id = ?').bind(petId).first();
  if (!pet) return error('宠物不存在', 404);

  const keys = [pet.image_lv1, pet.image_lv2, pet.image_lv3, pet.image_lv4, pet.image_lv5, pet.image_lv6, pet.image_lv7];
  await Promise.all(keys.map((k) => env.PET_IMAGES.delete(k)));

  await db.prepare('DELETE FROM custom_pets WHERE id = ?').bind(petId).run();
  await appendAdminLog(env, userId, '删除自定义宠物', `宠物 ID: ${petId}, 名称: ${pet.name}`);

  return json({ success: true });
}
```

### 路由注册（在现有 admin feedback 路由附近追加）

```js
// 图片代理（无需鉴权，公开访问）
// path 形如 /api/pets/images/pets/xxx.png，截取 key 部分
const petImageMatch = path.match(/^\/api\/pets\/images\/(.+)$/);
if (petImageMatch && method === 'GET') {
  return handleGetPetImage(request, env, petImageMatch[1]);
}

// 超管宠物管理
if (path === '/api/admin/pets/upload' && method === 'POST') {
  return handleUploadPetImage(request, env);
}

const adminPetsDetailMatch = path.match(/^\/api\/admin\/pets\/(\d+)$/);
if (adminPetsDetailMatch && method === 'DELETE') {
  return handleDeleteCustomPet(request, env, Number(adminPetsDetailMatch[1]));
}

if (path === '/api/admin/pets' && method === 'GET') {
  return handleListCustomPets(request, env);
}
if (path === '/api/admin/pets' && method === 'POST') {
  return handleCreateCustomPet(request, env);
}
```

---

## 四、前端 API `src/api/client.js` — 新增 4 个函数

```js
// 上传单张宠物图片，返回 { key }
export const uploadPetImage = ({ userId, file }) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/admin/pets/upload?userId=${userId}`, {
    method: 'POST',
    body: formData,
    // 不设 Content-Type，让浏览器自动带 boundary
    headers: {},
  });
};

// 新增宠物
export const createCustomPet = ({ userId, name, category, imageLv1, imageLv2, imageLv3, imageLv4, imageLv5, imageLv6, imageLv7 }) =>
  request(`/admin/pets?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify({ name, category, imageLv1, imageLv2, imageLv3, imageLv4, imageLv5, imageLv6, imageLv7 }),
  });

// 查询宠物列表
export const fetchCustomPets = ({ userId }) =>
  request(`/admin/pets?userId=${userId}`);

// 删除宠物
export const deleteCustomPet = ({ userId, petId }) =>
  request(`/admin/pets/${petId}?userId=${userId}`, { method: 'DELETE' });
```

**注意**：`uploadPetImage` 发送 multipart，不能让 `request()` 自动加 `Content-Type: application/json`。如果现有 `request()` 封装会强制加 JSON header，需要在函数里绕过（传空 headers 或专门判断 FormData）。

---

## 五、超管组件 `src/components/Admin/AdminPetsPanel.jsx`（新建）

### 整体结构

```
┌─ 自定义宠物管理 ──────────────────────────┐
│  [＋ 新增宠物]                            │
│                                          │
│  ┌── 宠物列表 ──────────────────────────┐ │
│  │  名称 │ 分类 │ 图片预览 │ 创建时间 │ 操作 │ │
│  │  ...  │ ...  │  [图]   │   ...   │ [删除]│ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### 新增宠物表单（弹窗或展开区域）

字段：
- 宠物名称（text input）
- 分类 select：动物 / 植物 / 恐龙 / 机器人
- 7 个等级图片上传区（标注 Lv1～Lv7，每个上传 input + 预览缩略图）

上传流程：
1. 用户选择文件 → 调 `uploadPetImage` → 得到 key → 存入本地 state
2. 7 张全部上传完毕后，「保存」按钮可点击
3. 点保存 → 调 `createCustomPet` → 成功后刷新列表

```jsx
// 组件内关键 state
const [pets, setPets] = useState([]);
const [showForm, setShowForm] = useState(false);
const [formData, setFormData] = useState({
  name: '',
  category: 'animal',
  imageLv1: '', imageLv2: '', imageLv3: '', imageLv4: '',
  imageLv5: '', imageLv6: '', imageLv7: '',
});
const [uploading, setUploading] = useState({}); // { lv1: bool, lv2: bool, ... }

// 上传单张图片
const handleImageUpload = async (level, file) => {
  setUploading((prev) => ({ ...prev, [`lv${level}`]: true }));
  try {
    const { key } = await uploadPetImage({ userId: currentUser.id, file });
    setFormData((prev) => ({ ...prev, [`imageLv${level}`]: key }));
  } catch (e) {
    alert(e?.message || '上传失败');
  } finally {
    setUploading((prev) => ({ ...prev, [`lv${level}`]: false }));
  }
};

// 图片预览 URL（通过 Worker 代理）
const getPreviewUrl = (key) => key ? `/api/pets/images/${key}` : null;
```

图片上传区示例（循环渲染 Lv1~Lv7）：
```jsx
{[1,2,3,4,5,6,7].map((lv) => {
  const key = formData[`imageLv${lv}`];
  return (
    <div key={lv} className="pet-image-upload-slot">
      <span className="slot-label">Lv{lv}</span>
      {key
        ? <img src={getPreviewUrl(key)} alt={`Lv${lv}`} className="slot-preview" />
        : <label className="slot-placeholder">
            {uploading[`lv${lv}`] ? '上传中...' : '点击上传'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files[0] && handleImageUpload(lv, e.target.files[0])}
            />
          </label>
      }
    </div>
  );
})}
```

删除逻辑：
```jsx
const handleDelete = async (petId) => {
  if (!window.confirm('确认删除此宠物？已领养该宠物的学生不受影响。')) return;
  try {
    await deleteCustomPet({ userId: currentUser.id, petId });
    setPets((prev) => prev.filter((p) => p.id !== petId));
  } catch (e) {
    alert(e?.message || '删除失败');
  }
};
```

---

## 六、在 `AdminConsole.jsx` 挂载

在「反馈工单」CollapsiblePanel 之后添加：

```jsx
import AdminPetsPanel from './AdminPetsPanel';

<CollapsiblePanel title="自定义宠物" description="上传并管理自定义宠物，供学生领养">
  <AdminPetsPanel currentUser={user} />
</CollapsiblePanel>
```

---

## 七、CSS（在 `AdminConsole.css` 追加）

```css
/* 宠物图片上传区 */
.pet-image-upload-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.pet-image-upload-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.slot-label {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 600;
}

.slot-preview {
  width: 60px;
  height: 60px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.slot-placeholder {
  width: 60px;
  height: 60px;
  border: 1.5px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: center;
}

.slot-placeholder:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}
```

---

## 八、改动文件总览

| 文件 | 类型 | 改动 |
|------|------|------|
| `wrangler.toml` | 修改 | 新增 R2 binding |
| `migrations/0027_custom_pets.sql` | 新建 | custom_pets 表 |
| `schema.sql` | 修改 | 同步新表定义 |
| `src-server/index.js` | 修改 | 5 个新 handler + 路由 |
| `src/api/client.js` | 修改 | 4 个新 API 函数 |
| `src/components/Admin/AdminPetsPanel.jsx` | 新建 | 宠物管理面板 |
| `src/components/Admin/AdminConsole.jsx` | 修改 | 挂载新 Panel |
| `src/components/Admin/AdminConsole.css` | 修改 | 上传区样式 |

---

## 九、注意事项

1. **`request()` 封装兼容性**：`uploadPetImage` 使用 FormData，不能带 `Content-Type: application/json`。检查 `src/api/client.js` 的 `request()` 是否会自动加 JSON header，如有，需要在 `uploadPetImage` 里直接用原生 `fetch`。

2. **R2 binding 本地开发**：本地 `wrangler dev` 需要 `--r2 PET_IMAGES` 参数，或在 `wrangler.toml` 里配置 local 路径。

3. **图片访问路径**：前端预览和正式展示都走 `/api/pets/images/:key`（Worker 代理），不直接访问 R2。

4. **删除宠物时**：只删数据库记录 + R2 图片，不影响已经领养该宠物的学生（学生记录里存的是 `pet_type_id`，自定义宠物后续模块二会用 `custom:${id}` 前缀区分）。

---

## 十、验证步骤

1. 超管控制台出现「自定义宠物」面板
2. 点「＋ 新增宠物」→ 填名称/分类 → 逐级上传 7 张图 → 每张上传后出现预览
3. 7 张全部上传 → 保存 → 列表出现新宠物
4. 列表图片预览正常显示（走 `/api/pets/images/` 代理）
5. 删除宠物 → 列表移除 → R2 中对应文件已删除（wrangler r2 object list 验证）
6. 超管操作日志出现「新增自定义宠物」「删除自定义宠物」记录
