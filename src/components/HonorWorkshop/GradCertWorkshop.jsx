import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPetImagePath } from '../../api/petLibrary';

// ─── 工具列表（左侧导航，与其他工坊共用）────────────────────────────────────
const TOOLS = [
  { id: 'sticker',        label: '冰箱贴制作',     icon: '🧲', desc: '为毕业宠物生成专属纪念贴' },
  { id: 'honor-cert',    label: '光荣榜证书制作', icon: '📜', desc: '为上榜同学颁发荣誉证书' },
  { id: 'graduate-cert', label: '毕业证书制作',   icon: '🎓', desc: '为毕业宠物颁发毕业证' },
];

// ─── 证书模板（8 套，与荣誉证书共用颜色体系）──────────────────────────────
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

// ─── 毕业寄语模板（6 套）─────────────────────────────────────────────────────
const GRAD_SPEECH_TEMPLATES = [
  { id: 'g-formal',  name: '正式毕业', tone: '正式', body: '兹证明 {pet}（Lv.{lv}）于 {date} 在 {class} 圆满完成全部成长旅程，累计获得 {exp} EXP，与小主人 {name} 携手抵达毕业彼岸。特此颁发毕业证书，以兹纪念。' },
  { id: 'g-journey', name: '旅程回望', tone: '抒情', body: '从 Lv.0 到 Lv.{lv}，{exp} EXP 的每一分都由 {name} 和 {pet} 一点一滴共同累积。这一路的陪伴、耐心与坚持，终将化作更远的光。毕业快乐，{pet}。' },
  { id: 'g-warm',    name: '温柔寄语', tone: '温馨', body: '亲爱的 {name}：你养育的 {pet} 今天正式毕业啦！{exp} EXP 是你们之间最真实的默契。愿你带着这份温柔，继续好好长大，{pet} 会一直记得你。' },
  { id: 'g-playful', name: '俏皮祝福', tone: '幽默', body: '毕业啦毕业啦！{pet} 打包行李准备「上岸」啦～{name} 同学累计攒了 {exp} EXP，这份耐心老师给满分！记得偶尔回来看看它哦。' },
  { id: 'g-proud',   name: '以你为荣', tone: '骄傲', body: '{name} 同学，你的 {pet} 以 Lv.{lv}、{exp} EXP 的优异成绩光荣毕业。老师见证了你们从 Lv.0 走到今天的每一步，深深以你为荣。' },
  { id: 'g-poetic',  name: '诗意留念', tone: '诗意', body: '时间会把心意酿成果实。{pet} 在 {date} 毕业，那是 {name} 用 {exp} EXP 的专注与温柔换来的光亮。愿这份好好长大的能力，一生陪伴你。' },
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

function isPetGraduated(pet) {
  return pet.graduated === true || pet.status === 'graduated';
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function fillGradSpeech(tmpl, ctx) {
  return tmpl.body
    .replaceAll('{name}', ctx.name)
    .replaceAll('{pet}', ctx.pet)
    .replaceAll('{class}', ctx.class)
    .replaceAll('{exp}', String(ctx.exp))
    .replaceAll('{lv}', String(ctx.lv))
    .replaceAll('{date}', ctx.date);
}

// ─── DiplomaCard（毕业证书卡片）──────────────────────────────────────────────
const DiplomaCard = React.forwardRef(
  ({ tmpl, student, pet, speechBody, awarder, certNo, currentClass }, ref) => {
    const [petImgError, setPetImgError] = useState(false);
    const petTypeId = pet?.pet_type_id || pet?.type || null;
    const petLevel  = pet?.pet_level   || pet?.level  || 7;
    const petName   = pet?.pet_name    || pet?.name   || '未命名';
    const petExp    = pet?.grad_exp    ?? pet?.exp    ?? 0;
    const gradDate  = pet?.completed_at || pet?.graduated_at || pet?.graduatedAt;

    useEffect(() => { setPetImgError(false); }, [petTypeId, pet?.id]);

    const petImgSrc = getPetImagePath(petTypeId, petLevel);

    // 成长时间线：Lv.0 → Lv.petLevel
    const timeline = Array.from({ length: petLevel + 1 }, (_, i) => ({
      lv: i,
      milestone: i === 0 ? '相遇' : i === petLevel ? '毕业' : null,
    }));

    if (!pet) return null;

    return (
      <div
        ref={ref}
        style={{
          width: 680,
          aspectRatio: '1.414 / 1',
          background: tmpl.bg,
          borderRadius: 6,
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: 'Noto Serif SC, Noto Sans SC, serif',
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(36,51,48,0.18), 0 4px 10px rgba(36,51,48,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 外双边框 */}
        <div style={{ position: 'absolute', inset: 12, border: `3px double ${tmpl.border}`, borderRadius: 3, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 20, border: `1px solid ${tmpl.border}66`, borderRadius: 2, pointerEvents: 'none' }} />

        {/* 证书编号（右上角） */}
        <div style={{
          position: 'absolute', top: 16, right: 24,
          fontSize: 8, color: tmpl.accent, fontFamily: 'monospace',
          letterSpacing: '0.08em', opacity: 0.8,
        }}>
          NO. {certNo}
        </div>

        {/* Header：DIPLOMA + 月桂 + 毕业证书 + 班级 */}
        <div style={{ position: 'relative', textAlign: 'center', padding: '18px 24px 6px', zIndex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.5em', color: tmpl.accent, fontWeight: 600, fontFamily: 'sans-serif' }}>
            DIPLOMA OF GRADUATION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 20, color: tmpl.border }}>🌿</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: tmpl.title, letterSpacing: '0.12em' }}>毕业证书</span>
            <span style={{ fontSize: 20, color: tmpl.border, display: 'inline-block', transform: 'scaleX(-1)' }}>🌿</span>
          </div>
          <div style={{ fontSize: 11, color: tmpl.accent, marginTop: 3, fontFamily: 'sans-serif' }}>
            {currentClass || ''} · 宠物成长毕业典礼
          </div>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', gap: 18, padding: '4px 32px 2px', zIndex: 1, minHeight: 0 }}>

          {/* 左：宠物圆形头像 + 核心信息 */}
          <div style={{ width: 160, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ position: 'relative', paddingBottom: 10 }}>
              <div style={{
                width: 136, height: 136, borderRadius: '50%',
                border: `3px solid ${tmpl.border}`,
                background: `${tmpl.border}18`,
                boxShadow: `inset 0 0 0 4px ${tmpl.bg}, inset 0 0 0 6px ${tmpl.border}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img
                  src={petImgError ? '/assets/pets/egg.png' : petImgSrc}
                  alt={petName}
                  style={{ width: '82%', height: '82%', objectFit: 'contain' }}
                  onError={() => setPetImgError(true)}
                />
              </div>
              {/* Lv 毕业徽章（圆形外底部） */}
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                padding: '3px 12px', borderRadius: 999,
                background: tmpl.border, color: '#FFF',
                fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: '0.05em',
              }}>
                Lv.{petLevel} 毕业
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: tmpl.title, textAlign: 'center', marginTop: 2 }}>
              {petName}
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 10, color: tmpl.accent, fontFamily: 'sans-serif', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span>⭐ {petExp} EXP</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{ fontFamily: 'monospace' }}>{formatDate(gradDate)}</span>
            </div>
          </div>

          {/* 右：小主人 + 寄语 + 成长时间线 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: tmpl.accent, marginBottom: 3, fontFamily: 'sans-serif' }}>
              兹证明以下同学之小宠已完成全部成长旅程——
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: tmpl.accent, fontFamily: 'sans-serif', flexShrink: 0 }}>小主人</span>
              <span style={{
                fontSize: 24, fontWeight: 900, color: tmpl.title, letterSpacing: '0.1em',
                borderBottom: `2px solid ${tmpl.border}`, paddingBottom: 1, flex: 1,
              }}>
                {student.name}
              </span>
            </div>
            <div style={{
              flex: 1, fontSize: 12, lineHeight: 1.85, color: tmpl.body,
              textIndent: '2em', letterSpacing: '0.03em',
              fontFamily: 'Noto Serif SC, serif', overflow: 'hidden',
            }}>
              {speechBody}
            </div>

            {/* 成长时间线 */}
            <div style={{ paddingTop: 6, paddingBottom: 2, borderTop: `1px dashed ${tmpl.border}66` }}>
              <div style={{ fontSize: 9, color: tmpl.accent, letterSpacing: '0.2em', marginBottom: 5, fontFamily: 'sans-serif' }}>
                成长时间线 · JOURNEY
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {timeline.map((step, i) => (
                  <React.Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: tmpl.border, color: '#FFF',
                        fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 0 0 2px ${tmpl.bg}, 0 0 0 3px ${tmpl.border}`,
                      }}>
                        {step.lv}
                      </div>
                      <div style={{
                        fontSize: 8, color: tmpl.body, marginTop: 3,
                        minHeight: 12, fontFamily: 'sans-serif',
                        opacity: step.milestone ? 1 : 0.35,
                      }}>
                        {step.milestone || '·'}
                      </div>
                    </div>
                    {i < timeline.length - 1 && (
                      <div style={{
                        flex: 1, height: 2, background: tmpl.border,
                        marginTop: 9, opacity: 0.6,
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer：日期 + 印章 + 签名 */}
        <div style={{
          position: 'relative', display: 'flex',
          justifyContent: 'space-between', alignItems: 'flex-end',
          padding: '4px 36px 10px', zIndex: 1,
          borderTop: `1px solid ${tmpl.border}44`,
        }}>
          <div>
            <div style={{ fontSize: 8, color: tmpl.accent, letterSpacing: '0.18em', fontFamily: 'sans-serif', marginBottom: 2 }}>颁发日期</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: tmpl.title, fontFamily: 'monospace' }}>
              {formatDate(gradDate)}
            </div>
          </div>
          <div style={{
            width: 62, height: 62, borderRadius: '50%',
            border: `2.5px solid ${tmpl.border}`, background: `${tmpl.border}14`,
            color: tmpl.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
            transform: 'rotate(-8deg)', textAlign: 'center', lineHeight: 1.3,
            boxShadow: `inset 0 0 0 2px ${tmpl.bg}`,
          }}>
            毕业<br />典礼章
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: tmpl.accent, letterSpacing: '0.18em', fontFamily: 'sans-serif', marginBottom: 2 }}>班主任签发</div>
            <div style={{
              fontSize: 14, fontWeight: 800, color: tmpl.title, fontStyle: 'italic',
              borderBottom: `1px solid ${tmpl.border}`, paddingBottom: 1, paddingRight: 14,
            }}>
              {awarder}
            </div>
            <div style={{ fontSize: 9, color: `${tmpl.body}99`, marginTop: 2, fontFamily: 'sans-serif' }}>班主任</div>
          </div>
        </div>
      </div>
    );
  },
);
DiplomaCard.displayName = 'DiplomaCard';

// ─── GradCertWorkshop 主组件 ──────────────────────────────────────────────────
const GradCertWorkshop = ({ students, currentClass, user, activeSection, onSwitchSection }) => {
  const [selectedKey, setSelectedKey] = useState(null);
  const [templateId, setTemplateId]   = useState('parchment');
  const [speechId, setSpeechId]       = useState('g-journey');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);
  // null = 使用模板，string = 用户自定义文本
  const [customSpeech, setCustomSpeech] = useState(null);
  const cardRef = useRef(null);

  // 收集所有毕业宠物（按学生分组）
  const groupedStudents = useMemo(() => {
    return (students || [])
      .map((s) => {
        const pets = parsePetCollection(s.pet_collection);
        const graduated = pets.filter(isPetGraduated);
        return graduated.length > 0 ? { student: s, pets: graduated } : null;
      })
      .filter(Boolean);
  }, [students]);

  // 自动选中第一条
  useEffect(() => {
    if (!selectedKey && groupedStudents.length > 0) {
      const first = groupedStudents[0];
      setSelectedKey(`${first.student.id}:${first.pets[0].id}`);
    }
  }, [groupedStudents, selectedKey]);

  // 当前选中的 { student, pet }
  const current = useMemo(() => {
    if (!selectedKey) return null;
    const [sid, pid] = selectedKey.split(':');
    for (const { student, pets } of groupedStudents) {
      if (String(student.id) === sid) {
        const pet = pets.find((p) => p.id === pid);
        if (pet) return { student, pet };
      }
    }
    return groupedStudents[0]
      ? { student: groupedStudents[0].student, pet: groupedStudents[0].pets[0] }
      : null;
  }, [selectedKey, groupedStudents]);

  // 搜索过滤
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedStudents;
    const q = searchQuery.toLowerCase();
    return groupedStudents
      .map(({ student, pets }) => ({
        student,
        pets: pets.filter((p) =>
          (p.pet_name || p.name || '').toLowerCase().includes(q) ||
          student.name.toLowerCase().includes(q)
        ),
      }))
      .filter(({ pets }) => pets.length > 0);
  }, [groupedStudents, searchQuery]);

  const tmpl       = useMemo(() => CERT_TEMPLATES.find((t) => t.id === templateId) || CERT_TEMPLATES[0], [templateId]);
  const speechTmpl = useMemo(() => GRAD_SPEECH_TEMPLATES.find((s) => s.id === speechId) || GRAD_SPEECH_TEMPLATES[0], [speechId]);

  // 话术上下文
  const speechCtx = useMemo(() => {
    if (!current) return null;
    const { student, pet } = current;
    return {
      name:  student.name,
      pet:   pet.pet_name || pet.name || '—',
      class: currentClass?.name || '',
      exp:   pet.grad_exp ?? student.lifetime_exp ?? 0,
      lv:    pet.pet_level || pet.level || 7,
      date:  formatDate(pet.completed_at || pet.graduatedAt),
    };
  }, [current, currentClass]);

  // 切换宠物时重置自定义寄语，让模板重新生效
  useEffect(() => { setCustomSpeech(null); }, [selectedKey]);

  const templateSpeech = speechCtx ? fillGradSpeech(speechTmpl, speechCtx) : '';
  const speechBody     = customSpeech !== null ? customSpeech : templateSpeech;

  // 证书编号
  const certNo = useMemo(() => {
    if (!current) return '';
    const classCode = (currentClass?.name || '').replace(/[^\d]/g, '') || '00';
    const dateCode  = (current.pet.completed_at || '').slice(0, 10).replace(/-/g, '');
    const idSuffix  = String(current.pet.id || '').slice(-6).toUpperCase();
    return `GRAD-${classCode}-${dateCode}-${idSuffix}`;
  }, [current, currentClass]);

  const awarder = user?.nickname || user?.username || '老师';

  // 下载 PNG
  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${current.student.name}_${current.pet.pet_name || '毕业证书'}.png`;
      a.click();
    } catch {
      handlePrint();
    } finally {
      setDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // 打印（新窗口，只含证书）
  const handlePrint = useCallback(() => {
    if (!cardRef.current || !current) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const cardHtml = cardRef.current.outerHTML;
    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${current.student.name} · ${current.pet.pet_name || '毕业证书'}</title>
  <base href="${window.location.origin}">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700;900&family=Noto+Sans+SC:wght@400;600;700&display=swap">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
    @page { size: A4 landscape; margin: 8mm; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  ${cardHtml}
  <script>window.onload=function(){setTimeout(function(){window.print();window.close();},600);};</script>
</body>
</html>`);
    printWin.document.close();
  }, [current]);

  const totalGraduates = groupedStudents.reduce((n, g) => n + g.pets.length, 0);

  return (
    <div className="gc-root">

      {/* ── 左侧工具栏 ── */}
      <aside className="sw2-rail">
        <div className="sw2-rail-section-label">01 · 选择工具</div>
        <div className="sw2-tool-list">
          {TOOLS.map((t) => {
            const on = t.id === (activeSection || 'graduate-cert');
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

        {/* 毕业标准提示 */}
        <div className="cw-rail-tip">
          <div className="cw-rail-tip-title">🎓 毕业标准</div>
          宠物达到最高等级并完成毕业流程后，自动出现在候选列表中。
        </div>

        {/* 本次签发信息块 */}
        {current && (
          <div className="gc-issuing-block">
            <div className="gc-issuing-label">本次签发</div>
            <div className="gc-issuing-pet">{current.pet.pet_name || current.pet.name || '未命名'}</div>
            <div className="gc-issuing-student">{current.student.name}</div>
            <div className="gc-issuing-no">{certNo}</div>
          </div>
        )}
      </aside>

      {/* ── 中间：毕业宠物选择器 ── */}
      <div className="gc-picker">
        <div className="gc-picker-header">
          <span className="gc-picker-title">毕业宠物</span>
          <span className="gc-picker-count">{totalGraduates} 只</span>
        </div>
        <div className="gc-picker-search">
          <input
            type="text"
            className="gc-search-input"
            placeholder="搜索学生 / 宠物名…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="gc-picker-list">
          {filteredGroups.length === 0 ? (
            <div className="gc-picker-empty">
              {totalGraduates === 0 ? '暂无毕业宠物' : '没有匹配的结果'}
            </div>
          ) : (
            filteredGroups.map(({ student, pets }) => (
              <div key={student.id} className="gc-student-group">
                <div className="gc-student-label">
                  <span className="gc-student-avatar">{(student.name || '?')[0]}</span>
                  {student.name} · {pets.length} 只
                </div>
                {pets.map((pet) => {
                  const key = `${student.id}:${pet.id}`;
                  const on  = key === selectedKey;
                  const petTypeId = pet.pet_type_id || pet.type || null;
                  const petLevel  = pet.pet_level   || pet.level  || 7;
                  const petName   = pet.pet_name     || pet.name   || '未命名';
                  const petExp    = pet.grad_exp     ?? 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`gc-pet-row ${on ? 'active' : ''}`}
                      onClick={() => setSelectedKey(key)}
                    >
                      <div className="gc-pet-thumb">
                        <img
                          src={getPetImagePath(petTypeId, petLevel)}
                          alt={petName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.src = '/assets/pets/egg.png'; }}
                        />
                      </div>
                      <div className="gc-pet-info">
                        <div className="gc-pet-name">{petName}</div>
                        <div className="gc-pet-meta">
                          Lv.{petLevel} · {petExp} EXP · {formatDate(pet.completed_at || pet.graduatedAt)}
                        </div>
                      </div>
                      {on && <span className="gc-pet-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── 右侧：控制栏 + 证书舞台 + 寄语条 ── */}
      <div className="gc-right">

        {/* 控制栏 */}
        <div className="gc-control-bar hw-no-print">
          <span className="gc-tmpl-label">证书模板</span>
          <div className="gc-tmpl-swatches">
            {CERT_TEMPLATES.map((t) => {
              const on = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`gc-swatch ${on ? 'active' : ''}`}
                  style={{ background: t.bg, borderColor: on ? '#243330' : t.border }}
                  title={`${t.name} · ${t.mood}`}
                  onClick={() => setTemplateId(t.id)}
                />
              );
            })}
            {/* 当前模板名称 */}
            <span className="gc-tmpl-current-name" style={{ color: tmpl.accent, borderColor: tmpl.border, background: tmpl.bg }}>
              {tmpl.name}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <button type="button" className="cw-action-btn" onClick={handlePrint} disabled={!current} title="打印">
            🖨 打印
          </button>
          <button
            type="button"
            className="cw-action-btn cw-action-btn--primary"
            onClick={handleDownload}
            disabled={!current || downloading}
          >
            {downloading ? '处理中…' : '⬇ 下载证书'}
          </button>
        </div>

        {/* 证书舞台 */}
        <div className="gc-stage">
          {!current ? (
            <div className="cw-empty">← 请先选择左侧的毕业宠物</div>
          ) : (
            <DiplomaCard
              ref={cardRef}
              tmpl={tmpl}
              student={current.student}
              pet={current.pet}
              speechBody={speechBody}
              awarder={awarder}
              certNo={certNo}
              currentClass={currentClass?.name}
            />
          )}
        </div>

        {/* 毕业寄语横向滚动条 */}
        <div className="cw-speech-strip hw-no-print">
          <div className="cw-speech-header">
            <span className="cw-speech-title">毕业寄语</span>
            <span className="cw-speech-meta">
              {customSpeech !== null
                ? '· 自定义模式'
                : `· 已选「${speechTmpl.name}」· 自动填充姓名 / 宠物 / 经验`}
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
                disabled={!current}
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
              {GRAD_SPEECH_TEMPLATES.map((st) => {
                const on = speechId === st.id;
                const preview = speechCtx ? fillGradSpeech(st, speechCtx) : st.body;
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

      </div>{/* end gc-right */}
    </div>
  );
};

export default GradCertWorkshop;
