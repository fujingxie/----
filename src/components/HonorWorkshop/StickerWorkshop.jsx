import React, { useCallback, useMemo, useState } from 'react';
import { getPetImagePath } from '../../api/petLibrary';

// ─── 工具列表（左侧导航栏）────────────────────────────────────────────────────

const TOOLS = [
  { id: 'sticker',       label: '冰箱贴制作',     icon: '🧲', desc: '为毕业宠物生成专属纪念贴' },
  { id: 'honor-cert',   label: '光荣榜证书制作', icon: '📜', desc: '为上榜同学颁发荣誉证书' },
  { id: 'graduate-cert', label: '毕业证书制作',   icon: '🎓', desc: '为毕业宠物颁发毕业证' },
];

// ─── 贴纸分类常量（4 类 22 个样式）──────────────────────────────────────────

const STICKER_CATEGORIES = [
  {
    id: 'classic', label: '经典',
    stickers: [
      { id: 'c1', name: '奶油边框', ring: '#F3E6C7', bg: '#FBF3DE' },
      { id: 'c2', name: '薄荷方卡', ring: '#CFE7DA', bg: '#E6F3EC' },
      { id: 'c3', name: '羊皮卷',   ring: '#E8DAB8', bg: '#F6EDD4' },
      { id: 'c4', name: '极简白',   ring: '#EDEDED', bg: '#FFFFFF' },
      { id: 'c5', name: '炭灰印',   ring: '#2D3936', bg: '#F5F2E8' },
    ],
  },
  {
    id: 'cute', label: '萌趣',
    stickers: [
      { id: 'k1', name: '樱花粉',   ring: '#F3CBD8', bg: '#FDE7EE' },
      { id: 'k2', name: '云朵',     ring: '#D8E3F1', bg: '#EAF1FB' },
      { id: 'k3', name: '柠檬糖',   ring: '#F1E2A5', bg: '#FBF3C7' },
      { id: 'k4', name: '草莓牛奶', ring: '#F1BEC3', bg: '#FDE3E3' },
      { id: 'k5', name: '抹茶',     ring: '#B9D4AE', bg: '#DCEBCF' },
      { id: 'k6', name: '桃子',     ring: '#F5C9AD', bg: '#FDE5D2' },
    ],
  },
  {
    id: 'badge', label: '奖章',
    stickers: [
      { id: 'b1', name: '金质勋章', ring: '#D8B35A', bg: '#FBEFC8' },
      { id: 'b2', name: '毕业印章', ring: '#B86A4E', bg: '#FBE4D7' },
      { id: 'b3', name: '徽章蓝',   ring: '#6B8FBE', bg: '#E1EBF7' },
      { id: 'b4', name: '荣誉紫',   ring: '#9786C3', bg: '#EBE4F4' },
      { id: 'b5', name: '绿丝带',   ring: '#6BAE9F', bg: '#E2F0EA' },
    ],
  },
  {
    id: 'season', label: '季节',
    stickers: [
      { id: 's1s', name: '春日樱', ring: '#EEC3CF', bg: '#FCE5EC' },
      { id: 's2s', name: '夏日海', ring: '#9BC4D8', bg: '#D7EBF5' },
      { id: 's3s', name: '秋日枫', ring: '#D29865', bg: '#F5DEC4' },
      { id: 's4s', name: '冬日雪', ring: '#CAD8E5', bg: '#EDF2F8' },
      { id: 's5s', name: '新年红', ring: '#D27060', bg: '#F8DAD2' },
      { id: 's6s', name: '教师节', ring: '#C7A46A', bg: '#F4E7CB' },
    ],
  },
];

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

function parsePetCollection(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    if (typeof parsed[0] === 'string') return JSON.parse(parsed[0]);
    return parsed;
  } catch {
    return [];
  }
}

function isPetGraduated(pet) {
  return pet.graduated === true || pet.status === 'graduated';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

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

// ─── Canvas 渲染（下载专用，只渲染贴纸卡片本身）─────────────────────────────

// renderFridgeMagnetToCanvas 接收 student 用于 fallback lifetime_exp
async function renderFridgeMagnetToCanvas(pet, student, className, sticker) {
  const W = 600;
  const H = 760;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = sticker.bg;
  roundRect(ctx, 0, 0, W, H, 40);
  ctx.fill();

  // 边框
  ctx.strokeStyle = sticker.ring;
  ctx.lineWidth = 6;
  roundRect(ctx, 3, 3, W - 6, H - 6, 40);
  ctx.stroke();

  // 胶带装饰（顶部中央）
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  roundRect(ctx, W / 2 - 80, 0, 160, 28, 4);
  ctx.fill();
  ctx.stroke();

  // 宠物图片区
  const imgAreaY = 40;
  const imgAreaH = 380;
  ctx.fillStyle = pet.bg || sticker.bg;
  ctx.strokeStyle = sticker.ring;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  roundRect(ctx, 30, imgAreaY, W - 60, imgAreaH, 30);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // 宠物图片或 emoji
  const petType = pet.type || pet.pet_type_id;
  const petLevel = pet.level || pet.pet_level || 1;
  let img = null;
  if (petType) img = await loadImage(getPetImagePath(petType, petLevel));

  if (img) {
    const size = 280;
    ctx.drawImage(img, (W - size) / 2, imgAreaY + (imgAreaH - size) / 2, size, size);
  } else {
    ctx.font = '200px serif';
    ctx.textAlign = 'center';
    ctx.fillText(pet.emoji || '🐾', W / 2, imgAreaY + imgAreaH - 60);
  }

  // Lv 徽章（左上角）
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  roundRect(ctx, 50, imgAreaY + 16, 90, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#243330';
  ctx.font = 'bold 20px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv.${petLevel}`, 95, imgAreaY + 40);

  // GRADUATED 徽章（右下角）
  ctx.fillStyle = sticker.ring;
  roundRect(ctx, W - 170, imgAreaY + imgAreaH - 52, 140, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✦ 光荣毕业', W - 100, imgAreaY + imgAreaH - 28);

  // 宠物名
  const petName = pet.name || pet.pet_name || '未命名';
  ctx.fillStyle = '#243330';
  ctx.font = 'bold 42px "Noto Serif SC", "Noto Sans SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText(petName, W / 2, imgAreaY + imgAreaH + 64);

  // 学生名 + 班级
  ctx.fillStyle = '#6B7570';
  ctx.font = '24px "Noto Sans SC", sans-serif';
  ctx.fillText(`${student.name} · ${className || ''}`, W / 2, imgAreaY + imgAreaH + 104);

  // 分隔线
  ctx.strokeStyle = sticker.ring;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(50, imgAreaY + imgAreaH + 124);
  ctx.lineTo(W - 50, imgAreaY + imgAreaH + 124);
  ctx.stroke();
  ctx.setLineDash([]);

  // EXP + 毕业日期：优先 grad_exp（毕业快照），fallback 学生累积经验
  const exp = getPetDisplayExp(pet, student);
  const graduatedAt = pet.graduatedAt || pet.graduated_at || pet.completed_at;
  ctx.fillStyle = '#5A6864';
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⭐ ${exp} exp`, 60, imgAreaY + imgAreaH + 164);
  ctx.textAlign = 'right';
  ctx.font = '20px monospace';
  ctx.fillText(formatDate(graduatedAt), W - 60, imgAreaY + imgAreaH + 164);

  return canvas;
}

// ─── 取宠物展示用经验：优先用 grad_exp（毕业时快照），fallback 到学生累积经验 ──

function getPetDisplayExp(pet, student) {
  // grad_exp：新格式，宠物毕业时保存的本宠经验
  if (pet.grad_exp != null && pet.grad_exp > 0) return pet.grad_exp;
  // 旧数据没有 grad_exp，fallback 到学生的战力累积经验
  return student?.lifetime_exp ?? 0;
}

// ─── BigMagnetPreview（DOM 可视预览，不用于下载）──────────────────────────────

const BigMagnetPreview = ({ pet, student, className, sticker }) => {
  const [imgError, setImgError] = useState(false);
  const petType = pet.type || pet.pet_type_id;
  const petLevel = pet.level || pet.pet_level || 1;
  const imgSrc = petType ? getPetImagePath(petType, petLevel) : null;
  const petName = pet.name || pet.pet_name || '未命名';
  const exp = getPetDisplayExp(pet, student);
  const graduatedAt = pet.graduatedAt || pet.graduated_at || pet.completed_at;

  return (
    <div style={{
      width: 300,
      padding: 20,
      borderRadius: 28,
      background: sticker.bg,
      border: `3px solid ${sticker.ring}`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 6px 12px rgba(0,0,0,0.08)',
      transform: 'rotate(-3deg)',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* 胶带装饰 */}
      <div style={{
        position: 'absolute', top: -14, left: '50%',
        transform: 'translateX(-50%) rotate(2deg)',
        width: 80, height: 22,
        background: 'rgba(255,255,255,0.65)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 3,
      }} />

      {/* 图片区 */}
      <div style={{
        height: 220, borderRadius: 18,
        background: pet.bg || sticker.bg,
        border: `2px dashed ${sticker.ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={petName}
            style={{ width: '70%', height: '70%', objectFit: 'contain' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ fontSize: 96, lineHeight: 1 }}>{pet.emoji || '🐾'}</span>
        )}
        {/* Lv 徽章 */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.88)',
          color: '#243330', fontSize: 12, fontWeight: 700,
        }}>
          Lv.{petLevel}
        </div>
        {/* GRADUATED 徽章 */}
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          padding: '4px 10px', borderRadius: 999,
          background: sticker.ring, color: '#fff',
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
        }}>
          ✦ 光荣毕业
        </div>
      </div>

      {/* 文字信息 */}
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#243330' }}>{petName}</div>
        <div style={{ fontSize: 13, color: '#6B7570', marginTop: 2 }}>
          {student.name} · {className || ''}
        </div>
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: `1.5px dashed ${sticker.ring}`,
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, color: '#5A6864',
        }}>
          <span>⭐ <b style={{ color: '#243330' }}>{exp}</b> exp</span>
          <span style={{ fontFamily: 'monospace' }}>{formatDate(graduatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── StickerWorkshop 主组件（V2 工坊聚焦布局）───────────────────────────────

const StickerWorkshop = ({ students, currentClass, onSwitchSection }) => {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [activePetIdx, setActivePetIdx] = useState(0);
  const [activeCategoryId, setActiveCategoryId] = useState('classic');
  const [selectedStickerId, setSelectedStickerId] = useState('c1');
  const [downloading, setDownloading] = useState(false);

  // 解析所有有毕业宠物的学生
  const studentsWithGraduated = useMemo(() => {
    return (students || [])
      .map((s) => {
        const pets = parsePetCollection(s.pet_collection);
        const graduated = pets.filter(isPetGraduated);
        return graduated.length > 0 ? { student: s, graduated } : null;
      })
      .filter(Boolean);
  }, [students]);

  // 未主动选择时自动选第一个学生
  const effectiveStudentId = selectedStudentId || studentsWithGraduated[0]?.student.id || null;

  const currentData = useMemo(
    () => studentsWithGraduated.find((item) => item.student.id === effectiveStudentId) || null,
    [studentsWithGraduated, effectiveStudentId],
  );

  const currentGraduated = useMemo(() => currentData?.graduated || [], [currentData]);
  const safePetIdx = Math.min(activePetIdx, Math.max(0, currentGraduated.length - 1));
  const currentPet = currentGraduated[safePetIdx] || null;

  const activeCategory = STICKER_CATEGORIES.find((c) => c.id === activeCategoryId) || STICKER_CATEGORIES[0];
  const currentSticker = useMemo(() => {
    for (const cat of STICKER_CATEGORIES) {
      const found = cat.stickers.find((s) => s.id === selectedStickerId);
      if (found) return found;
    }
    return STICKER_CATEGORIES[0].stickers[0];
  }, [selectedStickerId]);

  const handleSelectStudent = useCallback((id) => {
    setSelectedStudentId(id);
    setActivePetIdx(0);
  }, []);

  // 下载当前预览的单张贴纸（Canvas 渲染，只是贴纸本身）
  const handleDownload = useCallback(async () => {
    if (!currentPet || !currentData) return;
    setDownloading(true);
    try {
      const canvas = await renderFridgeMagnetToCanvas(
        currentPet, currentData.student, currentClass?.name, currentSticker,
      );
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentData.student.name}_${currentPet.name || '冰箱贴'}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }, [currentPet, currentData, currentClass?.name, currentSticker]);

  // 批量打包该学生所有毕业宠物
  const handleBatchDownload = useCallback(async () => {
    if (!currentData || currentGraduated.length === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (let i = 0; i < currentGraduated.length; i++) {
        const pet = currentGraduated[i];
        const canvas = await renderFridgeMagnetToCanvas(
          pet, currentData.student, currentClass?.name, currentSticker,
        );
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        zip.file(`${currentData.student.name}_${pet.name || i}_冰箱贴.png`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentData.student.name}_冰箱贴合集.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [currentData, currentGraduated, currentClass?.name, currentSticker]);

  return (
    <div className="sw2-root">

      {/* ── 左侧工具栏 ─────────────────────────────────────────────────── */}
      <aside className="sw2-rail">
        <div className="sw2-rail-section-label">01 · 选择工具</div>

        <div className="sw2-tool-list">
          {TOOLS.map((t) => {
            const on = t.id === 'sticker';
            return (
              <button
                key={t.id}
                type="button"
                className={`sw2-tool-btn ${on ? 'active' : ''}`}
                onClick={() => onSwitchSection && onSwitchSection(t.id)}
              >
                <span className="sw2-tool-icon">{t.icon}</span>
                <div className="sw2-tool-body">
                  <div className="sw2-tool-label">{t.label}</div>
                  <div className="sw2-tool-desc">{t.desc}</div>
                </div>
                {on && <span className="sw2-tool-badge">NOW</span>}
              </button>
            );
          })}
        </div>

        {/* 贴纸分类（放左栏底部） */}
        <div style={{ marginTop: 'auto' }}>
          <div className="sw2-rail-section-label" style={{ marginBottom: 8 }}>03 · 贴纸分类</div>
          <div className="sw2-cat-grid">
            {STICKER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`sw2-cat-btn ${activeCategoryId === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryId(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── 主内容区 ────────────────────────────────────────────────────── */}
      <div className="sw2-main">

        {/* 学生横向选择条 */}
        <div className="sw2-student-bar">
          <div className="sw2-rail-section-label" style={{ flexShrink: 0 }}>02 · 选择毕业学生</div>
          <div className="sw2-student-scroll">
            {studentsWithGraduated.length === 0 ? (
              <span className="sw2-empty-tip">暂无学生的宠物毕业，继续加油！</span>
            ) : (
              studentsWithGraduated.map((item) => {
                const on = item.student.id === effectiveStudentId;
                return (
                  <button
                    key={item.student.id}
                    type="button"
                    className={`sw2-stu-pill ${on ? 'active' : ''}`}
                    onClick={() => handleSelectStudent(item.student.id)}
                  >
                    <span className="sw2-stu-avatar">{(item.student.name || '?')[0]}</span>
                    <span className="sw2-stu-name">{item.student.name}</span>
                    <span className="sw2-stu-count">{item.graduated.length}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 舞台：大预览 + 右侧面板 */}
        <div className="sw2-stage">

          {/* 大预览区 */}
          <div className="sw2-preview-area">
            {!currentPet ? (
              <div className="sw2-preview-empty">← 请先在顶部选择一位同学</div>
            ) : (
              <BigMagnetPreview
                pet={currentPet}
                student={currentData.student}
                className={currentClass?.name}
                sticker={currentSticker}
              />
            )}
          </div>

          {/* 右侧面板：宠物信息 + 贴纸选择 + 下载 */}
          <div className="sw2-side-panel">

            {/* 预览计数 */}
            {currentData && (
              <div className="sw2-preview-meta">
                <span>预览 · PREVIEW</span>
                <span>{safePetIdx + 1}/{currentGraduated.length}</span>
              </div>
            )}

            {/* 宠物信息卡 */}
            {currentPet && currentData && (
              <div className="sw2-pet-card">
                <div className="sw2-pet-meta">{currentData.student.name} · {currentClass?.name || ''}</div>
                <div className="sw2-pet-name">{currentPet.name || currentPet.pet_name || '未命名'}</div>
                <div className="sw2-pet-badges">
                  <span className="sw2-badge sw2-badge--lv">Lv.{currentPet.level || currentPet.pet_level || 1}</span>
                  <span className="sw2-badge sw2-badge--grad">已毕业</span>
                </div>
                <div className="sw2-pet-stats">
                  <div>
                    <div className="sw2-stat-label">累计 exp</div>
                    <div className="sw2-stat-val">⭐ {getPetDisplayExp(currentPet, currentData.student)}</div>
                  </div>
                  <div>
                    <div className="sw2-stat-label">毕业日期</div>
                    <div className="sw2-stat-val sw2-stat-mono">
                      {formatDate(currentPet.graduatedAt || currentPet.graduated_at || currentPet.completed_at)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 贴纸样式选择（3列网格，当前类别前 6 个） */}
            <div className="sw2-sticker-section">
              <div className="sw2-sticker-section-label">
                贴纸样式 · {activeCategory.label}
              </div>
              <div className="sw2-sticker-grid3">
                {activeCategory.stickers.slice(0, 6).map((s) => {
                  const on = s.id === selectedStickerId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`sw2-sticker-chip ${on ? 'active' : ''}`}
                      style={{ background: s.bg, borderColor: on ? '#243330' : s.ring }}
                      onClick={() => setSelectedStickerId(s.id)}
                    >
                      <div className="sw2-chip-swatch" style={{ borderColor: s.ring }}>🐾</div>
                      <div className="sw2-chip-name" style={{ fontWeight: on ? 700 : 400 }}>{s.name}</div>
                      {on && <div className="sw2-chip-check">✓</div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 下载按钮组 */}
            <div className="sw2-dl-group">
              <button
                type="button"
                className="sw2-dl-primary"
                onClick={handleDownload}
                disabled={!currentPet || downloading}
              >
                {downloading ? '处理中…' : '⬇ 下载冰箱贴 (PNG)'}
              </button>
              <div className="sw2-dl-row">
                <button
                  type="button"
                  className="sw2-dl-ghost"
                  onClick={handleBatchDownload}
                  disabled={!currentData || downloading}
                >
                  {downloading ? '打包中…' : '📦 全选打包'}
                </button>
              </div>
            </div>

          </div>{/* end sw2-side-panel */}
        </div>{/* end sw2-stage */}

        {/* 宠物缩略图条 */}
        {currentData && currentGraduated.length > 0 && (
          <div className="sw2-thumb-strip">
            <div className="sw2-thumb-strip-label">
              {currentData.student.name} 的毕业宠物
            </div>
            <div className="sw2-thumb-scroll">
              {currentGraduated.map((pet, idx) => {
                const on = idx === safePetIdx;
                const petType = pet.type || pet.pet_type_id;
                const petLevel = pet.level || pet.pet_level || 1;
                const petName = pet.name || pet.pet_name || '未命名';
                const imgSrc = petType ? getPetImagePath(petType, petLevel) : null;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`sw2-thumb-card ${on ? 'active' : ''}`}
                    style={on ? {} : { background: pet.bg || undefined }}
                    onClick={() => setActivePetIdx(idx)}
                  >
                    <div className="sw2-thumb-img" style={{
                      background: on ? 'rgba(255,255,255,0.08)' : '#fff',
                    }}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={petName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span>{pet.emoji || '🐾'}</span>
                      )}
                    </div>
                    <div className="sw2-thumb-name">{petName}</div>
                    <div className="sw2-thumb-info">
                      Lv.{petLevel} · {getPetDisplayExp(pet, currentData.student)}xp
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>{/* end sw2-main */}
    </div>
  );
};

export default StickerWorkshop;
