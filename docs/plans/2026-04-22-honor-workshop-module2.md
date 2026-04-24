# 荣誉工坊 — 模块二：光荣榜证书制作

## 背景

在荣誉工坊框架（Module 1）基础上，实现「光荣榜证书制作」功能。
点击左侧导航「光荣榜证书制作」后，右侧显示本模块。

全部纯前端实现（Canvas 生成证书图片），不需要后端改动。

---

## 一、新建组件 `src/components/HonorWorkshop/CertWorkshop.jsx`

### 1.1 Props

```js
// HonorWorkshop.jsx 传入
<CertWorkshop
  students={students}        // 全班学生数组
  currentClass={currentClass} // { id, name }
  user={user}                // 当前登录用户，用于默认颁奖人姓名
/>
```

### 1.2 State

```js
const [rankType, setRankType]       = useState('pet');      // 'pet' | 'progress'
const [topN, setTopN]               = useState(10);          // 1-50
const [progressRange, setProgressRange] = useState('7d');   // 'today'|'7d'|'30d'，仅 rankType=progress 时用
const [progressData, setProgressData]   = useState([]);     // 进步榜 API 返回数据
const [progressLoading, setProgressLoading] = useState(false);
const [ranked, setRanked]           = useState([]);          // 最终排好序、截取 topN 的学生数组
const [currentIdx, setCurrentIdx]   = useState(0);          // 当前预览第几张（0-based）

const [awarderName, setAwarderName] = useState(user?.username || '');
const [certDate, setCertDate]       = useState(() => new Date().toLocaleDateString('zh-CN'));
const [speechIdx, setSpeechIdx]     = useState(0);          // 当前选中的话术模版下标
const [speechText, setSpeechText]   = useState(SPEECH_TEMPLATES[0]);  // 可自由编辑的话术正文
const [templateIdx, setTemplateIdx] = useState(0);          // 证书样式模版
const [downloading, setDownloading] = useState(false);
```

### 1.3 榜单计算逻辑

```js
// 战力榜：直接用学生数组排序，取前 topN
useEffect(() => {
  if (rankType === 'pet') {
    const sorted = [...students]
      .filter((s) => s.lifetime_exp > 0)
      .sort((a, b) => (b.lifetime_exp || 0) - (a.lifetime_exp || 0))
      .slice(0, topN);
    setRanked(sorted);
    setCurrentIdx(0);
  }
}, [rankType, topN, students]);

// 进步榜：调 API，需要 currentClass.id + progressRange
useEffect(() => {
  if (rankType !== 'progress' || !currentClass?.id) return;
  setProgressLoading(true);
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  let start;
  if (progressRange === 'today') start = end;
  else if (progressRange === '7d') {
    const d = new Date(today); d.setDate(d.getDate() - 7);
    start = d.toISOString().slice(0, 10);
  } else {
    const d = new Date(today); d.setDate(d.getDate() - 30);
    start = d.toISOString().slice(0, 10);
  }
  fetchProgressRanking({ classId: currentClass.id, start, end, limit: topN })
    .then((res) => {
      setProgressData(res?.ranking || []);
      // 进步榜 API 返回 { student_id, total_exp, ... }，与 students 合并
      const ids = new Set((res?.ranking || []).map((r) => r.student_id));
      const merged = (res?.ranking || [])
        .map((r) => students.find((s) => s.id === r.student_id))
        .filter(Boolean)
        .slice(0, topN);
      setRanked(merged);
      setCurrentIdx(0);
    })
    .catch(() => setProgressData([]))
    .finally(() => setProgressLoading(false));
}, [rankType, progressRange, topN, currentClass?.id, students]);
```

### 1.4 话术模版切换

切换模版时同步更新 `speechText`（允许后续手动覆盖）：

```js
const handleSelectSpeech = (idx) => {
  setSpeechIdx(idx);
  setSpeechText(SPEECH_TEMPLATES[idx]);
};
```

### 1.5 Canvas 渲染函数

```js
/**
 * 渲染单张证书到 canvas（800×1130px）
 * @param {object} student  学生数据
 * @param {number} rank     排名（1-based）
 * @param {object} opts     { awarderName, certDate, speechText, template }
 * @returns {Promise<HTMLCanvasElement>}
 */
async function renderCertToCanvas(student, rank, opts) {
  const { awarderName, certDate, speechText, template } = opts;
  const W = 800, H = 1130;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── 1. 背景 ──
  if (template.bg === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    template.gradientColors.forEach((c, i) =>
      grad.addColorStop(i / (template.gradientColors.length - 1), c));
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = template.bg;
  }
  ctx.fillRect(0, 0, W, H);

  // ── 2. 外边框（双线装饰框）──
  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, W - 64, H - 64);

  // ── 3. 顶部标题 ──
  ctx.fillStyle = template.titleColor;
  ctx.font = `bold 52px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('荣誉证书', W / 2, 120);

  // 副标题（班级名 + 榜单类型）
  ctx.font = `18px sans-serif`;
  ctx.fillStyle = template.subColor;
  ctx.fillText(`${opts.className || ''} · 光荣榜`, W / 2, 160);

  // ── 4. 分隔线 ──
  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, 180); ctx.lineTo(W - 80, 180);
  ctx.stroke();

  // ── 5. 宠物图片（圆形裁剪，居中） ──
  const imgSrc = getPetImagePath(student.pet_type_id, student.pet_level || 1);
  const img = await loadImageToCanvas(imgSrc);  // 复用 StickerWorkshop 同名函数，或在此文件内定义
  const imgSize = 200;
  const imgX = (W - imgSize) / 2;
  const imgY = 210;
  // 圆形裁剪
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
  ctx.restore();
  // 圆形边框
  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  // ── 6. 排名徽章（右上角小圆） ──
  ctx.fillStyle = template.accentColor;
  ctx.beginPath();
  ctx.arc(W / 2 + imgSize / 2 - 10, imgY + 20, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${rank}`, W / 2 + imgSize / 2 - 10, imgY + 26);

  // ── 7. 学生姓名 ──
  ctx.fillStyle = template.nameColor;
  ctx.font = `bold 44px serif`;
  ctx.textAlign = 'center';
  ctx.fillText(student.name, W / 2, 470);

  // ── 8. 颁奖词正文（自动换行） ──
  ctx.fillStyle = template.textColor;
  ctx.font = `20px serif`;
  ctx.textAlign = 'center';
  wrapText(ctx, speechText, W / 2, 530, W - 160, 34);  // 见下方 wrapText

  // ── 9. 底部：日期 + 颁奖人 ──
  const bottomY = H - 100;
  ctx.fillStyle = template.subColor;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`日期：${certDate}`, 100, bottomY);
  ctx.textAlign = 'right';
  ctx.fillText(`颁奖人：${awarderName}`, W - 100, bottomY);

  // 签名下划线
  ctx.strokeStyle = template.subColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W - 300, bottomY + 8); ctx.lineTo(W - 100, bottomY + 8);
  ctx.stroke();

  return canvas;
}

/** Canvas 文字自动换行 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  // 按标点+空格分段，逐字符测宽后换行
  const chars = text.split('');
  let line = '';
  let currentY = y;
  for (const char of chars) {
    const testLine = line + char;
    if (char === '\n') {
      ctx.fillText(line, x, currentY);
      line = '';
      currentY += lineHeight;
    } else if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
}
```

### 1.6 下载 & 打印

```js
// 下载当前证书
const handleDownloadCurrent = useCallback(async () => {
  const student = ranked[currentIdx];
  if (!student) return;
  const canvas = await renderCertToCanvas(student, currentIdx + 1, {
    awarderName, certDate, speechText,
    template: CERT_TEMPLATES[templateIdx],
    className: currentClass?.name,
  });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = `${student.name}_光荣榜证书.png`;
  a.click();
}, [ranked, currentIdx, awarderName, certDate, speechText, templateIdx, currentClass?.name]);

// 批量打包 zip
const handleBatchDownload = useCallback(async () => {
  if (ranked.length === 0) return;
  setDownloading(true);
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (let i = 0; i < ranked.length; i++) {
      const canvas = await renderCertToCanvas(ranked[i], i + 1, {
        awarderName, certDate, speechText,
        template: CERT_TEMPLATES[templateIdx],
        className: currentClass?.name,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      zip.file(`${String(i + 1).padStart(2, '0')}_${ranked[i].name}_光荣榜证书.png`, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a'); a.href = url;
    a.download = `${currentClass?.name || '班级'}_光荣榜证书合集.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setDownloading(false);
  }
}, [ranked, awarderName, certDate, speechText, templateIdx, currentClass?.name]);

// 打印当前证书（A4）
const handlePrint = useCallback(async () => {
  const student = ranked[currentIdx];
  if (!student) return;
  const canvas = await renderCertToCanvas(student, currentIdx + 1, {
    awarderName, certDate, speechText,
    template: CERT_TEMPLATES[templateIdx],
    className: currentClass?.name,
  });
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>打印证书</title>
    <style>
      body { margin: 0; }
      img { width: 100%; max-width: 210mm; display: block; margin: auto; }
      @media print { @page { size: A4 portrait; margin: 0; } }
    </style></head>
    <body><img src="${dataUrl}" onload="window.print();window.close();" /></body>
    </html>`);
  win.document.close();
}, [ranked, currentIdx, awarderName, certDate, speechText, templateIdx, currentClass?.name]);
```

---

## 二、数据常量（在 CertWorkshop.jsx 顶部定义）

### 2.1 证书样式模版 `CERT_TEMPLATES`（3 套）

```js
const CERT_TEMPLATES = [
  {
    id: 0,
    label: '典雅白',
    bg: '#fffdf7',
    borderColor: '#c9a84c',
    titleColor: '#7a5c00',
    subColor: '#a08040',
    nameColor: '#3a2a00',
    textColor: '#4a3a10',
    accentColor: '#c9a84c',
    gradientColors: null,
  },
  {
    id: 1,
    label: '暖橙羊皮纸',
    bg: 'linear',
    gradientColors: ['#fef9ec', '#fde9b8'],
    borderColor: '#e07b00',
    titleColor: '#8b4500',
    subColor: '#c26000',
    nameColor: '#5a2d00',
    textColor: '#6b3c00',
    accentColor: '#e07b00',
  },
  {
    id: 2,
    label: '深蓝星空',
    bg: '#0f172a',
    borderColor: '#7c83d0',
    titleColor: '#e0d5ff',
    subColor: '#8892c0',
    nameColor: '#ffffff',
    textColor: '#c8d0f0',
    accentColor: '#fbbf24',
    gradientColors: null,
  },
];
```

### 2.2 话术模版 `SPEECH_TEMPLATES`（20 条）

```js
const SPEECH_TEMPLATES = [
  '在这段学习旅程中，你以坚持不懈的努力和积极进取的精神，荣登班级光荣榜。你的努力有目共睹，你的进步令人钦佩！',
  '你用实际行动证明了：只要坚持，每一步都是进步。特颁此证，以资鼓励！',
  '优秀不是终点，而是新的起点。你以优异的表现赢得了这份荣誉，愿你继续乘风破浪！',
  '点滴积累，终成大海。你的每一分努力都化作今日的荣耀，这份荣誉当之无愧！',
  '学如逆水行舟，不进则退。你选择了勇往直前，今天的荣誉是对你最好的嘉奖！',
  '在班级的大家庭里，你是一颗闪亮的星。感谢你用努力照亮了自己，也激励了他人！',
  '好奇心是最好的老师，勤奋是最短的捷径。你把这两者都做到了，了不起！',
  '不积跬步，无以至千里。你以坚实的每一步，走出了属于自己的光荣之路！',
  '荣誉是努力的镜子，它映照出你一路走来的汗水与坚持。继续加油，未来可期！',
  '今天的你，因努力而闪光；明天的你，因坚持而更强。这份荣誉，送给最棒的你！',
  '你证明了一件事：平凡的坚持可以创造不平凡的成绩。为你喝彩，为你自豪！',
  '成长的路上没有捷径，但有你这样努力的同学，每一步都走得扎实而有力！',
  '荣誉榜上有你的名字，这背后是你日复一日的坚持与付出，特此表彰，实至名归！',
  '一份耕耘，一份收获。你用努力换来了今天的荣誉，愿这份荣誉成为你继续前行的动力！',
  '勤奋是最美的风景，努力是最亮的光芒。你的表现让人眼前一亮，值得被记住！',
  '成绩背后是汗水，荣誉背后是坚持。谢谢你让班级因你而更精彩！',
  '你是班级里一道独特的风景，用认真和热情书写着属于自己的故事，继续加油！',
  '大海因浪花而壮阔，班级因有你而更精彩。这份荣誉属于你，更属于努力的你！',
  '知不足而奋进，望远山而力行。你做到了，特颁此证，愿荣誉成为你前行的风帆！',
  '今天你站在荣誉榜上，明天你将站在更高的舞台。出发吧，未来因你而不同！',
];
```

---

## 三、JSX 结构

```jsx
return (
  <div className="cert-workshop">

    {/* ── 顶部筛选栏 ── */}
    <div className="cert-filter-bar glass-card">
      {/* 榜单类型 */}
      <label className="cert-filter-item">
        <span>榜单类型</span>
        <select className="glass-input" value={rankType} onChange={(e) => setRankType(e.target.value)}>
          <option value="pet">战力榜（累计经验）</option>
          <option value="progress">进步榜</option>
        </select>
      </label>

      {/* 进步榜时间范围（仅 rankType=progress 显示） */}
      {rankType === 'progress' && (
        <label className="cert-filter-item">
          <span>时间范围</span>
          <select className="glass-input" value={progressRange} onChange={(e) => setProgressRange(e.target.value)}>
            <option value="today">今天</option>
            <option value="7d">近7天</option>
            <option value="30d">近30天</option>
          </select>
        </label>
      )}

      {/* 取前 N 名 */}
      <label className="cert-filter-item">
        <span>取前</span>
        <input
          className="glass-input"
          type="number" min={1} max={50} value={topN}
          onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value))))}
          style={{ width: 70 }}
        />
        <span>名</span>
      </label>

      {progressLoading && <span className="cert-filter-loading">加载进步榜…</span>}
      <span className="cert-filter-result">共 {ranked.length} 人</span>
    </div>

    {/* ── 主体：左控制 + 右预览 ── */}
    <div className="cert-body">

      {/* 左：控制面板 */}
      <div className="cert-controls glass-card">
        {/* 证书样式 */}
        <div className="cert-control-section">
          <div className="cert-control-label">证书样式</div>
          <div className="cert-template-btns">
            {CERT_TEMPLATES.map((t) => (
              <button key={t.id} type="button"
                className={`cert-template-btn ${templateIdx === t.id ? 'active' : ''}`}
                onClick={() => setTemplateIdx(t.id)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {/* 颁奖人 */}
        <div className="cert-control-section">
          <div className="cert-control-label">颁奖人</div>
          <input className="glass-input" type="text" value={awarderName}
            onChange={(e) => setAwarderName(e.target.value)} maxLength={20} />
        </div>

        {/* 日期 */}
        <div className="cert-control-section">
          <div className="cert-control-label">颁奖日期</div>
          <input className="glass-input" type="text" value={certDate}
            onChange={(e) => setCertDate(e.target.value)} maxLength={20} />
        </div>

        {/* 话术模版选择 */}
        <div className="cert-control-section">
          <div className="cert-control-label">话术模版</div>
          <select className="glass-input cert-speech-select"
            value={speechIdx}
            onChange={(e) => handleSelectSpeech(Number(e.target.value))}
          >
            {SPEECH_TEMPLATES.map((t, i) => (
              <option key={i} value={i}>模版 {i + 1}：{t.slice(0, 16)}…</option>
            ))}
          </select>
        </div>

        {/* 话术编辑 */}
        <div className="cert-control-section">
          <div className="cert-control-label">颁奖词（可编辑）</div>
          <textarea
            className="glass-input cert-speech-editor"
            value={speechText}
            onChange={(e) => setSpeechText(e.target.value)}
            rows={5}
            maxLength={200}
          />
          <div className="cert-speech-count">{speechText.length}/200</div>
        </div>
      </div>

      {/* 右：证书预览 */}
      <div className="cert-preview-panel">
        {ranked.length === 0 ? (
          <div className="cert-preview-empty">
            {progressLoading ? '加载中…' : '暂无学生，请调整筛选条件'}
          </div>
        ) : (
          <>
            {/* Canvas 预览 */}
            <CertCanvas
              key={`${currentIdx}-${templateIdx}-${speechText}-${awarderName}-${certDate}`}
              student={ranked[currentIdx]}
              rank={currentIdx + 1}
              opts={{ awarderName, certDate, speechText, template: CERT_TEMPLATES[templateIdx], className: currentClass?.name }}
            />

            {/* 翻页 */}
            <div className="cert-pagination">
              <button type="button" className="cert-page-btn"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}>‹ 上一张</button>
              <span className="cert-page-info">{currentIdx + 1} / {ranked.length}</span>
              <button type="button" className="cert-page-btn"
                onClick={() => setCurrentIdx((i) => Math.min(ranked.length - 1, i + 1))}
                disabled={currentIdx === ranked.length - 1}>下一张 ›</button>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ── 底部操作栏 ── */}
    <div className="cert-action-bar">
      <button type="button" className="confirm-btn secondary" onClick={handleDownloadCurrent}
        disabled={ranked.length === 0}>
        下载当前证书
      </button>
      <button type="button" className="confirm-btn" onClick={handleBatchDownload}
        disabled={ranked.length === 0 || downloading}>
        {downloading ? '打包中…' : `批量下载全部 (${ranked.length} 张)`}
      </button>
      <button type="button" className="confirm-btn secondary" onClick={handlePrint}
        disabled={ranked.length === 0}>
        打印当前证书
      </button>
    </div>
  </div>
);
```

---

## 四、CertCanvas 子组件（内部，负责 canvas 渲染）

```jsx
// 在 CertWorkshop.jsx 内部定义，类似 StickerWorkshop 里的 StickerCanvas
const CertCanvas = ({ student, rank, opts }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offscreen = await renderCertToCanvas(student, rank, opts);
      if (cancelled || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 800, 1130);
      ctx.drawImage(offscreen, 0, 0);
    })();
    return () => { cancelled = true; };
  }, [student, rank, opts]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={1130}
      className="cert-canvas"
    />
  );
};
```

---

## 五、接入 HonorWorkshop.jsx

### 5.1 import

```js
import CertWorkshop from './CertWorkshop';
```

### 5.2 修改 honor-cert 分支（目前是占位符）

```jsx
{activeSection === 'honor-cert' && (
  <CertWorkshop
    students={students}
    currentClass={currentClass}
    user={user}
  />
)}
```

### 5.3 HonorWorkshop.jsx 需要接收 user prop（已在 App.jsx 传入，确认 HonorWorkshop.jsx 中声明并透传）

检查 HonorWorkshop.jsx 当前是否使用了 `user` prop，若没有则补上：
```jsx
const HonorWorkshop = ({ students, currentClass, user }) => { ... }
// 渲染时透传给 CertWorkshop
```

---

## 六、样式（追加到 `HonorWorkshop.css`）

```css
/* 光荣榜证书 */
.cert-workshop {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.cert-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
}

.cert-filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.cert-filter-loading {
  font-size: 13px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.cert-filter-result {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: auto;
}

.cert-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
}

/* 左控制面板 */
.cert-controls {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

.cert-control-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cert-control-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cert-template-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cert-template-btn {
  padding: 5px 12px;
  border-radius: 16px;
  border: 1.5px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.cert-template-btn.active {
  background: var(--accent-color, #6366f1);
  border-color: var(--accent-color, #6366f1);
  color: #fff;
}

.cert-speech-select {
  font-size: 13px;
}

.cert-speech-editor {
  resize: vertical;
  font-size: 14px;
  line-height: 1.6;
}

.cert-speech-count {
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

/* 右预览面板 */
.cert-preview-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  overflow-y: auto;
}

.cert-canvas {
  /* 缩放显示，canvas 物理尺寸 800×1130，显示宽度约 360px */
  width: 360px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  display: block;
}

.cert-preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  font-size: 15px;
}

.cert-pagination {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cert-page-btn {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.cert-page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.cert-page-btn:not(:disabled):hover {
  background: var(--hover-bg);
}

.cert-page-info {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

/* 底部操作栏 */
.cert-action-bar {
  display: flex;
  gap: 12px;
  padding: 12px 0 4px;
  flex-wrap: wrap;
}
```

---

## 七、复用清单

| 需求 | 复用来源 |
|------|---------|
| `getPetImagePath` | `src/api/petLibrary.js` |
| `fetchProgressRanking` | `src/api/client.js:109` |
| `loadImageToCanvas` | 参考 StickerWorkshop.jsx 内同名函数，在 CertWorkshop.jsx 内重新定义（避免 import） |
| `glass-card`、`glass-input`、`confirm-btn` | `App.css` 全局 |
| JSZip 动态 import | 与 StickerWorkshop 同模式 |

---

## 八、改动文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/components/HonorWorkshop/CertWorkshop.jsx` | 新建 | 光荣榜证书制作完整组件 |
| `src/components/HonorWorkshop/HonorWorkshop.jsx` | 修改 | import CertWorkshop；honor-cert 分支替换占位符；补 user prop |
| `src/components/HonorWorkshop/HonorWorkshop.css` | 修改 | 追加 cert-* 样式 |

不需要改动后端、数据库、client.js（fetchProgressRanking 已存在）。

---

## 九、验证步骤

1. 切到「荣誉工坊」→「光荣榜证书制作」，战力榜默认取前 10 名，列表非空时显示第一张证书预览。
2. 切换「进步榜」，选择「近7天」，应发起 API 请求并刷新预览。
3. 上一张 / 下一张翻页正常，页码显示正确（第一张时「上一张」置灰，最后一张时「下一张」置灰）。
4. 切换证书样式（典雅白/暖橙/深蓝），Canvas 重新渲染，配色正确。
5. 切换话术模版，颁奖词文本框同步更新；手动编辑后不因翻页而丢失。
6. 修改颁奖人、日期，Canvas 实时反映。
7. 「下载当前证书」：浏览器下载一张 800×1130 PNG。
8. 「批量下载全部」：下载 zip，内有 N 张以`01_姓名_光荣榜证书.png`命名的文件。
9. 「打印当前证书」：弹出新标签页，自动触发打印对话框，预览为 A4 竖向证书图。
10. 宠物图片（来自 R2 或本地 assets）正常渲染在证书中，无跨域错误（已有 CORS 头）。
