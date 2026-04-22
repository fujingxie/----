import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parsePetCollection } from '../../lib/petCollection';
import { getPetImagePath } from '../../api/petLibrary';

// ─── 贴纸模版定义（3 套内置）──────────────────────────────────────────────────

const STICKER_TEMPLATES = [
  {
    id: 0,
    label: '贴纸1',
    // 白底圆角卡片，紫色边框
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
    // 渐变暖橙背景
    bg: 'linear',
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

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

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

/** 加载图片到 Canvas，失败时用空白占位 */
function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // 加载失败用空白占位
      const offscreen = document.createElement('canvas');
      offscreen.width = 1;
      offscreen.height = 1;
      resolve(offscreen);
    };
    img.src = src;
  });
}

/** 渲染单张贴纸到 canvas，返回 canvas 元素 */
async function renderStickerToCanvas(entry, student, className, template) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  // 1. 背景
  if (template.bg === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, 0, 360);
    template.gradientColors.forEach((c, i) =>
      grad.addColorStop(i / (template.gradientColors.length - 1), c),
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
  roundRect(
    ctx,
    template.borderWidth / 2,
    template.borderWidth / 2,
    300 - template.borderWidth,
    360 - template.borderWidth,
    template.borderRadius,
  );
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
}

// ─── 单张贴纸预览组件 ─────────────────────────────────────────────────────────

const StickerCanvas = ({ entry, student, className, template, selected, onToggle, onDownloadOriginal, onDownloadSticker }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = await renderStickerToCanvas(entry, student, className, template);
      if (cancelled) return;
      const el = canvasRef.current;
      if (!el) return;
      const ctx = el.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
    })();
    return () => { cancelled = true; };
  }, [entry, student, className, template]);

  return (
    <div
      className={`sticker-item ${selected ? 'sticker-item-selected' : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={360}
        title={`${entry.pet_name} — 点击选中`}
      />
      <div className="sticker-item-label">{entry.pet_name || entry.pet_type_id}</div>
      <div className="sticker-item-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sticker-template-btn"
          style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={onDownloadOriginal}
        >
          原图
        </button>
        <button
          type="button"
          className="sticker-template-btn"
          style={{ fontSize: 12, padding: '4px 10px' }}
          onClick={onDownloadSticker}
        >
          贴纸
        </button>
      </div>
    </div>
  );
};

// ─── 冰箱贴工坊主体 ───────────────────────────────────────────────────────────

const StickerWorkshop = ({ students, currentClass }) => {
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedStickers, setSelectedStickers] = useState(new Set());
  const [downloading, setDownloading] = useState(false);

  // 只取有毕业宠物的学生
  const studentsWithGraduated = useMemo(
    () =>
      (students || [])
        .map((s) => {
          const graduated = parsePetCollection(s.pet_collection, s).filter(
            (e) => e.status === 'graduated' && e.pet_type_id,
          );
          return graduated.length > 0 ? { student: s, graduated } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.graduated.length - a.graduated.length),
    [students],
  );

  const currentData = studentsWithGraduated[selectedStudentIdx] || null;
  const currentGraduated = useMemo(
    () => currentData?.graduated || [],
    [currentData],
  );

  // 切换学生时重置选中状态
  const handleSelectStudent = useCallback((idx) => {
    setSelectedStudentIdx(idx);
    setSelectedStickers(new Set());
  }, []);

  // 切换单张选中
  const handleToggleSticker = useCallback((id) => {
    setSelectedStickers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全选 / 取消全选
  const handleToggleAll = useCallback(() => {
    if (selectedStickers.size === currentGraduated.length) {
      setSelectedStickers(new Set());
    } else {
      setSelectedStickers(new Set(currentGraduated.map((e) => e.id)));
    }
  }, [selectedStickers.size, currentGraduated]);

  // 下载宠物原图（直接下载 Lv7 PNG）
  const handleDownloadOriginal = useCallback(async (entry) => {
    const src = getPetImagePath(entry.pet_type_id, 7);
    const a = document.createElement('a');
    a.href = src;
    a.download = `${entry.pet_name || entry.pet_type_id}_lv7.png`;
    a.click();
  }, []);

  // 下载单张贴纸
  const handleDownloadSticker = useCallback(async (entry, student) => {
    const canvas = await renderStickerToCanvas(
      entry,
      student,
      currentClass?.name,
      STICKER_TEMPLATES[selectedTemplate],
    );
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${student.name}_${entry.pet_name}_冰箱贴.png`;
    a.click();
  }, [currentClass?.name, selectedTemplate]);

  // 批量下载 zip
  const handleBatchDownload = useCallback(async () => {
    if (!currentData || selectedStickers.size === 0) return;
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const targets = currentData.graduated.filter((e) => selectedStickers.has(e.id));
      for (const entry of targets) {
        const canvas = await renderStickerToCanvas(
          entry,
          currentData.student,
          currentClass?.name,
          STICKER_TEMPLATES[selectedTemplate],
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
    } finally {
      setDownloading(false);
    }
  }, [currentData, selectedStickers, currentClass?.name, selectedTemplate]);

  const template = STICKER_TEMPLATES[selectedTemplate];
  const allSelected = currentGraduated.length > 0 && selectedStickers.size === currentGraduated.length;

  return (
    <div className="sticker-workshop">
      {/* 顶部工具栏 */}
      <div className="sticker-toolbar">
        {STICKER_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`sticker-template-btn ${selectedTemplate === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTemplate(t.id)}
          >
            {t.label}
          </button>
        ))}
        <span className="sticker-toolbar-spacer" />
        <div className="sticker-toolbar-actions">
          {currentGraduated.length > 0 && (
            <button
              type="button"
              className="sticker-template-btn"
              onClick={handleToggleAll}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
          )}
          {selectedStickers.size > 0 && (
            <button
              type="button"
              className="sticker-template-btn active"
              onClick={handleBatchDownload}
              disabled={downloading}
            >
              {downloading ? '打包中...' : `下载选中 (${selectedStickers.size})`}
            </button>
          )}
        </div>
      </div>

      {/* 主体 */}
      <div className="sticker-body">
        {/* 左侧学生列表 */}
        <div className="sticker-student-list">
          <div className="sticker-student-list-title">有毕业宠物的学生</div>
          {studentsWithGraduated.length === 0 ? (
            <div className="sticker-student-empty">
              还没有学生的宠物毕业，加油吧！
            </div>
          ) : (
            studentsWithGraduated.map((item, idx) => (
              <div
                key={item.student.id}
                className={`sticker-student-item ${idx === selectedStudentIdx ? 'active' : ''}`}
                onClick={() => handleSelectStudent(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectStudent(idx)}
              >
                <span className="sticker-student-name">{item.student.name}</span>
                <span className="sticker-student-count">{item.graduated.length}</span>
              </div>
            ))
          )}
        </div>

        {/* 右侧贴纸预览 */}
        <div className="sticker-preview-area">
          {!currentData ? (
            <div className="sticker-preview-empty">请先选择学生</div>
          ) : (
            <div className="sticker-grid">
              {currentData.graduated.map((entry) => (
                <StickerCanvas
                  key={entry.id}
                  entry={entry}
                  student={currentData.student}
                  className={currentClass?.name}
                  template={template}
                  selected={selectedStickers.has(entry.id)}
                  onToggle={() => handleToggleSticker(entry.id)}
                  onDownloadOriginal={() => handleDownloadOriginal(entry)}
                  onDownloadSticker={() => handleDownloadSticker(entry, currentData.student)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickerWorkshop;
