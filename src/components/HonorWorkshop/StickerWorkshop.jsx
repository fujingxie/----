import React, { useCallback, useMemo, useRef, useState } from 'react';
import { getPetImagePath } from '../../api/petLibrary';

// ─── 贴纸分类常量（4 类 20+ 贴纸）─────────────────────────────────────────────

const STICKER_CATEGORIES = [
  {
    id: 'classic',
    label: '经典',
    stickers: [
      { id: 'c1', name: '奶油边框', ring: '#F3E6C7', bg: '#FBF3DE' },
      { id: 'c2', name: '薄荷方卡', ring: '#CFE7DA', bg: '#E6F3EC' },
      { id: 'c3', name: '羊皮卷',   ring: '#E8DAB8', bg: '#F6EDD4' },
      { id: 'c4', name: '极简白',   ring: '#EDEDED', bg: '#FFFFFF' },
      { id: 'c5', name: '炭灰印',   ring: '#2D3936', bg: '#F5F2E8' },
    ],
  },
  {
    id: 'cute',
    label: '萌趣',
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
    id: 'badge',
    label: '奖章',
    stickers: [
      { id: 'b1', name: '金质勋章', ring: '#D8B35A', bg: '#FBEFC8' },
      { id: 'b2', name: '毕业印章', ring: '#B86A4E', bg: '#FBE4D7' },
      { id: 'b3', name: '徽章蓝',   ring: '#6B8FBE', bg: '#E1EBF7' },
      { id: 'b4', name: '荣誉紫',   ring: '#9786C3', bg: '#EBE4F4' },
      { id: 'b5', name: '绿丝带',   ring: '#6BAE9F', bg: '#E2F0EA' },
    ],
  },
  {
    id: 'season',
    label: '季节',
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

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 安全解析 pet_collection 字段（DB 来的 JSON 字符串）*/
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

/** 判断宠物是否已毕业（兼容 graduated:true 和 status:'graduated' 两种格式）*/
function isPetGraduated(pet) {
  return pet.graduated === true || pet.status === 'graduated';
}

/** 格式化日期 */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 加载图片，失败时返回 null */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** 圆角矩形路径 */
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

/** 渲染单张冰箱贴到 Canvas，返回 canvas 元素 */
async function renderFridgeMagnetToCanvas(pet, student, className, sticker) {
  const W = 300;
  const H = 380;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 背景（圆角矩形）
  ctx.fillStyle = sticker.bg;
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // 边框（ring 色）
  ctx.strokeStyle = sticker.ring;
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 20);
  ctx.stroke();

  // 顶部孔洞
  const holeY = 16;
  ctx.fillStyle = sticker.ring + '66'; // 半透明
  ctx.beginPath();
  ctx.arc(W / 2, holeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = sticker.ring;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W / 2, holeY, 8, 0, Math.PI * 2);
  ctx.stroke();

  // 宠物图片区（120px 高，从 y=36 开始）
  const imgY = 36;
  const imgSize = 120;
  const imgX = (W - imgSize) / 2;

  const petType = pet.type || pet.pet_type_id;
  const petLevel = pet.level || pet.pet_level || 1;
  let img = null;
  if (petType) {
    img = await loadImage(getPetImagePath(petType, petLevel));
  }

  if (img) {
    ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
  } else {
    // fallback emoji
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.fillText(pet.emoji || '🐾', W / 2, imgY + 80);
  }

  // Lv 徽章（右下角图片区）
  const lvX = imgX + imgSize - 2;
  const lvY = imgY + imgSize - 2;
  ctx.fillStyle = sticker.ring;
  ctx.beginPath();
  ctx.arc(lvX, lvY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Lv${petLevel}`, lvX, lvY + 4);

  // 宠物名 · 学生姓名
  const petName = pet.name || pet.pet_name || '未命名';
  ctx.fillStyle = '#243330';
  ctx.font = 'bold 16px "Noto Sans SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(petName, W / 2, imgY + imgSize + 28);

  ctx.fillStyle = '#5A6864';
  ctx.font = '13px "Noto Sans SC", sans-serif';
  ctx.fillText(student.name, W / 2, imgY + imgSize + 48);

  ctx.fillStyle = '#97A09B';
  ctx.font = '12px sans-serif';
  ctx.fillText(className || '', W / 2, imgY + imgSize + 66);

  // EXP + 毕业日期
  const exp = pet.exp ?? pet.lifetime_exp ?? 0;
  const graduatedAt = pet.graduatedAt || pet.graduated_at || pet.completed_at;
  ctx.fillStyle = '#5A6864';
  ctx.font = '12px sans-serif';
  ctx.fillText(`⭐ ${exp} EXP`, W / 2, imgY + imgSize + 90);
  ctx.fillStyle = '#97A09B';
  ctx.font = '11px sans-serif';
  ctx.fillText(`毕业：${formatDate(graduatedAt)}`, W / 2, imgY + imgSize + 110);

  return canvas;
}

// ─── FridgeMagnet 卡片预览组件（纯 DOM，非 Canvas）─────────────────────────

const FridgeMagnetCard = ({ pet, student, className, sticker, selected, onToggle }) => {
  const [imgError, setImgError] = useState(false);
  const petType = pet.type || pet.pet_type_id;
  const petLevel = pet.level || pet.pet_level || 1;
  const imgSrc = petType ? getPetImagePath(petType, petLevel) : null;
  const petName = pet.name || pet.pet_name || '未命名';
  const exp = pet.exp ?? 0;
  const graduatedAt = pet.graduatedAt || pet.graduated_at || pet.completed_at;

  return (
    <div
      className={`sw-magnet-card ${selected ? 'sw-magnet-card--selected' : ''}`}
      style={{ background: sticker.bg, borderColor: sticker.ring }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      {/* 孔洞 */}
      <div className="sw-magnet-hole" style={{ borderColor: sticker.ring }} />

      {/* 图片区 */}
      <div className="sw-magnet-img-wrap">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={petName}
            className="sw-magnet-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="sw-magnet-emoji">{pet.emoji || '🐾'}</span>
        )}
        <span className="sw-magnet-lv" style={{ background: sticker.ring }}>
          Lv{petLevel}
        </span>
      </div>

      {/* 文字信息 */}
      <div className="sw-magnet-info">
        <div className="sw-magnet-petname">{petName}</div>
        <div className="sw-magnet-stuname">{student.name}</div>
        <div className="sw-magnet-class">{className || ''}</div>
        <div className="sw-magnet-exp">⭐ {exp} EXP</div>
        <div className="sw-magnet-date">毕业：{formatDate(graduatedAt)}</div>
      </div>

      {/* checkbox */}
      <input
        type="checkbox"
        className="sw-magnet-checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

// ─── StickerWorkshop 主组件 ───────────────────────────────────────────────────

const StickerWorkshop = ({ students, currentClass }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'multi' | 'recent'
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState('classic');
  const [selectedStickerId, setSelectedStickerId] = useState('c1');
  const [selectedCards, setSelectedCards] = useState(new Set()); // Set of pet ids
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

  // 过滤学生列表
  const filteredStudents = useMemo(() => {
    let list = studentsWithGraduated;

    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      list = list.filter((item) => item.student.name.includes(q));
    }

    if (filterTab === 'multi') {
      list = list.filter((item) => item.graduated.length >= 2);
    } else if (filterTab === 'recent') {
      // 按最近毕业日期排序
      list = [...list].sort((a, b) => {
        const getLatest = (item) => {
          const dates = item.graduated
            .map((p) => p.graduatedAt || p.graduated_at || p.completed_at)
            .filter(Boolean)
            .map((d) => new Date(d).getTime());
          return dates.length > 0 ? Math.max(...dates) : 0;
        };
        return getLatest(b) - getLatest(a);
      });
    }

    return list;
  }, [studentsWithGraduated, searchQuery, filterTab]);

  // 当前选中学生的数据
  const currentData = useMemo(() => {
    if (!selectedStudentId) return null;
    return filteredStudents.find((item) => item.student.id === selectedStudentId) || null;
  }, [filteredStudents, selectedStudentId]);

  const currentGraduated = currentData?.graduated || [];

  // 当前激活的贴纸类别
  const activeCategory = useMemo(
    () => STICKER_CATEGORIES.find((c) => c.id === activeCategoryId) || STICKER_CATEGORIES[0],
    [activeCategoryId],
  );

  // 当前选中的贴纸样式
  const currentSticker = useMemo(() => {
    for (const cat of STICKER_CATEGORIES) {
      const found = cat.stickers.find((s) => s.id === selectedStickerId);
      if (found) return found;
    }
    return STICKER_CATEGORIES[0].stickers[0];
  }, [selectedStickerId]);

  // 切换学生时重置卡片选中
  const handleSelectStudent = useCallback((id) => {
    setSelectedStudentId(id);
    setSelectedCards(new Set());
  }, []);

  // 切换单张卡片选中
  const handleToggleCard = useCallback((petId) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) {
        next.delete(petId);
      } else {
        next.add(petId);
      }
      return next;
    });
  }, []);

  // 全选 / 取消全选
  const allSelected = currentGraduated.length > 0 && selectedCards.size === currentGraduated.length;
  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedCards(new Set());
    } else {
      // pet id 可能是数字或字符串，统一用 index 作为 key
      setSelectedCards(new Set(currentGraduated.map((_, i) => i)));
    }
  }, [allSelected, currentGraduated]);

  // 下载单张
  const handleDownloadSingle = useCallback(async (pet, idx) => {
    if (!currentData) return;
    const canvas = await renderFridgeMagnetToCanvas(
      pet,
      currentData.student,
      currentClass?.name,
      currentSticker,
    );
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentData.student.name}_${pet.name || pet.pet_name || idx}_冰箱贴.png`;
    a.click();
  }, [currentData, currentClass?.name, currentSticker]);

  // 批量下载
  const handleBatchDownload = useCallback(async () => {
    if (!currentData || selectedCards.size === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const idx of selectedCards) {
        const pet = currentGraduated[idx];
        if (!pet) continue;
        const canvas = await renderFridgeMagnetToCanvas(
          pet,
          currentData.student,
          currentClass?.name,
          currentSticker,
        );
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        zip.file(`${currentData.student.name}_${pet.name || pet.pet_name || idx}_冰箱贴.png`, blob);
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
  }, [currentData, selectedCards, currentGraduated, currentClass?.name, currentSticker]);

  return (
    <div className="sw-root">
      {/* 左列：工具栏说明 */}
      <aside className="sw-sidebar">
        <div className="sw-sidebar-title">冰箱贴制作</div>
        <div className="sw-sidebar-desc">
          为毕业宠物制作专属纪念冰箱贴，导出高清图片留作纪念。
        </div>
        <div className="sw-sidebar-tip">
          📖 小提示：只有养过宠物且宠物已毕业的学生才会出现在此列表中。
        </div>
      </aside>

      {/* 中列：学生列表 */}
      <section className="sw-student-col">
        <div className="sw-student-header">
          <input
            type="text"
            className="sw-search"
            placeholder="搜索学生…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="sw-filter-tabs">
            {[
              { id: 'all', label: '全部' },
              { id: 'multi', label: '≥ 2 只' },
              { id: 'recent', label: '按最近' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`sw-filter-tab ${filterTab === tab.id ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="sw-student-empty">还没有学生的宠物毕业，加油吧！</div>
        ) : (
          <div className="sw-student-list">
            {filteredStudents.map((item) => (
              <div
                key={item.student.id}
                className={`sw-student-item ${selectedStudentId === item.student.id ? 'active' : ''}`}
                onClick={() => handleSelectStudent(item.student.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectStudent(item.student.id)}
              >
                <span className="sw-student-avatar">
                  {(item.student.name || '?')[0]}
                </span>
                <span className="sw-student-name">{item.student.name}</span>
                <span className="sw-student-badge">{item.graduated.length}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 右列：贴纸选择 + 预览 */}
      <section className="sw-right-col">
        {/* 贴纸选择器 */}
        <div className="sw-sticker-selector">
          <div className="sw-category-tabs">
            {STICKER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`sw-category-tab ${activeCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="sw-sticker-grid">
            {activeCategory.stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                className={`sw-sticker-chip ${selectedStickerId === sticker.id ? 'active' : ''}`}
                style={{
                  background: sticker.bg,
                  borderColor: selectedStickerId === sticker.id ? sticker.ring : sticker.ring + '88',
                  outline: selectedStickerId === sticker.id ? `3px solid ${sticker.ring}` : 'none',
                }}
                onClick={() => setSelectedStickerId(sticker.id)}
                title={sticker.name}
              >
                <span className="sw-sticker-chip-name">{sticker.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 冰箱贴预览网格 */}
        {!currentData ? (
          <div className="sw-preview-empty">← 选择左侧学生以查看毕业宠物冰箱贴</div>
        ) : (
          <>
            <div className="sw-magnet-grid">
              {currentGraduated.map((pet, idx) => (
                <div key={idx} className="sw-magnet-wrap">
                  <FridgeMagnetCard
                    pet={pet}
                    student={currentData.student}
                    className={currentClass?.name}
                    sticker={currentSticker}
                    selected={selectedCards.has(idx)}
                    onToggle={() => handleToggleCard(idx)}
                  />
                  <button
                    type="button"
                    className="sw-magnet-dl-btn"
                    onClick={() => handleDownloadSingle(pet, idx)}
                    title="下载这张冰箱贴"
                  >
                    ⬇ 下载
                  </button>
                </div>
              ))}
            </div>

            {/* 底部操作栏 */}
            <div className="sw-action-bar">
              <span className="sw-action-count">已选 {selectedCards.size} 张</span>
              <button type="button" className="sw-action-btn" onClick={handleToggleAll}>
                {allSelected ? '取消全选' : '全选'}
              </button>
              <button
                type="button"
                className="sw-action-btn sw-action-btn--primary"
                onClick={handleBatchDownload}
                disabled={selectedCards.size === 0 || downloading}
              >
                {downloading ? '打包中…' : `⬇ 批量下载 (${selectedCards.size})`}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StickerWorkshop;
