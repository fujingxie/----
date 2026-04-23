import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProgressRanking } from '../../api/client';
import { getPetImagePath } from '../../api/petLibrary';

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

function loadImageToCanvas(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 1;
      offscreen.height = 1;
      resolve(offscreen);
    };
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text || '').split('');
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

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

async function renderCertToCanvas(student, rank, opts) {
  const { awarderName, certDate, speechText, template, className } = opts;
  const W = 800;
  const H = 1130;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (template.bg === 'linear') {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    template.gradientColors.forEach((color, index) => {
      grad.addColorStop(index / (template.gradientColors.length - 1), color);
    });
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = template.bg;
  }
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(20, 20, W - 40, H - 40);
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, W - 64, H - 64);

  ctx.fillStyle = template.titleColor;
  ctx.font = 'bold 52px serif';
  ctx.textAlign = 'center';
  ctx.fillText('荣誉证书', W / 2, 120);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = template.subColor;
  ctx.fillText(`${className || ''} · 光荣榜`, W / 2, 160);

  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(80, 180);
  ctx.lineTo(W - 80, 180);
  ctx.stroke();

  const imgSrc = getPetImagePath(student?.pet_type_id, student?.pet_level || 1);
  const img = await loadImageToCanvas(imgSrc);
  const imgSize = 200;
  const imgX = (W - imgSize) / 2;
  const imgY = 210;

  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
  ctx.restore();

  ctx.strokeStyle = template.borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W / 2, imgY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = template.accentColor;
  ctx.beginPath();
  ctx.arc(W / 2 + imgSize / 2 - 10, imgY + 20, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`#${rank}`, W / 2 + imgSize / 2 - 10, imgY + 26);

  ctx.fillStyle = template.nameColor;
  ctx.font = 'bold 44px serif';
  ctx.textAlign = 'center';
  ctx.fillText(student?.name || '同学', W / 2, 470);

  ctx.fillStyle = template.textColor;
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  wrapText(ctx, speechText, W / 2, 530, W - 160, 34);

  const bottomY = H - 100;
  ctx.fillStyle = template.subColor;
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`日期：${certDate}`, 100, bottomY);
  ctx.textAlign = 'right';
  ctx.fillText(`颁奖人：${awarderName}`, W - 100, bottomY);

  ctx.strokeStyle = template.subColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W - 300, bottomY + 8);
  ctx.lineTo(W - 100, bottomY + 8);
  ctx.stroke();

  return canvas;
}

const CertCanvas = ({ student, rank, opts }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const offscreen = await renderCertToCanvas(student, rank, opts);
      if (cancelled || !canvasRef.current) {
        return;
      }
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 800, 1130);
      ctx.drawImage(offscreen, 0, 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [student, rank, opts]);

  return <canvas ref={canvasRef} width={800} height={1130} className="cert-canvas" />;
};

const CertWorkshop = ({ students, currentClass, user }) => {
  const [rankType, setRankType] = useState('pet');
  const [topN, setTopN] = useState(10);
  const [progressRange, setProgressRange] = useState('7d');
  const [progressData, setProgressData] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [ranked, setRanked] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [awarderName, setAwarderName] = useState(user?.username || '');
  const [certDate, setCertDate] = useState(() => new Date().toLocaleDateString('zh-CN'));
  const [speechIdx, setSpeechIdx] = useState(0);
  const [speechText, setSpeechText] = useState(SPEECH_TEMPLATES[0]);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (rankType === 'pet') {
      const sorted = [...(students || [])]
        .filter((student) => student.lifetime_exp > 0)
        .sort((a, b) => (b.lifetime_exp || 0) - (a.lifetime_exp || 0))
        .slice(0, topN);
      setRanked(sorted);
      setCurrentIdx(0);
    }
  }, [rankType, topN, students]);

  useEffect(() => {
    if (rankType !== 'progress') {
      return undefined;
    }

    if (!currentClass?.id) {
      setProgressData([]);
      setRanked([]);
      setCurrentIdx(0);
      return undefined;
    }

    let cancelled = false;
    setProgressLoading(true);
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    let start;

    if (progressRange === 'today') {
      start = end;
    } else if (progressRange === '7d') {
      const date = new Date(today);
      date.setDate(date.getDate() - 7);
      start = date.toISOString().slice(0, 10);
    } else {
      const date = new Date(today);
      date.setDate(date.getDate() - 30);
      start = date.toISOString().slice(0, 10);
    }

    fetchProgressRanking({ classId: currentClass.id, start, end, limit: topN })
      .then((res) => {
        if (cancelled) {
          return;
        }

        const ranking = res?.ranking || [];
        setProgressData(ranking);
        const merged = ranking
          .map((item) => (students || []).find((student) => student.id === item.student_id))
          .filter(Boolean)
          .slice(0, topN);
        setRanked(merged);
        setCurrentIdx(0);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setProgressData([]);
        setRanked([]);
        setCurrentIdx(0);
      })
      .finally(() => {
        if (!cancelled) {
          setProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rankType, progressRange, topN, currentClass?.id, students]);

  const handleSelectSpeech = useCallback((idx) => {
    setSpeechIdx(idx);
    setSpeechText(SPEECH_TEMPLATES[idx]);
  }, []);

  const handleDownloadCurrent = useCallback(async () => {
    const student = ranked[currentIdx];
    if (!student) {
      return;
    }

    const canvas = await renderCertToCanvas(student, currentIdx + 1, {
      awarderName,
      certDate,
      speechText,
      template: CERT_TEMPLATES[templateIdx],
      className: currentClass?.name,
    });
    const url = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${student.name}_光荣榜证书.png`;
    anchor.click();
  }, [ranked, currentIdx, awarderName, certDate, speechText, templateIdx, currentClass?.name]);

  const handleBatchDownload = useCallback(async () => {
    if (ranked.length === 0) {
      return;
    }

    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let index = 0; index < ranked.length; index += 1) {
        const canvas = await renderCertToCanvas(ranked[index], index + 1, {
          awarderName,
          certDate,
          speechText,
          template: CERT_TEMPLATES[templateIdx],
          className: currentClass?.name,
        });
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        zip.file(
          `${String(index + 1).padStart(2, '0')}_${ranked[index].name}_光荣榜证书.png`,
          blob,
        );
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${currentClass?.name || '班级'}_光荣榜证书合集.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [ranked, awarderName, certDate, speechText, templateIdx, currentClass?.name]);

  const handlePrint = useCallback(async () => {
    const student = ranked[currentIdx];
    if (!student) {
      return;
    }

    const canvas = await renderCertToCanvas(student, currentIdx + 1, {
      awarderName,
      certDate,
      speechText,
      template: CERT_TEMPLATES[templateIdx],
      className: currentClass?.name,
    });
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) {
      return;
    }
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

  return (
    <div className="cert-workshop">
      <div className="cert-filter-bar glass-card">
        <label className="cert-filter-item">
          <span>榜单类型</span>
          <select className="glass-input" value={rankType} onChange={(e) => setRankType(e.target.value)}>
            <option value="pet">战力榜（累计经验）</option>
            <option value="progress">进步榜</option>
          </select>
        </label>

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

        <label className="cert-filter-item">
          <span>取前</span>
          <input
            className="glass-input"
            type="number"
            min={1}
            max={50}
            value={topN}
            onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            style={{ width: 70 }}
          />
          <span>名</span>
        </label>

        {progressLoading && <span className="cert-filter-loading">加载进步榜…</span>}
        <span className="cert-filter-result">
          共 {ranked.length} 人{rankType === 'progress' && progressData.length > 0 ? ' · 按进步值排序' : ''}
        </span>
      </div>

      <div className="cert-body">
        <div className="cert-controls glass-card">
          <div className="cert-control-section">
            <div className="cert-control-label">证书样式</div>
            <div className="cert-template-btns">
              {CERT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`cert-template-btn ${templateIdx === template.id ? 'active' : ''}`}
                  onClick={() => setTemplateIdx(template.id)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div className="cert-control-section">
            <div className="cert-control-label">颁奖人</div>
            <input
              className="glass-input"
              type="text"
              value={awarderName}
              onChange={(e) => setAwarderName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="cert-control-section">
            <div className="cert-control-label">颁奖日期</div>
            <input
              className="glass-input"
              type="text"
              value={certDate}
              onChange={(e) => setCertDate(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="cert-control-section">
            <div className="cert-control-label">话术模版</div>
            <select
              className="glass-input cert-speech-select"
              value={speechIdx}
              onChange={(e) => handleSelectSpeech(Number(e.target.value))}
            >
              {SPEECH_TEMPLATES.map((template, index) => (
                <option key={template} value={index}>
                  {`模版 ${index + 1}：${template.slice(0, 16)}…`}
                </option>
              ))}
            </select>
          </div>

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

        <div className="cert-preview-panel">
          {ranked.length === 0 ? (
            <div className="cert-preview-empty">
              {progressLoading ? '加载中…' : '暂无学生，请调整筛选条件'}
            </div>
          ) : (
            <>
              <CertCanvas
                key={`${currentIdx}-${templateIdx}-${speechText}-${awarderName}-${certDate}`}
                student={ranked[currentIdx]}
                rank={currentIdx + 1}
                opts={{
                  awarderName,
                  certDate,
                  speechText,
                  template: CERT_TEMPLATES[templateIdx],
                  className: currentClass?.name,
                }}
              />

              <div className="cert-pagination">
                <button
                  type="button"
                  className="cert-page-btn"
                  onClick={() => setCurrentIdx((index) => Math.max(0, index - 1))}
                  disabled={currentIdx === 0}
                >
                  ‹ 上一张
                </button>
                <span className="cert-page-info">
                  {currentIdx + 1} / {ranked.length}
                </span>
                <button
                  type="button"
                  className="cert-page-btn"
                  onClick={() => setCurrentIdx((index) => Math.min(ranked.length - 1, index + 1))}
                  disabled={currentIdx === ranked.length - 1}
                >
                  下一张 ›
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="cert-action-bar">
        <button
          type="button"
          className="confirm-btn secondary"
          onClick={handleDownloadCurrent}
          disabled={ranked.length === 0}
        >
          下载当前证书
        </button>
        <button
          type="button"
          className="confirm-btn"
          onClick={handleBatchDownload}
          disabled={ranked.length === 0 || downloading}
        >
          {downloading ? '打包中…' : `批量下载全部 (${ranked.length} 张)`}
        </button>
        <button
          type="button"
          className="confirm-btn secondary"
          onClick={handlePrint}
          disabled={ranked.length === 0}
        >
          打印当前证书
        </button>
      </div>
    </div>
  );
};

export default CertWorkshop;
