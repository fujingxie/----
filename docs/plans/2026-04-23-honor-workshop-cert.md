# 荣誉工坊 —— 三模块实现计划（供 Codex 执行）

**分支**：`feature/honor-workshop`（已存在，必须切到这个分支开发）  
**执行顺序**：Module 1 → Module 2 → Module 3 → 联动修复

---

## 当前状态

`feature/honor-workshop` 分支已有：
- `src/components/HonorWorkshop/HonorWorkshop.jsx` — 容器组件，左侧 3 个 nav 项，已接入 CertWorkshop / StickerWorkshop
- `src/components/HonorWorkshop/StickerWorkshop.jsx` — 已存在但**需要完全重写**（当前是 3 模板 Canvas 版，设计已变）
- `src/components/HonorWorkshop/CertWorkshop.jsx` — 已存在但**需要完全重写**（当前实现与设计差异大）
- `src/components/HonorWorkshop/HonorWorkshop.css` — 已有基础样式，可补充

**GradCertWorkshop 完全缺失**（当前显示「即将上线」）。

---

## 颜色 & 字体系统

| Token | 值 |
|-------|----|
| `--hw-bg` | `#EDE7D6` |
| `--hw-surface` | `#FFFFFF` |
| `--hw-surface-2` | `#FBF7EE` |
| `--hw-surface-3` | `#F5EFDF` |
| `--hw-ink` | `#243330` |
| `--hw-ink-muted` | `#5A6864` |
| `--hw-ink-faint` | `#97A09B` |
| `--hw-border` | `#E7E1D1` |
| `--hw-teal` | `#6BAE9F` |
| `--hw-accent-warm` | `#EFEAD9` |

字体：`Noto Serif SC, Noto Sans SC, sans-serif`（证书区域用 serif，UI 区域用 sans-serif）

---

## Module 1：StickerWorkshop 重写

**文件**：`src/components/HonorWorkshop/StickerWorkshop.jsx`  
**Props**：`{ students, currentClass }` （students 来自 App.jsx，是 DB 数据）

### 数据层（在文件顶部定义常量）

```js
// 4 大类，20+ 贴纸风格
const STICKER_CATEGORIES = [
  {
    id: 'classic', label: '经典',
    stickers: [
      { id: 'c1', name: '奶油边框',   ring: '#F3E6C7', bg: '#FBF3DE' },
      { id: 'c2', name: '薄荷方卡',   ring: '#CFE7DA', bg: '#E6F3EC' },
      { id: 'c3', name: '羊皮卷',     ring: '#E8DAB8', bg: '#F6EDD4' },
      { id: 'c4', name: '极简白',     ring: '#EDEDED', bg: '#FFFFFF' },
      { id: 'c5', name: '炭灰印',     ring: '#2D3936', bg: '#F5F2E8' },
    ],
  },
  {
    id: 'cute', label: '萌趣',
    stickers: [
      { id: 'k1', name: '樱花粉',     ring: '#F3CBD8', bg: '#FDE7EE' },
      { id: 'k2', name: '云朵',       ring: '#D8E3F1', bg: '#EAF1FB' },
      { id: 'k3', name: '柠檬糖',     ring: '#F1E2A5', bg: '#FBF3C7' },
      { id: 'k4', name: '草莓牛奶',   ring: '#F1BEC3', bg: '#FDE3E3' },
      { id: 'k5', name: '抹茶',       ring: '#B9D4AE', bg: '#DCEBCF' },
      { id: 'k6', name: '桃子',       ring: '#F5C9AD', bg: '#FDE5D2' },
    ],
  },
  {
    id: 'badge', label: '奖章',
    stickers: [
      { id: 'b1', name: '金质勋章',   ring: '#D8B35A', bg: '#FBEFC8' },
      { id: 'b2', name: '毕业印章',   ring: '#B86A4E', bg: '#FBE4D7' },
      { id: 'b3', name: '徽章蓝',     ring: '#6B8FBE', bg: '#E1EBF7' },
      { id: 'b4', name: '荣誉紫',     ring: '#9786C3', bg: '#EBE4F4' },
      { id: 'b5', name: '绿丝带',     ring: '#6BAE9F', bg: '#E2F0EA' },
    ],
  },
  {
    id: 'season', label: '季节',
    stickers: [
      { id: 's1s', name: '春日樱',    ring: '#EEC3CF', bg: '#FCE5EC' },
      { id: 's2s', name: '夏日海',    ring: '#9BC4D8', bg: '#D7EBF5' },
      { id: 's3s', name: '秋日枫',    ring: '#D29865', bg: '#F5DEC4' },
      { id: 's4s', name: '冬日雪',    ring: '#CAD8E5', bg: '#EDF2F8' },
      { id: 's5s', name: '新年红',    ring: '#D27060', bg: '#F8DAD2' },
      { id: 's6s', name: '教师节',    ring: '#C7A46A', bg: '#F4E7CB' },
    ],
  },
];
```

### 布局：三列

```
┌──────────────┬──────────────────┬────────────────────────────────────┐
│ 工具栏 200px │ 学生列表 280px   │ 右侧（贴纸选择 + 预览卡片）       │
└──────────────┴──────────────────┴────────────────────────────────────┘
```

#### 左列（工具栏）
与设计一致：3 个工具 nav 项（冰箱贴 active，其余点击切换由 HonorWorkshop.jsx 处理，这里只显示 active 状态），底部贴士卡（灰底圆角）：  
> 📖 小提示：只有养过宠物且宠物已毕业的学生才会出现在此列表中。

#### 中列（学生列表）
- 从 `students` prop 过滤出有毕业宠物的学生（`pet_collection` 中 `graduated === true` 的条目）
- 搜索框 + 三个 filter tab（全部 / ≥ 2 只 / 按最近）
- 每行：头像字母 + 姓名 + 毕业只数徽章；选中时 `background: #243330, color: #FBF7EE`

**注意**：`students` 的 `pet_collection` 是 JSON 字符串，需要用 `JSON.parse()` 解析。过滤已毕业的宠物：`pet.graduated === true`（布尔值，DB 里存 0/1，JS 里注意类型转换）。

#### 右列（贴纸选择 + 预览）

**上方：贴纸选择器**
- 4 个 category tab（行内，圆角 pill）
- 激活类别下方横向滚动贴纸格（每格 72×72，显示 ring 色外圈 + bg 色填充 + 名称）

**下方：FridgeMagnet 卡片预览网格**（`display: grid, gridTemplateColumns: repeat(auto-fill, minmax(180px, 1fr))`）

每张 FridgeMagnet 卡片（尺寸约 180×240）：
```
┌────────────────┐
│   ○  孔洞装饰  │  ← 顶部中央圆形 punch hole（直径 16px，ring 色边框）
│   ┌──────────┐ │
│   │  宠物表情│ │  ← 图片区 120px 高，emoji fallback；右下角 Lv 徽章
│   │  + Lv 徽 │ │
│   └──────────┘ │
│  宠物名 · 学生姓名  │
│  班级信息       │
│  ⭐ EXP · 毕业日期  │
│  [复选框 checkbox]  │
└────────────────┘
```

- 卡片 `background: sticker.bg, border: 2px solid sticker.ring`
- 整体学生选中后，其所有宠物卡片会显示
- 每张卡片右下角有 checkbox 可单选
- 底部操作栏：已选 N 张 · 「全选」按钮 · 「⬇ 批量下载」按钮（灰绿主色）

### 下载逻辑（Canvas）
- 复用已有的 `renderStickerToCanvas` 模式（已在 StickerWorkshop.jsx 中实现）
- **改造**：新的 canvas 渲染要体现 sticker 的 `bg` / `ring` 色
- 卡片尺寸 300×380，内容：孔洞（圆弧）+ 宠物图 + 名字 + EXP + 毕业日期
- JSZip 批量打包（已有 import 模式，复用）

---

## Module 2：CertWorkshop 重写

**文件**：`src/components/HonorWorkshop/CertWorkshop.jsx`  
**Props**：`{ students, currentClass, user }`

### 数据层（文件顶部常量）

#### 8 个证书模板

```js
const CERT_TEMPLATES = [
  { id: 'classic-gold',  name: '典雅金',     mood: '正式',
    bg: '#FBF3DE', border: '#C9A24C', accent: '#8B6914', title: '#5C4612', body: '#4A3E20',
    corner: 'sunburst' },
  { id: 'mint-modern',   name: '薄荷现代',   mood: '清新',
    bg: '#EAF4EE', border: '#6BAE9F', accent: '#2F6F5E', title: '#1F4538', body: '#3C4D49',
    corner: 'leaves' },
  { id: 'sakura',        name: '樱花粉',     mood: '童趣',
    bg: '#FCE7EE', border: '#E5A3B8', accent: '#B8567A', title: '#8B3559', body: '#5C3446',
    corner: 'cherry' },
  { id: 'parchment',     name: '羊皮卷',     mood: '古典',
    bg: '#F6EDD4', border: '#A8895B', accent: '#8B6A3D', title: '#4A3520', body: '#3E2F1C',
    corner: 'stars' },
  { id: 'sky-clean',     name: '晴空',       mood: '极简',
    bg: '#F0F5FB', border: '#6B8FBE', accent: '#3E65A0', title: '#1F3E70', body: '#384A66',
    corner: 'dots' },
  { id: 'sunshine',      name: '阳光',       mood: '活泼',
    bg: '#FEF6D6', border: '#E8B34A', accent: '#C47E13', title: '#7A4A08', body: '#4D3913',
    corner: 'sun' },
  { id: 'forest',        name: '森林派对',   mood: '自然',
    bg: '#E5EFDA', border: '#7BA25A', accent: '#4D7A3A', title: '#2E4B20', body: '#364428',
    corner: 'mushroom' },
  { id: 'newyear',       name: '新春红',     mood: '节日',
    bg: '#FBE4D8', border: '#C9543A', accent: '#9B3320', title: '#6B1E0F', body: '#4A2418',
    corner: 'firework' },
];

const CORNER_SYMBOLS = {
  sunburst: '✦', leaves: '❋', cherry: '✿', stars: '✧',
  dots: '◆', sun: '☀', mushroom: '❀', firework: '✺',
};
```

#### 8 个话术模板

```js
const SPEECH_TEMPLATES = [
  { id: 'official',  name: '正式嘉奖', tone: '官方',
    body: '兹表彰 {name} 同学在 {period} 的 {ranking} 中表现卓越，位列 {rank_label}，特此颁发荣誉证书，以资鼓励。愿你继续保持热忱，与伙伴 {pet} 共赴更多精彩。' },
  { id: 'warm',      name: '温馨寄语', tone: '温馨',
    body: '{name} 小朋友，恭喜你！你和 {pet} 一路相伴，累计 {value} {metric}，在 {ranking} 拿下 {rank_label}。每一次坚持都值得被看见，老师为你骄傲。' },
  { id: 'playful',   name: '幽默鼓励', tone: '幽默',
    body: '叮咚！{name} 同学和 {pet} 小队拿下 {ranking} 的 {rank_label} 啦！{value} {metric} 不是白攒的——继续养你的小宠物，老师给你加大鸡腿！' },
  { id: 'poetic',    name: '诗意表达', tone: '诗意',
    body: '星光不负赶路人。{name} 以 {value} {metric}，在 {ranking} 写下属于自己的章节，位列 {rank_label}。与 {pet} 同行的每一步，都在向未来生长。' },
  { id: 'teacher',   name: '老师评语', tone: '教育',
    body: '{name} 同学在本阶段的 {ranking} 中，凭 {value} {metric} 名列 {rank_label}。认真是最朴素的天赋，希望你把这份专注带到每一次课堂，与 {pet} 共同成长。' },
  { id: 'peer',      name: '同学祝贺', tone: '亲切',
    body: '哇！{name} 和 {pet} 拿到了 {ranking} 的 {rank_label}！{value} {metric} 真厉害，是我们全班一起见证的高光时刻，期待你下一次更进一步～' },
  { id: 'milestone', name: '里程碑',   tone: '纪念',
    body: '这是属于 {name} 与 {pet} 的高光时刻：{ranking} · {rank_label} · {value} {metric}。愿这份成就成为你回望时温柔而坚定的坐标。' },
  { id: 'short',     name: '简短有力', tone: '简短',
    body: '{name} · {ranking} {rank_label} · {value} {metric}。以此致敬你与 {pet} 的共同努力。' },
];
```

#### 3 种榜单 & 排名尺寸

```js
const RANKING_TYPES = [
  { id: 'power',    label: '宠物战力榜', icon: '⚔️', metric: 'EXP',  valueKey: 'lifetime_exp' },
  { id: 'wealth',   label: '班级财力榜', icon: '💰', metric: '金币', valueKey: 'coins' },
  { id: 'progress', label: '班级进步榜', icon: '📈', metric: '加分', valueKey: 'reward_count' },
];
const RANK_SIZES = [
  { id: 'top3',  label: '前 3',  n: 3 },
  { id: 'top5',  label: '前 5',  n: 5 },
  { id: 'top10', label: '前 10', n: 10 },
];
```

### 榜单计算（从 students prop 派生）

```js
// students 是 DB 数据数组，字段：id, name, total_exp, lifetime_exp, coins, reward_count, pet_collection
function buildRanking(students, rankingType) {
  const key = RANKING_TYPES.find(r => r.id === rankingType)?.valueKey;
  return [...students]
    .sort((a, b) => (b[key] || 0) - (a[key] || 0))
    .map((s, i) => {
      // 取当前宠物的 emoji（pet_collection 中 graduated===false 的）
      const pets = JSON.parse(s.pet_collection || '[]');
      const activePet = pets.find(p => !p.graduated) || pets[0];
      return {
        rank: i + 1,
        name: s.name,
        studentId: s.id,
        pet: activePet?.name || '—',
        petEmoji: activePet?.emoji || '🐾',
        petLv: activePet?.level || 0,
        value: s[key] || 0,
      };
    });
}
```

### 布局

```
┌──────────┬──────────────────────────────────────────────────────┐
│ 工具栏   │ 右侧工作区                                           │
│ 200px    │  ┌─ Filter bar ──────────────────────────────────┐   │
│          │  │  [⚔️战力榜 ▾]  [前3 ▾]    [模板：典雅金 ▾]  🖨  ⬇ │
│          │  └───────────────────────────────────────────────┘   │
│          │  ‹ 上一张  [#1 张三] [#2 李四] [#3 王五]   下一张 ›  │
│          │  ┌─────────────── Certificate preview ───────────┐   │
│          │  │              CertificateCard                   │   │
│          │  └───────────────────────────────────────────────┘   │
│          │  ┌─ 话术模板 strip（横向滚动）──────────────────────┐ │
│          │  │  [官方] [温馨] [幽默] ... (8卡片)                │ │
│          │  └───────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────────┘
```

### 子组件 `CertificateCard`（纯显示，CSS-based，不用 Canvas）

```jsx
// width: 720px, aspectRatio: "1.414 / 1"（A4 横向比例）
// 结构：
// - 外层双边框（position:absolute inset:14, border: 3px double tmpl.border）
// - 内边框（inset:20, border: 1px solid border+80）
// - 4 个角落装饰（CornerOrnament 组件，显示 CORNER_SYMBOLS[tmpl.corner]）
// - 内容区（padding: 14px 36px）：
//   - Header：CERTIFICATE OF HONOR（英文小标题）+ 荣誉证书（大字）+ 排名徽章
//   - Body flex行：
//     - Left（flex:1）：「小主人：{name}」+ 话术正文（textIndent: 2em）
//     - Right（width:160）：宠物 emoji 方框（140×140）+ 宠物名 + metric值
//   - Footer：日期 | 印章圆 | 颁奖人
```

话术填充函数：

```js
function fillSpeech(tmpl, ctx) {
  return tmpl.body
    .replaceAll('{name}', ctx.name)
    .replaceAll('{pet}', ctx.pet)
    .replaceAll('{ranking}', ctx.ranking)
    .replaceAll('{rank_label}', ctx.rank_label)
    .replaceAll('{value}', String(ctx.value))
    .replaceAll('{metric}', ctx.metric)
    .replaceAll('{period}', ctx.period || '本学期');
}

function rankLabel(rank) {
  if (rank === 1) return '冠军';
  if (rank === 2) return '亚军';
  if (rank === 3) return '季军';
  return `第 ${rank} 名`;
}
```

### 下载 / 打印

- **下载**：`html2canvas`（`npm install html2canvas`）抓取 CertificateCard 所在 div → `a.download = 'cert-xxx.png'`
  - 若 html2canvas 不可用，fallback 到 Canvas 手动渲染（参考现有 StickerWorkshop 的 renderStickerToCanvas 模式）
- **打印**：`window.print()`，CSS `@media print { .hw-no-print { display:none } .cert-card { page-break-inside: avoid } }`

---

## Module 3：GradCertWorkshop（新建）

**文件**：`src/components/HonorWorkshop/GradCertWorkshop.jsx`（新建）  
**Props**：`{ students, currentClass, user }`

### 布局：三列

```
┌──────────┬──────────────────┬──────────────────────────────────────┐
│ 工具栏   │ 毕业宠物选择     │ 右侧                                 │
│ 200px    │ 280px            │  ┌─ 模板色块条 + 下载/打印按钮 ──┐  │
│          │ (学生分组)       │  └────────────────────────────────┘  │
│          │                  │  ┌─ Diploma 预览 ──────────────────┐  │
│          │                  │  │                                  │  │
│          │                  │  └────────────────────────────────┘  │
│          │                  │  ┌─ 毕业寄语模板 strip ────────────┐  │
│          │                  │  └────────────────────────────────┘  │
└──────────┴──────────────────┴──────────────────────────────────────┘
```

### 中列：毕业宠物列表

从 students 中取**所有已毕业的宠物**（`pet_collection` 中 `graduated === true`），按学生分组展示：

```js
// 数据整理
const graduatedList = useMemo(() => {
  const groups = [];
  for (const s of students) {
    const pets = JSON.parse(s.pet_collection || '[]');
    const graduated = pets.filter(p => p.graduated === true);
    if (graduated.length > 0) groups.push({ student: s, pets: graduated });
  }
  return groups;
}, [students]);
```

每组头部显示学生名字头像，每条宠物行显示：emoji + 宠物名 + Lv + EXP + 毕业日期（formatDate）。

搜索：支持按学生名 / 宠物名过滤。

### 证书模板色块（右侧控制栏）

横向排列 8 个 32×32 色块（与 CERT_TEMPLATES 共用），点击切换；选中时显示 `#243330` 3px 边框 + 名称小标注。

### `Diploma` 组件（portrait A4 比例，height > width）

```
// width: 680px, aspectRatio: "1.414 / 1"（同 CertificateCard 横向）
// 注：设计稿的 Diploma 也是横向（景观方向），不是竖向
// 结构：
// - 双边框（同 CertificateCard）
// - 右上角证书编号（NO. GRAD-{classNo}-{YYYYMMDD}-{petId.toUpperCase()}）
// - 顶部：🌿 毕业证书 🌿 + 班级名
// - Body flex行：
//   - Left (width:170)：宠物圆形头像（150px, border-radius:50%）+ 宠物名 + EXP + 毕业日期
//   - Right (flex:1)：
//     - 「兹证明...」引语
//     - 「小主人：{name}」
//     - 话术正文
//     - 成长时间线（Lv.0 → Lv.N 连线）：每个节点是圆形，连线用 flex+height:2px div
// - Footer：日期 | 印章圆 | 颁奖人（与 CertificateCard 一致）
```

**证书编号格式**：
```js
function buildCertNo(currentClass, pet) {
  const classNum = (currentClass?.name || '').replace(/[^\d]/g, '') || '0';
  const dateStr = (pet.graduatedAt || new Date().toISOString()).slice(0, 10).replaceAll('-', '');
  return `GRAD-${classNum}-${dateStr}-${String(pet.id).toUpperCase()}`;
}
```

**成长时间线**：

```jsx
// timeline = [0, 1, 2, ..., pet.level]
// 每个节点显示 lv 数字；第一个显示「相遇」，最后一个显示「毕业」
// 连线：flex:1 的 div，height:2px，background: tmpl.border
```

### 6 个毕业寄语模板

```js
const GRAD_SPEECH_TEMPLATES = [
  { id: 'g-formal',  name: '正式毕业',  tone: '正式',
    body: '兹证明 {pet}（Lv.{lv}）于 {date} 在 {class} 圆满完成全部成长旅程，累计获得 {exp} EXP，与小主人 {name} 携手抵达毕业彼岸。特此颁发毕业证书，以兹纪念。' },
  { id: 'g-journey', name: '旅程回望',  tone: '抒情',
    body: '从 Lv.0 到 Lv.{lv}，{exp} EXP 的每一分都由 {name} 和 {pet} 一点一滴共同累积。这一路的陪伴、耐心与坚持，终将化作更远的光。毕业快乐，{pet}。' },
  { id: 'g-warm',    name: '温柔寄语',  tone: '温馨',
    body: '亲爱的 {name}：你养育的 {pet} 今天正式毕业啦！{exp} EXP 是你们之间最真实的默契。愿你带着这份温柔，继续好好长大，{pet} 会一直记得你。' },
  { id: 'g-playful', name: '俏皮祝福',  tone: '幽默',
    body: '毕业啦毕业啦！{pet} 打包行李准备"上岸"啦～{name} 同学累计攒了 {exp} EXP，这份耐心老师给满分！记得偶尔回来看看它哦。' },
  { id: 'g-proud',   name: '以你为荣',  tone: '骄傲',
    body: '{name} 同学，你的 {pet} 以 Lv.{lv}、{exp} EXP 的优异成绩光荣毕业。老师见证了你们从 Lv.0 走到今天的每一步，深深以你为荣。' },
  { id: 'g-poetic',  name: '诗意留念',  tone: '诗意',
    body: '时间会把心意酿成果实。{pet} 在 {date} 毕业，那是 {name} 用 {exp} EXP 的专注与温柔换来的光亮。愿这份好好长大的能力，一生陪伴你。' },
];

function fillGradSpeech(tmpl, { name, pet, lv, exp, date, className }) {
  return tmpl.body
    .replaceAll('{name}', name)
    .replaceAll('{pet}', pet)
    .replaceAll('{lv}', String(lv))
    .replaceAll('{exp}', String(exp))
    .replaceAll('{date}', date)
    .replaceAll('{class}', className);
}
```

---

## Module 4：联动修复（HonorWorkshop.jsx）

**文件**：`src/components/HonorWorkshop/HonorWorkshop.jsx`

当前 HonorWorkshop 用了一个左侧简单 sidebar 做工具切换。**不需要修改导航逻辑**（3 个 section 已有），只需要：

1. 在 `graduate-cert` 分支里渲染 `<GradCertWorkshop students={students} currentClass={currentClass} user={user} />` 代替「即将上线」占位符
2. 导入 GradCertWorkshop

```jsx
import GradCertWorkshop from './GradCertWorkshop';
// ...
{activeSection === 'graduate-cert' && (
  <GradCertWorkshop students={students} currentClass={currentClass} user={user} />
)}
```

---

## 实现注意事项

### pet_collection 字段解析

`students[i].pet_collection` 是从 DB 来的字符串，需要安全解析：

```js
function parsePetCollection(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    // 防止双重序列化
    if (typeof parsed[0] === 'string') return JSON.parse(parsed[0]);
    return parsed;
  } catch {
    return [];
  }
}
```

宠物字段参考（来自 DB schema）：
- `id`：宠物 ID（number）
- `name`：宠物名
- `emoji`：表情（如 `🐑`），若无则看 `type` 对应图
- `level`：宠物等级
- `exp`：本宠经验
- `graduated`：布尔值（true = 已毕业）
- `graduatedAt`：毕业日期（ISO 字符串），可能是 `graduated_at`
- `type`：宠物类型 ID（对应图片路径）

用 `getPetImagePath(type)` 获取图片路径（已在 petLibrary.js 中）；若图片加载失败，fallback 到 `emoji`。

### 日期格式化

```js
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
```

### 颜色系统

所有 UI 元素用 CSS 变量（见文件顶部 `:root` 声明或 inline style），不要硬编码颜色，统一走设计系统。

### 字体

证书卡片区域加 `fontFamily: 'Noto Serif SC, Noto Sans SC, serif'`，其余 UI 区域沿用现有 sans-serif。

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `src/components/HonorWorkshop/StickerWorkshop.jsx` | **完全重写** |
| `src/components/HonorWorkshop/CertWorkshop.jsx` | **完全重写** |
| `src/components/HonorWorkshop/GradCertWorkshop.jsx` | **新建** |
| `src/components/HonorWorkshop/HonorWorkshop.jsx` | 小改：引入 GradCertWorkshop，替换占位符 |
| `src/components/HonorWorkshop/HonorWorkshop.css` | 补充样式（FridgeMagnet、cert-card、diploma、timeline 等） |

---

## 验证清单

1. 冰箱贴：选择学生 → 右侧出现毕业宠物 FridgeMagnet 卡片网格，切换 4 个贴纸类别，下载单张/批量
2. 荣誉证书：榜单/名次 dropdown，切换证书模板（8 种预览不同颜色），切换话术（自动填充），prev/next 翻页，下载
3. 毕业证书：中列毕业宠物按学生分组，选择后右侧 Diploma 更新，证书编号正确，成长时间线节点数 = pet.level + 1
4. 若无毕业宠物（新注册班级），各列表显示空状态提示
5. 证书颁奖人显示 `user.nickname || user.username`（从 prop 取）
