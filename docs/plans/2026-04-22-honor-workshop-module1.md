# 荣誉工坊 — 模块一：框架 + 冰箱贴制作

## 背景

新增「荣誉工坊」顶部 Tab，包含三个功能：冰箱贴制作、光荣榜证书制作、毕业证书制作。
本模块实现框架骨架 + 冰箱贴制作功能。

全部纯前端实现（Canvas 生成图片），不需要后端改动。

---

## 一、导航 `src/App.jsx` — 新增 Tab

### 1.1 在 tabs 数组中插入（在「百宝箱」和「系统设置」之间）

```js
import { Award } from 'lucide-react'; // 或 Star、Medal

const tabs = [
  { id: 'pet',     label: '宠物乐园', icon: <Gamepad2 size={20} /> },
  { id: 'shop',    label: '小卖部',   icon: <ShoppingBag size={20} /> },
  { id: 'rank',    label: '光荣榜',   icon: <Trophy size={20} /> },
  { id: 'toolbox', label: '百宝箱',   icon: <Briefcase size={20} /> },
  { id: 'honor',   label: '荣誉工坊', icon: <Award size={20} /> },   // 新增
  { id: 'settings',label: '系统设置', icon: <SettingsIcon size={20} /> },
];
```

### 1.2 在内容区渲染处加

```jsx
{activeTab === 'honor' && (
  <HonorWorkshop
    students={currentStudents}
    currentClass={currentClass}
    user={user}
  />
)}
```

### 1.3 import

```js
import HonorWorkshop from './components/HonorWorkshop/HonorWorkshop';
```

---

## 二、新建组件目录 `src/components/HonorWorkshop/`

文件列表：
- `HonorWorkshop.jsx` — 主框架（左侧导航 + 右侧内容区）
- `StickerWorkshop.jsx` — 冰箱贴制作
- `HonorWorkshop.css` — 样式

---

## 三、`HonorWorkshop.jsx` — 主框架

```jsx
import React, { useState } from 'react';
import StickerWorkshop from './StickerWorkshop';
import './HonorWorkshop.css';

const SECTIONS = [
  { id: 'sticker',      label: '冰箱贴制作' },
  { id: 'honor-cert',   label: '光荣榜证书制作' },
  { id: 'graduate-cert',label: '毕业证书制作' },
];

const HonorWorkshop = ({ students, currentClass, user }) => {
  const [activeSection, setActiveSection] = useState('sticker');

  return (
    <div className="honor-workshop">
      {/* 左侧功能导航 */}
      <aside className="honor-sidebar">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`honor-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {/* 右侧内容区 */}
      <main className="honor-content">
        {activeSection === 'sticker' && (
          <StickerWorkshop students={students} currentClass={currentClass} />
        )}
        {activeSection === 'honor-cert' && (
          <div className="honor-coming-soon">光荣榜证书制作 — 即将上线</div>
        )}
        {activeSection === 'graduate-cert' && (
          <div className="honor-coming-soon">毕业证书制作 — 即将上线</div>
        )}
      </main>
    </div>
  );
};

export default HonorWorkshop;
```

---

## 四、`StickerWorkshop.jsx` — 冰箱贴制作

### 4.1 数据准备

```js
import { parsePetCollection } from '../../lib/petCollection';
import { getPetImagePath } from '../../api/petLibrary';

// 只取有毕业宠物的学生（pet_collection 里 status === 'graduated' 的条目）
const studentsWithGraduated = useMemo(() =>
  students
    .map((s) => {
      const graduated = parsePetCollection(s.pet_collection, s)
        .filter((e) => e.status === 'graduated' && e.pet_type_id);
      return graduated.length > 0 ? { student: s, graduated } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.graduated.length - a.graduated.length),
  [students]
);
```

### 4.2 State

```js
const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
const [selectedTemplate, setSelectedTemplate] = useState(0);    // 模版索引
const [selectedStickers, setSelectedStickers] = useState(new Set()); // entry.id
const [downloading, setDownloading] = useState(false);
```

### 4.3 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [贴纸1] [贴纸2] [贴纸3]    选择贴纸模版   [下载原图] [下载冰箱贴]  [全选] │
├──────────────────┬──────────────────────────────────────┤
│ 毕业学生  毕业数  │  贴纸预览网格（2-4列）                │
│ 学生1      2    │  ┌──────┐ ┌──────┐                   │
│ 学生2      3    │  │ 贴纸 │ │ 贴纸 │                   │
│ 学生3      1    │  └──────┘ └──────┘                   │
│ 学生4      3    │                                       │
└──────────────────┴──────────────────────────────────────┘
```

### 4.4 贴纸模版定义（3 套内置）

```js
const STICKER_TEMPLATES = [
  {
    id: 0,
    label: '贴纸1',
    // 白底圆角卡片，彩色边框
    bg: '#ffffff',
    border: '#6366f1',
    borderWidth: 6,
    borderRadius: 24,
    textColor: '#1e1b4b',
    accentColor: '#6366f1',
  },
  {
    id: 1,
    label: '贴纸2',
    // 渐变暖色背景
    bg: 'linear', // 特殊标记，Canvas 用 createLinearGradient
    gradientColors: ['#fef3c7', '#fde68a'],
    border: '#f59e0b',
    borderWidth: 5,
    borderRadius: 20,
    textColor: '#78350f',
    accentColor: '#f59e0b',
  },
  {
    id: 2,
    label: '贴纸3',
    // 深色星空风
    bg: '#1e1b4b',
    border: '#818cf8',
    borderWidth: 5,
    borderRadius: 20,
    textColor: '#e0e7ff',
    accentColor: '#fbbf24',
  },
];
```

### 4.5 Canvas 渲染单张贴纸

贴纸尺寸：300×360px（适合打印和展示）

```js
const renderStickerToCanvas = async (entry, student, className, template) => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  // 1. 背景
  if (template.bg === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    template.gradientColors.forEach((c, i) =>
      grad.addColorStop(i / (template.gradientColors.length - 1), c)
    );
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = template.bg;
  }
  roundRect(ctx, 0, 0, 300, 360, template.borderRadius);
  ctx.fill();

  // 2. 边框
  ctx.strokeStyle = template.border;
  ctx.lineWidth = template.borderWidth;
  roundRect(ctx, template.borderWidth / 2, template.borderWidth / 2,
    300 - template.borderWidth, 360 - template.borderWidth, template.borderRadius);
  ctx.stroke();

  // 3. 宠物图片（Lv7，居中上方）
  const imgSrc = getPetImagePath(entry.pet_type_id, 7);
  const img = await loadImageToCanvas(imgSrc);
  const imgSize = 150;
  const imgX = (300 - imgSize) / 2;
  ctx.drawImage(img, imgX, 30, imgSize, imgSize);

  // 4. 宠物名
  ctx.fillStyle = template.textColor;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(entry.pet_name || entry.pet_type_id, 150, 210);

  // 5. 学生姓名 · 班级
  ctx.font = '16px sans-serif';
  ctx.fillStyle = template.accentColor;
  ctx.fillText(`${student.name} · ${className || '班级'}`, 150, 240);

  // 6. 累计经验
  ctx.font = '14px sans-serif';
  ctx.fillStyle = template.textColor;
  ctx.fillText(`⭐ 累计 ${student.lifetime_exp || 0} exp`, 150, 268);

  // 7. 装饰小圆点（模拟贴纸顶部挂孔）
  ctx.fillStyle = template.border;
  ctx.beginPath();
  ctx.arc(150, 12, 6, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
};

// 工具函数：圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 工具函数：加载图片到 Canvas
function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // 加载失败用空白占位
      const offscreen = document.createElement('canvas');
      offscreen.width = 1; offscreen.height = 1;
      resolve(offscreen);
    };
    img.src = src;
  });
}
```

### 4.6 下载逻辑

**下载宠物原图**（直接下载 Lv7 PNG）：
```js
const handleDownloadOriginal = async (entry) => {
  const src = getPetImagePath(entry.pet_type_id, 7);
  const a = document.createElement('a');
  a.href = src;
  a.download = `${entry.pet_name || entry.pet_type_id}_lv7.png`;
  a.click();
};
```

**下载冰箱贴**（单张）：
```js
const handleDownloadSticker = async (entry, student) => {
  const canvas = await renderStickerToCanvas(
    entry, student, currentClass?.name, STICKER_TEMPLATES[selectedTemplate]
  );
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${student.name}_${entry.pet_name}_冰箱贴.png`;
  a.click();
};
```

**批量下载 zip**（全选 / 多选）：

使用 [JSZip](https://stuk.github.io/jszip/)，需要安装：`npm install jszip`

```js
const handleBatchDownload = async () => {
  setDownloading(true);
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const currentData = studentsWithGraduated[selectedStudentIdx];
  const targets = currentData.graduated.filter((e) => selectedStickers.has(e.id));

  for (const entry of targets) {
    const canvas = await renderStickerToCanvas(
      entry, currentData.student, currentClass?.name, STICKER_TEMPLATES[selectedTemplate]
    );
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    zip.file(`${currentData.student.name}_${entry.pet_name}_冰箱贴.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentData.student.name}_冰箱贴合集.zip`;
  a.click();
  URL.revokeObjectURL(url);
  setDownloading(false);
};
```

### 4.7 全选逻辑

```js
const currentGraduated = studentsWithGraduated[selectedStudentIdx]?.graduated || [];

const handleToggleAll = () => {
  if (selectedStickers.size === currentGraduated.length) {
    setSelectedStickers(new Set());
  } else {
    setSelectedStickers(new Set(currentGraduated.map((e) => e.id)));
  }
};
```

---

## 五、CSS `HonorWorkshop.css`

```css
.honor-workshop {
  display: flex;
  height: 100%;
  gap: 0;
}

/* 左侧导航 */
.honor-sidebar {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 12px;
  border-right: 1px solid var(--border-color, rgba(255,255,255,0.1));
}

.honor-nav-item {
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary, rgba(255,255,255,0.6));
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;
}

.honor-nav-item:hover {
  background: var(--hover-bg, rgba(255,255,255,0.08));
  color: var(--text-primary, #fff);
}

.honor-nav-item.active {
  background: var(--accent-color, #6366f1);
  color: #fff;
  font-weight: 600;
}

/* 右侧内容 */
.honor-content {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 20px;
}

.honor-coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  font-size: 16px;
}

/* 冰箱贴工坊 */
.sticker-workshop {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

/* 顶部工具栏 */
.sticker-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sticker-template-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.sticker-template-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: #fff;
}

.sticker-toolbar-spacer { flex: 1; }

/* 主体：学生列表 + 预览 */
.sticker-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 16px;
}

.sticker-student-list {
  width: 180px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  padding-right: 12px;
}

.sticker-student-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.sticker-student-item:hover { background: var(--hover-bg); }
.sticker-student-item.active { background: var(--accent-color); color: #fff; }

.sticker-student-count {
  font-size: 13px;
  font-weight: 600;
  opacity: 0.7;
}

/* 贴纸预览网格 */
.sticker-preview-area {
  flex: 1;
  overflow-y: auto;
}

.sticker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.sticker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.sticker-item canvas {
  width: 150px;
  height: 180px;
  border-radius: 12px;
  transition: transform 0.15s;
}

.sticker-item:hover canvas { transform: scale(1.03); }

.sticker-item-selected canvas {
  outline: 3px solid var(--accent-color);
}

.sticker-item-actions {
  display: flex;
  gap: 6px;
}
```

---

## 六、改动文件总览

| 文件 | 类型 | 改动 |
|------|------|------|
| `src/App.jsx` | 修改 | 新增 honor Tab + 渲染入口 |
| `src/components/HonorWorkshop/HonorWorkshop.jsx` | 新建 | 主框架 |
| `src/components/HonorWorkshop/StickerWorkshop.jsx` | 新建 | 冰箱贴制作 |
| `src/components/HonorWorkshop/HonorWorkshop.css` | 新建 | 样式 |
| `package.json` | 修改 | 新增 jszip 依赖（`npm install jszip`） |

---

## 七、注意事项

1. **跨域图片**：`img.crossOrigin = 'anonymous'` 是必须的，否则 Canvas 会被污染无法导出。静态宠物图片（同域）一般没问题，R2 代理图片需要确认响应头有 `Access-Control-Allow-Origin: *`。

2. **R2 图片 CORS**：在 `handleGetPetImage` 的响应 headers 里加：
   ```js
   headers.set('Access-Control-Allow-Origin', '*');
   ```
   **这个改动需要同步到 `src-server/index.js`**。

3. **JSZip 动态 import**：用 `await import('jszip')` 懒加载，不影响首屏体积。

4. **贴纸预览**：预览直接用 Canvas 元素展示（不转 data URL），只有下载时才导出 PNG。

---

## 八、验证步骤

1. 顶部导航出现「荣誉工坊」Tab，点击进入
2. 左侧三个功能入口，光荣榜证书和毕业证书显示「即将上线」
3. 冰箱贴制作：左侧显示有毕业宠物的学生列表 + 毕业数量
4. 点击学生 → 右侧出现该学生所有毕业宠物的贴纸预览
5. 切换模版 → 贴纸样式实时变化
6. 勾选单张 → 下载原图 / 下载冰箱贴 PNG 正常
7. 全选 → 批量下载 zip，解压后每张贴纸独立 PNG
8. 自定义宠物图片（R2）在贴纸中能正常显示（不报 CORS 错误）
