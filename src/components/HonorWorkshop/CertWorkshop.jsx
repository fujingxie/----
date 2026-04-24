import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPetImagePath } from '../../api/petLibrary';

// ─── 工具列表（左侧导航栏，与 StickerWorkshop 共用）────────────────────────
const TOOLS = [
  { id: 'sticker',       label: '冰箱贴制作',     icon: '🧲', desc: '为毕业宠物生成专属纪念贴' },
  { id: 'honor-cert',   label: '光荣榜证书制作', icon: '📜', desc: '为上榜同学颁发荣誉证书' },
  { id: 'graduate-cert', label: '毕业证书制作',   icon: '🎓', desc: '为毕业宠物颁发毕业证' },
];

// ─── 证书模板（8 套）──────────────────────────────────────────────────────────
const CERT_TEMPLATES = [
  { id: 'classic-gold', name: '典雅金',   mood: '正式', bg: '#FBF3DE', border: '#C9A24C', accent: '#8B6914', title: '#5C4612', body: '#4A3E20', corner: 'sunburst' },
  { id: 'mint-modern',  name: '薄荷现代', mood: '清新', bg: '#EAF4EE', border: '#6BAE9F', accent: '#2F6F5E', title: '#1F4538', body: '#3C4D49', corner: 'leaves'   },
  { id: 'sakura',       name: '樱花粉',   mood: '童趣', bg: '#FCE7EE', border: '#E5A3B8', accent: '#B8567A', title: '#8B3559', body: '#5C3446', corner: 'cherry'   },
  { id: 'parchment',    name: '羊皮卷',   mood: '古典', bg: '#F6EDD4', border: '#A8895B', accent: '#8B6A3D', title: '#4A3520', body: '#3E2F1C', corner: 'stars'    },
  { id: 'sky-clean',    name: '晴空',     mood: '极简', bg: '#F0F5FB', border: '#6B8FBE', accent: '#3E65A0', title: '#1F3E70', body: '#384A66', corner: 'dots'     },
  { id: 'sunshine',     name: '阳光',     mood: '活泼', bg: '#FEF6D6', border: '#E8B34A', accent: '#C47E13', title: '#7A4A08', body: '#4D3913', corner: 'sun'      },
  { id: 'forest',       name: '森林派对', mood: '自然', bg: '#E5EFDA', border: '#7BA25A', accent: '#4D7A3A', title: '#2E4B20', body: '#364428', corner: 'mushroom' },
  { id: 'newyear',      name: '新春红',   mood: '节日', bg: '#FBE4D8', border: '#C9543A', accent: '#9B3320', title: '#6B1E0F', body: '#4A2418', corner: 'firework' },
];

const CORNER_SYMBOLS = {
  sunburst: '✦', leaves: '❋', cherry: '✿', stars: '✧',
  dots: '◆', sun: '☀', mushroom: '❀', firework: '✺',
};

// ─── 话术模板（8 套）──────────────────────────────────────────────────────────
const SPEECH_TEMPLATES = [
  { id: 'official',  name: '正式嘉奖', tone: '官方', body: '兹表彰 {name} 同学在 {period} 的 {ranking} 中表现卓越，位列 {rank_label}，特此颁发荣誉证书，以资鼓励。愿你继续保持热忱，与伙伴 {pet} 共赴更多精彩。' },
  { id: 'warm',      name: '温馨寄语', tone: '温馨', body: '{name} 小朋友，恭喜你！你和 {pet} 一路相伴，累计 {value} {metric}，在 {ranking} 拿下 {rank_label}。每一次坚持都值得被看见，老师为你骄傲。' },
  { id: 'playful',   name: '幽默鼓励', tone: '幽默', body: '叮咚！{name} 同学和 {pet} 小队拿下 {ranking} 的 {rank_label} 啦！{value} {metric} 不是白攒的——继续养你的小宠物，老师给你加大鸡腿！' },
  { id: 'poetic',    name: '诗意表达', tone: '诗意', body: '星光不负赶路人。{name} 以 {value} {metric}，在 {ranking} 写下属于自己的章节，位列 {rank_label}。与 {pet} 同行的每一步，都在向未来生长。' },
  { id: 'teacher',   name: '老师评语', tone: '教育', body: '{name} 同学在本阶段的 {ranking} 中，凭 {value} {metric} 名列 {rank_label}。认真是最朴素的天赋，希望你把这份专注带到每一次课堂，与 {pet} 共同成长。' },
  { id: 'peer',      name: '同学祝贺', tone: '亲切', body: '哇！{name} 和 {pet} 拿到了 {ranking} 的 {rank_label}！{value} {metric} 真厉害，是我们全班一起见证的高光时刻，期待你下一次更进一步～' },
  { id: 'milestone', name: '里程碑',   tone: '纪念', body: '这是属于 {name} 与 {pet} 的高光时刻：{ranking} · {rank_label} · {value} {metric}。愿这份成就成为你回望时温柔而坚定的坐标。' },
  { id: 'short',     name: '简短有力', tone: '简短', body: '{name} · {ranking} {rank_label} · {value} {metric}。以此致敬你与 {pet} 的共同努力。' },
];

// ─── 榜单类型 & 名次尺寸 ──────────────────────────────────────────────────────
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

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

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

function buildRanking(students, rankingTypeId, n) {
  const rtype = RANKING_TYPES.find((r) => r.id === rankingTypeId);
  if (!rtype) return [];
  const key = rtype.valueKey;
  return [...(students || [])]
    .filter((s) => (s[key] || 0) > 0)
    .sort((a, b) => (b[key] || 0) - (a[key] || 0))
    .slice(0, n)
    .map((s, i) => {
      const pets = parsePetCollection(s.pet_collection);

      // 从 pet_collection 找展示宠物：
      // 优先：有 pet_type_id 的 active 宠物（已孵化）
      // 次选：最近一条毕业宠物
      // 最后：集合里任意一条
      const activePetWithType = pets.find(
        (p) => p.status === 'active' && (p.pet_type_id || p.type),
      );
      const lastGraduated = [...pets]
        .reverse()
        .find((p) => p.status === 'graduated' && (p.pet_type_id || p.type));
      const collectionPet = activePetWithType || lastGraduated || pets[pets.length - 1];

      // Fallback：pet_collection 为空或未同步时，读学生顶层字段
      // pet_status !== 'egg' 才有意义，蛋没有 pet_type_id
      const topLevelHasPet = s.pet_status !== 'egg' && s.pet_type_id;

      const petTypeId = collectionPet?.pet_type_id || collectionPet?.type
        || (topLevelHasPet ? s.pet_type_id : null)
        || null;
      const petLevel  = collectionPet?.pet_level || collectionPet?.level
        || (topLevelHasPet ? s.pet_level : null)
        || 1;
      const petName   = collectionPet?.pet_name || collectionPet?.name
        || (topLevelHasPet ? s.pet_name : null)
        || '—';

      return {
        rank: i + 1,
        name: s.name,
        studentId: s.id,
        pet: petName,
        petTypeId,
        petLevel,
        value: s[key] || 0,
      };
    });
}

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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── CornerOrnament ───────────────────────────────────────────────────────────
const CornerOrnament = ({ symbol, color, position }) => {
  const posStyle = {
    'top-left':     { top: 10, left: 10 },
    'top-right':    { top: 10, right: 10 },
    'bottom-left':  { bottom: 10, left: 10 },
    'bottom-right': { bottom: 10, right: 10 },
  }[position] || {};
  return (
    <span style={{
      position: 'absolute', fontSize: 24, color, opacity: 0.7,
      lineHeight: 1, userSelect: 'none', ...posStyle,
    }}>
      {symbol}
    </span>
  );
};

// ─── CertificateCard（CSS 渲染，不用 Canvas）────────────────────────────────
const CertificateCard = React.forwardRef(
  ({ tmpl, entry, speechBody, awarder, certDate, rankingLabel, rtype }, ref) => {
    const [petImgError, setPetImgError] = useState(false);

    // 切换到不同学生/名次时重置图片错误状态（setState in effect 此处是合理用法）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setPetImgError(false); }, [entry?.petTypeId, entry?.rank]);

    if (!entry) return null;
    const symbol = CORNER_SYMBOLS[tmpl.corner] || '✦';
    // 有宠物类型用真实图；蛋学生用 egg.png；都失败时也用 egg.png
    const petImgSrc = getPetImagePath(entry.petTypeId || null, entry.petLevel);

    return (
      <div
        ref={ref}
        className="cert-card"
        style={{
          width: 720,
          aspectRatio: '1.414 / 1',
          background: tmpl.bg,
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: 'Noto Serif SC, Noto Sans SC, serif',
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(36,51,48,0.18), 0 4px 10px rgba(36,51,48,0.08)',
          borderRadius: 6,
        }}
      >
        {/* 外层双边框 */}
        <div style={{ position: 'absolute', inset: 12, border: `3px double ${tmpl.border}`, pointerEvents: 'none', borderRadius: 3 }} />
        {/* 内边框 */}
        <div style={{ position: 'absolute', inset: 20, border: `1px solid ${tmpl.border}88`, pointerEvents: 'none', borderRadius: 2 }} />

        {/* 四角花饰 */}
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="top-left" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="top-right" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="bottom-left" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="bottom-right" />

        {/* 内容区 */}
        <div style={{
          position: 'relative', height: '100%',
          display: 'flex', flexDirection: 'column',
          padding: '14px 40px 12px', gap: 0,
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.22em', color: tmpl.accent, textTransform: 'uppercase', fontFamily: 'sans-serif', marginBottom: 3 }}>
              CERTIFICATE OF HONOR
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tmpl.title, letterSpacing: '0.1em', lineHeight: 1.15 }}>
              荣誉证书
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '3px 16px', borderRadius: 20,
                border: `1.5px solid ${tmpl.border}`,
                color: tmpl.accent, fontSize: 12, fontFamily: 'sans-serif', letterSpacing: '0.06em',
              }}>
                <span style={{ width: 28, height: 1, background: tmpl.border, display: 'inline-block' }} />
                {rankingLabel}
                <span style={{ width: 28, height: 1, background: tmpl.border, display: 'inline-block' }} />
              </span>
            </div>
          </div>

          {/* 分隔线 */}
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${tmpl.border}, transparent)`, margin: '8px 16px' }} />

          {/* Body */}
          <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0, alignItems: 'flex-start' }}>
            {/* 左：学生名 + 话术 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: tmpl.accent, marginBottom: 8, fontFamily: 'sans-serif' }}>
                小主人：
                <span style={{
                  fontSize: 24, fontWeight: 800, color: tmpl.title,
                  borderBottom: `2px solid ${tmpl.border}66`, paddingBottom: 2, marginLeft: 6,
                }}>
                  {entry.name}
                </span>
              </div>
              <div style={{
                fontSize: 13, color: tmpl.body, lineHeight: 2.0,
                textIndent: '2em', letterSpacing: '0.03em',
                fontFamily: 'Noto Serif SC, serif',
              }}>
                {speechBody}
              </div>
            </div>

            {/* 右：宠物形象 */}
            <div style={{ width: 155, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              {/* 排名徽章放在图片框外层，避免被 overflow:hidden 裁掉 */}
              <div style={{ position: 'relative', paddingTop: 12 }}>
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  background: tmpl.border, color: '#FFF', whiteSpace: 'nowrap',
                  zIndex: 1,
                }}>
                  #{entry.rank} · Lv.{entry.petLevel}
                </div>
                <div style={{
                  width: 134, height: 134, borderRadius: 14,
                  border: `2.5px solid ${tmpl.border}`,
                  background: `${tmpl.border}18`,
                  boxShadow: `inset 0 0 0 5px ${tmpl.bg}, inset 0 0 0 7px ${tmpl.border}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <img
                    src={petImgError ? '/assets/pets/egg.png' : petImgSrc}
                    alt={entry.pet}
                    style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                    onError={() => setPetImgError(true)}
                  />
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tmpl.title, fontFamily: 'sans-serif', textAlign: 'center' }}>
                {entry.pet}
              </div>
              <div style={{ fontSize: 11, color: `${tmpl.body}99`, fontFamily: 'sans-serif' }}>
                {rtype?.metric}: {entry.value}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 8, paddingBottom: 2,
            borderTop: `1px solid ${tmpl.border}55`,
            fontFamily: 'sans-serif',
          }}>
            <div>
              <div style={{ fontSize: 9, color: tmpl.accent, letterSpacing: '0.15em', marginBottom: 2 }}>日期 · DATE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tmpl.title, fontFamily: 'monospace' }}>{certDate}</div>
            </div>
            {/* 印章 */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              border: `2.5px solid ${tmpl.border}`,
              background: `${tmpl.border}14`, color: tmpl.border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
              transform: 'rotate(-10deg)', textAlign: 'center', lineHeight: 1.3,
              boxShadow: `inset 0 0 0 2px ${tmpl.bg}`,
            }}>
              荣誉<br />印章
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: tmpl.accent, letterSpacing: '0.15em', marginBottom: 2 }}>颁奖人 · AWARDED BY</div>
              <div style={{
                fontSize: 14, fontWeight: 700, color: tmpl.title,
                borderBottom: `1px solid ${tmpl.border}`, paddingBottom: 1, paddingRight: 16,
              }}>
                {awarder}
              </div>
              <div style={{ fontSize: 10, color: `${tmpl.body}99`, marginTop: 2 }}>班主任</div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
CertificateCard.displayName = 'CertificateCard';

// ─── 模板选择浮层（inline dropdown，非全屏 modal）────────────────────────────
const TemplatePicker = ({ current, onSelect, onClose }) => {
  const ref = useRef(null);

  // 点外部关闭
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="cw-tmpl-popup">
      <div className="cw-tmpl-popup-title">共 {CERT_TEMPLATES.length} 款证书模板</div>
      <div className="cw-tmpl-popup-grid">
        {CERT_TEMPLATES.map((tmpl) => {
          const on = tmpl.id === current;
          return (
            <button
              key={tmpl.id}
              type="button"
              className={`cw-tmpl-chip ${on ? 'active' : ''}`}
              style={{ background: tmpl.bg, borderColor: on ? tmpl.border : `${tmpl.border}55`, color: tmpl.title }}
              onClick={() => { onSelect(tmpl.id); onClose(); }}
            >
              {/* 小预览框 */}
              <div style={{
                height: 56, borderRadius: 5, marginBottom: 5,
                border: `${on ? 2.5 : 1.5}px solid ${tmpl.border}`,
                position: 'relative', overflow: 'hidden', background: tmpl.bg,
              }}>
                <div style={{ position: 'absolute', inset: 4, border: `1px solid ${tmpl.border}55` }} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                  fontSize: 10, fontWeight: 700, color: tmpl.title, letterSpacing: '0.05em',
                  fontFamily: 'Noto Serif SC, serif', whiteSpace: 'nowrap',
                }}>荣誉证书</div>
                <div style={{ position: 'absolute', top: 3, left: 3, fontSize: 10, color: tmpl.accent, opacity: 0.7 }}>
                  {CORNER_SYMBOLS[tmpl.corner]}
                </div>
                {on && (
                  <div style={{
                    position: 'absolute', top: -1, right: -1,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#243330', color: '#FBF7EE',
                    fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✓</div>
                )}
              </div>
              <div className="cw-tmpl-chip-name">{tmpl.name}</div>
              <div className="cw-tmpl-chip-mood">{tmpl.mood}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── CertWorkshop 主组件（V2 工坊聚焦布局）──────────────────────────────────
const CertWorkshop = ({ students, user, activeSection, onSwitchSection }) => {
  const [rankingTypeId, setRankingTypeId]   = useState('power');
  const [rankSizeId, setRankSizeId]         = useState('top5');
  const [templateId, setTemplateId]         = useState('classic-gold');
  const [speechId, setSpeechId]             = useState('official');
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [certDate, setCertDate]             = useState(todayStr);
  const [downloading, setDownloading]       = useState(false);
  // null = 使用模板，string = 用户自定义文本
  const [customSpeech, setCustomSpeech]     = useState(null);
  const cardRef = useRef(null);

  const rtype     = useMemo(() => RANKING_TYPES.find((r) => r.id === rankingTypeId) || RANKING_TYPES[0], [rankingTypeId]);
  const rankSize  = useMemo(() => RANK_SIZES.find((r) => r.id === rankSizeId) || RANK_SIZES[0], [rankSizeId]);
  const tmpl      = useMemo(() => CERT_TEMPLATES.find((t) => t.id === templateId) || CERT_TEMPLATES[0], [templateId]);
  const speechTmpl = useMemo(() => SPEECH_TEMPLATES.find((s) => s.id === speechId) || SPEECH_TEMPLATES[0], [speechId]);

  const ranking = useMemo(() => buildRanking(students, rankingTypeId, rankSize.n), [students, rankingTypeId, rankSize.n]);

  const handleRankingTypeChange = useCallback((id) => { setRankingTypeId(id); setCurrentIdx(0); }, []);
  const handleRankSizeChange    = useCallback((id) => { setRankSizeId(id);    setCurrentIdx(0); }, []);

  const entry = ranking[currentIdx] || null;

  const speechCtx = useMemo(() => {
    if (!entry) return null;
    return { name: entry.name, pet: entry.pet, ranking: rtype.label, rank_label: rankLabel(entry.rank), value: entry.value, metric: rtype.metric, period: '本学期' };
  }, [entry, rtype]);

  // 切换学生时重置自定义寄语，让模板重新生效
  useEffect(() => { setCustomSpeech(null); }, [entry?.studentId]);

  const templateSpeech = speechCtx ? fillSpeech(speechTmpl, speechCtx) : '';
  const speechBody     = customSpeech !== null ? customSpeech : templateSpeech;
  const rankingLabel   = entry ? `${rtype.label} · ${rankLabel(entry.rank)}` : rtype.label;
  const awarder      = user?.nickname || user?.username || '老师';

  // 下载 PNG（html2canvas）
  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !entry) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.name}_${rtype.label}_荣誉证书.png`;
      a.click();
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  }, [entry, rtype.label]);

  // 打印（新窗口，只含证书卡片，避免打印整个页面布局）
  const handlePrint = useCallback(() => {
    if (!cardRef.current || !entry) return;

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    // outerHTML 保留所有 inline style，base href 让相对路径图片也能加载
    const cardHtml = cardRef.current.outerHTML;

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${entry.name} · 荣誉证书</title>
  <base href="${window.location.origin}">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@400;600;700&display=swap">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #fff;
    }
    @page { size: A4 landscape; margin: 8mm; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  ${cardHtml}
  <script>
    // 等字体 & 图片加载后再打印
    window.onload = function () {
      setTimeout(function () { window.print(); window.close(); }, 600);
    };
  </script>
</body>
</html>`);
    printWin.document.close();
  }, [entry]);

  return (
    <div className="cw-root">

      {/* ── 左侧工具栏（与 StickerWorkshop 统一风格）── */}
      <aside className="sw2-rail">
        <div className="sw2-rail-section-label">01 · 选择工具</div>
        <div className="sw2-tool-list">
          {TOOLS.map((t) => {
            const on = t.id === (activeSection || 'honor-cert');
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

        {/* 小提示 */}
        <div className="cw-rail-tip">
          <div className="cw-rail-tip-title">💡 小提示</div>
          选择榜单与名次后，可逐一预览每位上榜同学的证书。支持批量下载。
        </div>
      </aside>

      {/* ── 右侧工作区 ── */}
      <div className="cw-workspace">

        {/* Filter bar */}
        <div className="cw-filter-bar hw-no-print">

          {/* 榜单选择 */}
          <div className="cw-select-group">
            <span className="cw-select-label">榜单</span>
            <select className="cw-select" value={rankingTypeId} onChange={(e) => handleRankingTypeChange(e.target.value)}>
              {RANKING_TYPES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          {/* 名次选择 */}
          <div className="cw-select-group">
            <span className="cw-select-label">名次</span>
            <select className="cw-select" value={rankSizeId} onChange={(e) => handleRankSizeChange(e.target.value)}>
              {RANK_SIZES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          <div className="cw-filter-spacer" />

          {/* 日期 */}
          <input
            type="text" className="cw-date-input" value={certDate}
            onChange={(e) => setCertDate(e.target.value)} maxLength={20} title="颁奖日期"
          />

          {/* 证书模板按钮（相对定位，弹出浮层） */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="cw-tmpl-trigger"
              style={{ borderColor: tmpl.border, color: tmpl.title, background: tmpl.bg }}
              onClick={() => setShowTemplatePicker((v) => !v)}
            >
              <span style={{ width: 14, height: 14, borderRadius: 3, background: tmpl.border, display: 'inline-block', flexShrink: 0 }} />
              {tmpl.name}
              <span style={{ opacity: 0.55, fontSize: 10 }}>▾</span>
            </button>
            {showTemplatePicker && (
              <TemplatePicker
                current={templateId}
                onSelect={setTemplateId}
                onClose={() => setShowTemplatePicker(false)}
              />
            )}
          </div>

          {/* 打印 */}
          <button type="button" className="cw-action-btn" onClick={handlePrint} disabled={!entry} title="打印">
            🖨 打印
          </button>

          {/* 下载 */}
          <button
            type="button"
            className="cw-action-btn cw-action-btn--primary"
            onClick={handleDownload}
            disabled={!entry || downloading}
            title="下载 PNG"
          >
            {downloading ? '处理中…' : '⬇ 下载 PNG'}
          </button>
        </div>

        {ranking.length === 0 ? (
          <div className="cw-empty">暂无榜单数据，请先在课堂中为学生加分</div>
        ) : (
          <>
            {/* 上一张 / 下一张 + 人名胶囊 */}
            <div className="cw-nav-bar hw-no-print">
              <button type="button" className="cw-nav-btn" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
                ‹ 上一张
              </button>
              <div className="cw-rank-pills">
                {ranking.map((item, idx) => (
                  <button
                    key={item.studentId}
                    type="button"
                    className={`cw-rank-pill ${currentIdx === idx ? 'active' : ''}`}
                    onClick={() => setCurrentIdx(idx)}
                  >
                    #{item.rank} {item.name}
                  </button>
                ))}
              </div>
              <button type="button" className="cw-nav-btn" onClick={() => setCurrentIdx((i) => Math.min(ranking.length - 1, i + 1))} disabled={currentIdx === ranking.length - 1}>
                下一张 ›
              </button>
            </div>

            {/* 证书舞台（纸张纹理背景） */}
            <div className="cw-card-stage">
              <CertificateCard
                ref={cardRef}
                tmpl={tmpl}
                entry={entry}
                speechBody={speechBody}
                awarder={awarder}
                certDate={certDate}
                rankingLabel={rankingLabel}
                rtype={rtype}
              />
            </div>

            {/* 话术模板横向滚动条 */}
            <div className="cw-speech-strip hw-no-print">
              <div className="cw-speech-header">
                <span className="cw-speech-title">话术模板</span>
                <span className="cw-speech-meta">
                  {customSpeech !== null
                    ? '· 自定义模式'
                    : `· 已选「${speechTmpl.name}」· 自动填充姓名 / 宠物 / 名次`}
                </span>
                <div style={{ flex: 1 }} />
                {customSpeech !== null ? (
                  <button
                    type="button"
                    className="cw-speech-edit-btn cw-speech-edit-btn--active"
                    onClick={() => setCustomSpeech(null)}
                  >
                    ↩ 还原模板
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cw-speech-edit-btn"
                    onClick={() => setCustomSpeech(templateSpeech)}
                    disabled={!entry}
                  >
                    ✎ 自定义
                  </button>
                )}
              </div>
              {/* 自定义编辑区 */}
              {customSpeech !== null && (
                <div className="cw-speech-custom">
                  <textarea
                    className="cw-speech-textarea"
                    value={customSpeech}
                    onChange={(e) => setCustomSpeech(e.target.value)}
                    maxLength={500}
                    placeholder="在此输入自定义寄语…"
                  />
                  <div className="cw-speech-char-count">{customSpeech.length} / 500</div>
                </div>
              )}
              {/* 模板卡片列表（自定义模式下收起） */}
              {customSpeech === null && (
                <div className="cw-speech-scroll">
                  {SPEECH_TEMPLATES.map((st) => {
                    const on = speechId === st.id;
                    const preview = speechCtx ? fillSpeech(st, speechCtx) : st.body;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        className={`cw-speech-card ${on ? 'active' : ''}`}
                        onClick={() => { setSpeechId(st.id); setCustomSpeech(null); }}
                      >
                        <div className="cw-speech-card-row">
                          <span className="cw-speech-card-name">{st.name}</span>
                          <span className="cw-speech-card-tone">{st.tone}</span>
                        </div>
                        <div className="cw-speech-card-preview">{preview}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CertWorkshop;
