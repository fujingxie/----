import React, { useCallback, useMemo, useRef, useState } from 'react';

// ─── 证书模板（8 套）──────────────────────────────────────────────────────────

const CERT_TEMPLATES = [
  {
    id: 'classic-gold',
    name: '典雅金',
    mood: '正式',
    bg: '#FBF3DE',
    border: '#C9A24C',
    accent: '#8B6914',
    title: '#5C4612',
    body: '#4A3E20',
    corner: 'sunburst',
  },
  {
    id: 'mint-modern',
    name: '薄荷现代',
    mood: '清新',
    bg: '#EAF4EE',
    border: '#6BAE9F',
    accent: '#2F6F5E',
    title: '#1F4538',
    body: '#3C4D49',
    corner: 'leaves',
  },
  {
    id: 'sakura',
    name: '樱花粉',
    mood: '童趣',
    bg: '#FCE7EE',
    border: '#E5A3B8',
    accent: '#B8567A',
    title: '#8B3559',
    body: '#5C3446',
    corner: 'cherry',
  },
  {
    id: 'parchment',
    name: '羊皮卷',
    mood: '古典',
    bg: '#F6EDD4',
    border: '#A8895B',
    accent: '#8B6A3D',
    title: '#4A3520',
    body: '#3E2F1C',
    corner: 'stars',
  },
  {
    id: 'sky-clean',
    name: '晴空',
    mood: '极简',
    bg: '#F0F5FB',
    border: '#6B8FBE',
    accent: '#3E65A0',
    title: '#1F3E70',
    body: '#384A66',
    corner: 'dots',
  },
  {
    id: 'sunshine',
    name: '阳光',
    mood: '活泼',
    bg: '#FEF6D6',
    border: '#E8B34A',
    accent: '#C47E13',
    title: '#7A4A08',
    body: '#4D3913',
    corner: 'sun',
  },
  {
    id: 'forest',
    name: '森林派对',
    mood: '自然',
    bg: '#E5EFDA',
    border: '#7BA25A',
    accent: '#4D7A3A',
    title: '#2E4B20',
    body: '#364428',
    corner: 'mushroom',
  },
  {
    id: 'newyear',
    name: '新春红',
    mood: '节日',
    bg: '#FBE4D8',
    border: '#C9543A',
    accent: '#9B3320',
    title: '#6B1E0F',
    body: '#4A2418',
    corner: 'firework',
  },
];

const CORNER_SYMBOLS = {
  sunburst: '✦',
  leaves: '❋',
  cherry: '✿',
  stars: '✧',
  dots: '◆',
  sun: '☀',
  mushroom: '❀',
  firework: '✺',
};

// ─── 话术模板（8 套）──────────────────────────────────────────────────────────

const SPEECH_TEMPLATES = [
  {
    id: 'official',
    name: '正式嘉奖',
    tone: '官方',
    body: '兹表彰 {name} 同学在 {period} 的 {ranking} 中表现卓越，位列 {rank_label}，特此颁发荣誉证书，以资鼓励。愿你继续保持热忱，与伙伴 {pet} 共赴更多精彩。',
  },
  {
    id: 'warm',
    name: '温馨寄语',
    tone: '温馨',
    body: '{name} 小朋友，恭喜你！你和 {pet} 一路相伴，累计 {value} {metric}，在 {ranking} 拿下 {rank_label}。每一次坚持都值得被看见，老师为你骄傲。',
  },
  {
    id: 'playful',
    name: '幽默鼓励',
    tone: '幽默',
    body: '叮咚！{name} 同学和 {pet} 小队拿下 {ranking} 的 {rank_label} 啦！{value} {metric} 不是白攒的——继续养你的小宠物，老师给你加大鸡腿！',
  },
  {
    id: 'poetic',
    name: '诗意表达',
    tone: '诗意',
    body: '星光不负赶路人。{name} 以 {value} {metric}，在 {ranking} 写下属于自己的章节，位列 {rank_label}。与 {pet} 同行的每一步，都在向未来生长。',
  },
  {
    id: 'teacher',
    name: '老师评语',
    tone: '教育',
    body: '{name} 同学在本阶段的 {ranking} 中，凭 {value} {metric} 名列 {rank_label}。认真是最朴素的天赋，希望你把这份专注带到每一次课堂，与 {pet} 共同成长。',
  },
  {
    id: 'peer',
    name: '同学祝贺',
    tone: '亲切',
    body: '哇！{name} 和 {pet} 拿到了 {ranking} 的 {rank_label}！{value} {metric} 真厉害，是我们全班一起见证的高光时刻，期待你下一次更进一步～',
  },
  {
    id: 'milestone',
    name: '里程碑',
    tone: '纪念',
    body: '这是属于 {name} 与 {pet} 的高光时刻：{ranking} · {rank_label} · {value} {metric}。愿这份成就成为你回望时温柔而坚定的坐标。',
  },
  {
    id: 'short',
    name: '简短有力',
    tone: '简短',
    body: '{name} · {ranking} {rank_label} · {value} {metric}。以此致敬你与 {pet} 的共同努力。',
  },
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

/** 安全解析 pet_collection */
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

/** 从 students 数组生成排名列表 */
function buildRanking(students, rankingTypeId, n) {
  const rtype = RANKING_TYPES.find((r) => r.id === rankingTypeId);
  if (!rtype) return [];
  const key = rtype.valueKey;
  return [...(students || [])]
    .sort((a, b) => (b[key] || 0) - (a[key] || 0))
    .slice(0, n)
    .map((s, i) => {
      const pets = parsePetCollection(s.pet_collection);
      const activePet =
        pets.find((p) => p.status === 'active' || p.status === 'active-egg') ||
        pets.find((p) => !p.graduated) ||
        pets[0];
      return {
        rank: i + 1,
        name: s.name,
        studentId: s.id,
        pet: activePet?.pet_name || activePet?.name || '—',
        petEmoji: activePet?.emoji || '🐾',
        petLv: activePet?.pet_level || activePet?.level || 0,
        value: s[key] || 0,
      };
    });
}

/** 填充话术模板变量 */
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

/** 名次标签 */
function rankLabel(rank) {
  if (rank === 1) return '冠军';
  if (rank === 2) return '亚军';
  if (rank === 3) return '季军';
  return `第 ${rank} 名`;
}

/** 今日日期字符串 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// ─── CornerOrnament 子组件 ───────────────────────────────────────────────────

const CornerOrnament = ({ symbol, color, position }) => {
  const posStyle = {
    'top-left':     { top: 8, left: 8 },
    'top-right':    { top: 8, right: 8 },
    'bottom-left':  { bottom: 8, left: 8 },
    'bottom-right': { bottom: 8, right: 8 },
  }[position] || {};

  return (
    <span
      style={{
        position: 'absolute',
        fontSize: 22,
        color,
        opacity: 0.7,
        lineHeight: 1,
        userSelect: 'none',
        ...posStyle,
      }}
    >
      {symbol}
    </span>
  );
};

// ─── CertificateCard 子组件（CSS-based，不用 Canvas）────────────────────────

const CertificateCard = React.forwardRef(
  ({ tmpl, entry, speechBody, awarder, certDate, rankingLabel, rtype }, ref) => {
    if (!entry) return null;
    const symbol = CORNER_SYMBOLS[tmpl.corner] || '✦';

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
        }}
      >
        {/* 外层双边框 */}
        <div
          style={{
            position: 'absolute',
            inset: 12,
            border: `3px double ${tmpl.border}`,
            pointerEvents: 'none',
          }}
        />
        {/* 内边框 */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            border: `1px solid ${tmpl.border}88`,
            pointerEvents: 'none',
          }}
        />

        {/* 角落装饰 */}
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="top-left" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="top-right" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="bottom-left" />
        <CornerOrnament symbol={symbol} color={tmpl.accent} position="bottom-right" />

        {/* 内容区 */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '14px 36px',
            gap: 0,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                color: tmpl.accent,
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                marginBottom: 2,
              }}
            >
              CERTIFICATE OF HONOR
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: tmpl.title,
                letterSpacing: '0.12em',
                lineHeight: 1.2,
              }}
            >
              荣誉证书
            </div>
            {/* 排名徽章 */}
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${tmpl.border}`,
                  color: tmpl.accent,
                  fontSize: 12,
                  fontFamily: 'sans-serif',
                  letterSpacing: '0.06em',
                }}
              >
                {rankingLabel}
              </span>
            </div>
          </div>

          {/* 分隔线 */}
          <div
            style={{
              height: 1,
              background: `linear-gradient(to right, transparent, ${tmpl.border}, transparent)`,
              margin: '8px 12px',
            }}
          />

          {/* Body */}
          <div style={{ display: 'flex', flex: 1, gap: 20, minHeight: 0, alignItems: 'flex-start' }}>
            {/* 左：学生名 + 话术 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  color: tmpl.accent,
                  marginBottom: 6,
                  fontFamily: 'sans-serif',
                }}
              >
                小主人：
                <span style={{ fontSize: 20, fontWeight: 700, color: tmpl.title }}>
                  {entry.name}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: tmpl.body,
                  lineHeight: 1.9,
                  textIndent: '2em',
                  fontFamily: 'Noto Serif SC, serif',
                }}
              >
                {speechBody}
              </div>
            </div>

            {/* 右：宠物 emoji 方框 */}
            <div
              style={{
                width: 160,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  border: `2px solid ${tmpl.border}`,
                  background: tmpl.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 72,
                }}
              >
                {entry.petEmoji}
              </div>
              <div
                style={{ fontSize: 12, color: tmpl.accent, fontFamily: 'sans-serif', textAlign: 'center' }}
              >
                {entry.pet}
              </div>
              <div
                style={{ fontSize: 11, color: `${tmpl.body}99`, fontFamily: 'sans-serif' }}
              >
                {rtype?.metric}: {entry.value}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 6,
              paddingBottom: 4,
              borderTop: `1px solid ${tmpl.border}66`,
              fontFamily: 'sans-serif',
            }}
          >
            <span style={{ fontSize: 11, color: `${tmpl.body}99` }}>{certDate}</span>
            {/* 印章圆 */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: `2px solid ${tmpl.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: tmpl.accent,
                textAlign: 'center',
                lineHeight: 1.3,
                padding: 4,
              }}
            >
              荣誉<br />印章
            </div>
            <span style={{ fontSize: 11, color: `${tmpl.body}99` }}>颁奖人：{awarder}</span>
          </div>
        </div>
      </div>
    );
  },
);

CertificateCard.displayName = 'CertificateCard';

// ─── 模板选择弹窗 ─────────────────────────────────────────────────────────────

const TemplatePickerModal = ({ current, onSelect, onClose }) => (
  <div className="cw-modal-overlay" onClick={onClose}>
    <div
      className="cw-modal-box"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cw-modal-title">选择证书模板</div>
      <div className="cw-modal-grid">
        {CERT_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            className={`cw-tmpl-chip ${current === tmpl.id ? 'active' : ''}`}
            style={{
              background: tmpl.bg,
              borderColor: current === tmpl.id ? tmpl.border : `${tmpl.border}66`,
              color: tmpl.title,
            }}
            onClick={() => { onSelect(tmpl.id); onClose(); }}
          >
            <span className="cw-tmpl-chip-name">{tmpl.name}</span>
            <span className="cw-tmpl-chip-mood">{tmpl.mood}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── CertWorkshop 主组件 ──────────────────────────────────────────────────────

const CertWorkshop = ({ students, currentClass, user }) => {
  const [rankingTypeId, setRankingTypeId] = useState('power');
  const [rankSizeId, setRankSizeId] = useState('top5');
  const [templateId, setTemplateId] = useState('classic-gold');
  const [speechId, setSpeechId] = useState('official');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [certDate, setCertDate] = useState(todayStr);
  const [downloading, setDownloading] = useState(false);

  const cardRef = useRef(null);

  const rtype = useMemo(
    () => RANKING_TYPES.find((r) => r.id === rankingTypeId) || RANKING_TYPES[0],
    [rankingTypeId],
  );

  const rankSize = useMemo(
    () => RANK_SIZES.find((r) => r.id === rankSizeId) || RANK_SIZES[0],
    [rankSizeId],
  );

  const tmpl = useMemo(
    () => CERT_TEMPLATES.find((t) => t.id === templateId) || CERT_TEMPLATES[0],
    [templateId],
  );

  const speechTmpl = useMemo(
    () => SPEECH_TEMPLATES.find((s) => s.id === speechId) || SPEECH_TEMPLATES[0],
    [speechId],
  );

  // 生成排名列表
  const ranking = useMemo(
    () => buildRanking(students, rankingTypeId, rankSize.n),
    [students, rankingTypeId, rankSize.n],
  );

  // 切换榜单或名次时重置索引
  const handleRankingTypeChange = useCallback((id) => {
    setRankingTypeId(id);
    setCurrentIdx(0);
  }, []);
  const handleRankSizeChange = useCallback((id) => {
    setRankSizeId(id);
    setCurrentIdx(0);
  }, []);

  const entry = ranking[currentIdx] || null;

  // 构建话术上下文
  const speechCtx = useMemo(() => {
    if (!entry) return null;
    return {
      name: entry.name,
      pet: entry.pet,
      ranking: rtype.label,
      rank_label: rankLabel(entry.rank),
      value: entry.value,
      metric: rtype.metric,
      period: '本学期',
    };
  }, [entry, rtype]);

  const speechBody = speechCtx ? fillSpeech(speechTmpl, speechCtx) : '';
  const rankingLabel = entry ? `${rtype.label} · ${rankLabel(entry.rank)}` : rtype.label;
  const awarder = user?.nickname || user?.username || '老师';

  // 下载当前证书（html2canvas fallback to window.print）
  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !entry) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entry.name}_${rtype.label}_荣誉证书.png`;
      a.click();
    } catch {
      // html2canvas 不可用时 fallback 到打印
      window.print();
    }
  }, [entry, rtype.label]);

  // 打印
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="cw-root">
      {/* 左列：工具栏 */}
      <aside className="cw-sidebar">
        <div className="cw-sidebar-title">光荣榜证书</div>
        <div className="cw-sidebar-desc">
          根据学生榜单数据自动生成荣誉证书，选择模板与话术后一键下载。
        </div>
        <div className="cw-sidebar-tip">
          📖 小提示：切换榜单类型或名次后，证书内容会自动更新。
        </div>
      </aside>

      {/* 右侧工作区 */}
      <div className="cw-workspace">
        {/* Filter bar */}
        <div className="cw-filter-bar">
          {/* 榜单 Dropdown */}
          <select
            className="cw-select"
            value={rankingTypeId}
            onChange={(e) => handleRankingTypeChange(e.target.value)}
          >
            {RANKING_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.icon} {r.label}
              </option>
            ))}
          </select>

          {/* 名次 Dropdown */}
          <select
            className="cw-select"
            value={rankSizeId}
            onChange={(e) => handleRankSizeChange(e.target.value)}
          >
            {RANK_SIZES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          {/* 模板按钮 */}
          <button
            type="button"
            className="cw-tmpl-btn"
            style={{ borderColor: tmpl.border, color: tmpl.title, background: tmpl.bg }}
            onClick={() => setShowTemplatePicker(true)}
          >
            模板：{tmpl.name} ▾
          </button>

          <div className="cw-filter-spacer" />

          {/* 日期 */}
          <input
            type="text"
            className="cw-date-input"
            value={certDate}
            onChange={(e) => setCertDate(e.target.value)}
            maxLength={20}
            title="颁奖日期"
          />

          {/* 打印 */}
          <button
            type="button"
            className="cw-icon-btn hw-no-print"
            onClick={handlePrint}
            title="打印当前证书"
            disabled={!entry}
          >
            🖨
          </button>

          {/* 下载 */}
          <button
            type="button"
            className="cw-icon-btn cw-icon-btn--primary hw-no-print"
            onClick={handleDownload}
            title="下载当前证书"
            disabled={!entry || downloading}
          >
            ⬇
          </button>
        </div>

        {ranking.length === 0 ? (
          <div className="cw-empty">暂无学生数据，请先在课堂中为学生加分</div>
        ) : (
          <>
            {/* Prev/Next 导航 + 排名 pill */}
            <div className="cw-nav-bar hw-no-print">
              <button
                type="button"
                className="cw-nav-btn"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
              >
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
              <button
                type="button"
                className="cw-nav-btn"
                onClick={() => setCurrentIdx((i) => Math.min(ranking.length - 1, i + 1))}
                disabled={currentIdx === ranking.length - 1}
              >
                下一张 ›
              </button>
            </div>

            {/* 证书预览 */}
            <div className="cw-card-wrap">
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
              {SPEECH_TEMPLATES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`cw-speech-card ${speechId === st.id ? 'active' : ''}`}
                  onClick={() => setSpeechId(st.id)}
                >
                  <div className="cw-speech-card-name">{st.name}</div>
                  <div className="cw-speech-card-tone">{st.tone}</div>
                  <div className="cw-speech-card-preview">
                    {st.body.slice(0, 28)}…
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 模板选择弹窗 */}
      {showTemplatePicker && (
        <TemplatePickerModal
          current={templateId}
          onSelect={setTemplateId}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
};

export default CertWorkshop;
