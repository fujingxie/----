import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  Grip,
  Import,
  Lock,
  LockOpen,
  RefreshCcw,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  genderBalance,
  rotateSeats,
  shuffleSeat,
  sortByHeight,
  sortByScore,
  sortByVision,
  tutoringAndHeight,
  tutoringMode,
} from '../../lib/seatingAlgorithms';
import './SmartSeatingTool.css';

const DEFAULT_LAYOUT = '2-4-2';
const DEFAULT_ROWS = 6;
const AISLE_EXPORT_MARK = '丨';

const seedStudentMeta = (students) =>
  students.map((student, index) => ({
    id: student.id,
    name: student.name,
    gender: index % 2 === 0 ? '男' : '女',
    height: 138 + ((index * 3) % 32),
    vision: (4.5 + ((index * 2) % 8) * 0.1).toFixed(1),
    score: 72 + ((index * 7) % 55),
  }));

const parseLayoutGroups = (layoutStr) => {
  const parts = String(layoutStr)
    .split(/[-,\s]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return parts.length > 0 ? parts : [8];
};

const buildSeatMap = (students, totalSeats) => {
  const seatMap = new Array(totalSeats).fill(null);
  students.slice(0, totalSeats).forEach((student, index) => {
    seatMap[index] = student;
  });
  return seatMap;
};

const formatVision = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : '';
};

const normalizeGender = (value, index) => {
  const text = String(value ?? '').trim();
  if (['女', '女生', 'female', 'girl', 'f'].includes(text.toLowerCase())) {
    return '女';
  }
  if (['男', '男生', 'male', 'boy', 'm'].includes(text.toLowerCase())) {
    return '男';
  }
  return index % 2 === 0 ? '男' : '女';
};

const normalizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSeatExportRows = (seatMap, layoutGroups, rows) => {
  const totalCols = layoutGroups.reduce((sum, value) => sum + value, 0);
  const exportRows = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const nameRow = [];
    const scoreRow = [];

    for (let colIndex = 0; colIndex < totalCols; colIndex += 1) {
      const seat = seatMap[rowIndex * totalCols + colIndex];
      nameRow.push(seat?.name || '空位');
      scoreRow.push(seat ? `${seat.score}分` : '');

      let boundary = 0;
      for (let groupIndex = 0; groupIndex < layoutGroups.length - 1; groupIndex += 1) {
        boundary += layoutGroups[groupIndex];
        if (colIndex + 1 === boundary) {
          nameRow.push(AISLE_EXPORT_MARK);
          scoreRow.push(AISLE_EXPORT_MARK);
        }
      }
    }

    exportRows.push(nameRow);
    exportRows.push(scoreRow);
  }

  return exportRows;
};

const buildImportTemplateRows = () => [
  ['姓名', '性别', '身高', '视力', '成绩'],
  ['张小明', '男', 145, 4.9, 92],
  ['李小雨', '女', 142, 5.0, 96],
  ['王乐乐', '男', 148, 4.7, 88],
];

const getScoreTone = (score) => {
  if (score >= 120) {
    return 'emerald';
  }
  if (score >= 95) {
    return 'blue';
  }
  if (score >= 60) {
    return 'amber';
  }
  return 'rose';
};

function SmartSeatCard({ seat, index, isLocked, isSelected, onSelect, onToggleLock }) {
  const scoreTone = seat ? getScoreTone(Number(seat.score) || 0) : 'slate';

  const handleDragStart = (event) => {
    if (isLocked || !seat) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!seat) {
    return (
      <button
        className={`smart-seat-card empty ${isLocked ? 'locked' : ''}`}
        onClick={() => onSelect(index)}
        onContextMenu={(event) => {
          event.preventDefault();
          onToggleLock(index);
        }}
        type="button"
      >
        <span>{isLocked ? '🔒' : '空位'}</span>
      </button>
    );
  }

  return (
    <button
      className={`smart-seat-card ${seat.gender === '女' ? 'girl' : 'boy'} ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''}`}
      draggable={!isLocked}
      onClick={() => onSelect(index)}
      onContextMenu={(event) => {
        event.preventDefault();
        onToggleLock(index);
      }}
      onDragStart={handleDragStart}
      type="button"
    >
      <div className="smart-seat-lock">
        {isLocked ? <Lock size={14} /> : <LockOpen size={14} />}
      </div>
      <div className="smart-seat-avatar">{seat.gender === '女' ? '👧' : '👦'}</div>
      <div className="smart-seat-name">{seat.name}</div>
      <div className={`smart-seat-score ${scoreTone}`}>{seat.score}分</div>
    </button>
  );
}

export default function SmartSeatingTool({ currentClass, students, savedConfig, onSaveConfig }) {
  const [layoutStr, setLayoutStr] = useState(DEFAULT_LAYOUT);
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [studentMeta, setStudentMeta] = useState(() => seedStudentMeta(students));
  const [seatMap, setSeatMap] = useState([]);
  const [lockedIndices, setLockedIndices] = useState([]);
  const [viewMode, setViewMode] = useState('student');
  const [selectedSeatIndex, setSelectedSeatIndex] = useState(null);
  const [toolMessage, setToolMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const stageExportRef = useRef(null);

  const layoutGroups = useMemo(() => parseLayoutGroups(layoutStr), [layoutStr]);
  const totalCols = useMemo(
    () => layoutGroups.reduce((sum, value) => sum + value, 0),
    [layoutGroups],
  );
  const totalSeats = rows * totalCols;
  const totalSeatsRef = useRef(totalSeats);
  const currentSeat = selectedSeatIndex === null ? null : seatMap[selectedSeatIndex] || null;

  useEffect(() => {
    if (!toolMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToolMessage(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toolMessage]);

  useEffect(() => {
    totalSeatsRef.current = totalSeats;
  }, [totalSeats]);

  useEffect(() => {
    const seededStudents = seedStudentMeta(students);
    setStudentMeta(seededStudents);
    setSeatMap(buildSeatMap(seededStudents, totalSeatsRef.current));
    setLockedIndices([]);
    setSelectedSeatIndex(null);
  }, [students]);

  useEffect(() => {
    setSeatMap((prev) => buildSeatMap(prev.filter(Boolean), totalSeats));
    setLockedIndices((prev) => prev.filter((index) => index < totalSeats));
    setSelectedSeatIndex((prev) => (prev !== null && prev < totalSeats ? prev : null));
  }, [totalSeats]);

  useEffect(() => {
    if (!savedConfig || typeof savedConfig !== 'object') {
      return;
    }

    const nextLayoutStr = String(savedConfig.layoutStr || '').trim() || DEFAULT_LAYOUT;
    const nextRows = Math.max(1, Number(savedConfig.rows) || DEFAULT_ROWS);
    const nextLayoutGroups = parseLayoutGroups(nextLayoutStr);
    const nextTotalCols = nextLayoutGroups.reduce((sum, value) => sum + value, 0);
    const nextTotalSeats = nextRows * nextTotalCols;
    const nextSeatMap = new Array(nextTotalSeats).fill(null);

    (Array.isArray(savedConfig.seatMap) ? savedConfig.seatMap : []).slice(0, nextTotalSeats).forEach((seat, index) => {
      nextSeatMap[index] = seat && typeof seat === 'object' ? seat : null;
    });

    setLayoutStr(nextLayoutStr);
    setRows(nextRows);
    setViewMode(savedConfig.viewMode === 'teacher' ? 'teacher' : 'student');
    setLockedIndices(
      Array.isArray(savedConfig.lockedIndices)
        ? savedConfig.lockedIndices.filter((index) => Number.isInteger(index) && index >= 0 && index < nextTotalSeats)
        : [],
    );
    setSelectedSeatIndex(null);
    setStudentMeta(nextSeatMap.filter(Boolean));
    setSeatMap(nextSeatMap);
    setToolMessage(`已恢复${currentClass?.name || '当前班级'}的排座方案`);
  }, [currentClass?.name, savedConfig]);

  const stats = useMemo(() => {
    const seatedStudents = seatMap.filter(Boolean).length;
    return {
      seatedStudents,
      emptySeats: Math.max(0, totalSeats - seatedStudents),
    };
  }, [seatMap, totalSeats]);

  const fitRowsToStudents = () => {
    const nextRows = Math.max(1, Math.ceil(Math.max(studentMeta.length, 1) / Math.max(totalCols, 1)));
    setRows(nextRows);
  };

  const getSeatWrapperStyle = (index) => {
    const colIndex = (index % totalCols) + 1;
    let accumulated = 0;

    for (let groupIndex = 0; groupIndex < layoutGroups.length - 1; groupIndex += 1) {
      accumulated += layoutGroups[groupIndex];
      if (colIndex === accumulated) {
        return { marginRight: '28px' };
      }
    }

    return {};
  };

  const applyAlgorithm = (type) => {
    const colsPerRow = totalCols || 8;
    const algorithms = {
      shuffle: () => shuffleSeat(seatMap, lockedIndices),
      height: () => sortByHeight(seatMap, lockedIndices),
      vision: () => sortByVision(seatMap, lockedIndices),
      tutoring: () => tutoringMode(seatMap, lockedIndices),
      tutoringHeight: () => tutoringAndHeight(seatMap, lockedIndices, colsPerRow),
      score: () => sortByScore(seatMap, lockedIndices),
      gender: () => genderBalance(seatMap, lockedIndices),
    };

    const next = algorithms[type]?.();
    if (next) {
      setSeatMap(next);
    }
  };

  const handleRotate = () => {
    setSeatMap((prev) => rotateSeats(prev, lockedIndices, 2));
  };

  const handleDrop = (event, toIndex) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isInteger(fromIndex) || fromIndex === toIndex) {
      return;
    }
    if (lockedIndices.includes(fromIndex) || lockedIndices.includes(toIndex)) {
      return;
    }

    setSeatMap((prev) => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  };

  const toggleLock = (index) => {
    setLockedIndices((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index],
    );
  };

  const reloadStudents = () => {
    const seededStudents = seedStudentMeta(students);
    setStudentMeta(seededStudents);
    setSeatMap(buildSeatMap(seededStudents, totalSeats));
    setLockedIndices([]);
    setSelectedSeatIndex(null);
    setToolMessage('已重新载入当前班级学生');
  };

  const updateCurrentSeatField = (field, value) => {
    if (selectedSeatIndex === null || !seatMap[selectedSeatIndex]) {
      return;
    }

    setSeatMap((prev) =>
      prev.map((seat, index) =>
        index === selectedSeatIndex
          ? {
              ...seat,
              [field]: value,
            }
          : seat,
      ),
    );
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportStudents = async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowsFromSheet = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      let skippedRows = 0;
      const parsedStudents = rowsFromSheet
        .map((row, index) => {
          const name =
            row['姓名'] ||
            row.name ||
            row.Name ||
            row['学生姓名'] ||
            row['名字'];
          if (!String(name || '').trim()) {
            skippedRows += 1;
            return null;
          }

          return {
            id: `import-${Date.now()}-${index}`,
            name: String(name).trim(),
            gender: normalizeGender(row['性别'] || row.gender, index),
            height: normalizeNumber(row['身高'] || row.height, 140 + (index % 10)),
            vision: formatVision(row['视力'] || row.vision || 4.8),
            score: normalizeNumber(row['成绩'] || row.score, 80),
          };
        })
        .filter(Boolean);

      if (parsedStudents.length === 0) {
        setToolMessage('没有读到学生数据，请检查表头是否包含姓名');
        return;
      }

      const nextRows = Math.max(rows, Math.ceil(parsedStudents.length / Math.max(totalCols, 1)));
      const nextTotalSeats = nextRows * totalCols;
      setStudentMeta(parsedStudents);
      setSeatMap(buildSeatMap(parsedStudents, nextTotalSeats));
      setLockedIndices([]);
      setSelectedSeatIndex(null);
      setRows(nextRows);
      setToolMessage(
        skippedRows > 0
          ? `已导入 ${parsedStudents.length} 名学生，跳过 ${skippedRows} 行空姓名记录`
          : `已导入 ${parsedStudents.length} 名学生`,
      );
    } catch {
      setToolMessage('导入失败，请检查 Excel 格式');
    } finally {
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(buildImportTemplateRows());
    XLSX.utils.book_append_sheet(workbook, worksheet, '学生模板');
    XLSX.writeFile(workbook, '智能排座-学生导入模板.xlsx');
    setToolMessage('导入模板已下载');
  };

  const handleExportSheet = () => {
    const workbook = XLSX.utils.book_new();
    const exportRows = buildSeatExportRows(seatMap, layoutGroups, rows);
    const worksheet = XLSX.utils.aoa_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, '智能排座');
    XLSX.writeFile(workbook, `智能排座-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setToolMessage('座位表已导出');
  };

  const handleExportImage = async () => {
    if (!stageExportRef.current) {
      return;
    }

    try {
      const canvas = await html2canvas(stageExportRef.current, {
        backgroundColor: '#f8fbff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `智能排座-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setToolMessage('排座图已导出');
    } catch {
      setToolMessage('导出图片失败，请稍后再试');
    }
  };

  const handleSaveCurrentPlan = async () => {
    if (!onSaveConfig) {
      setToolMessage('当前版本暂未接入班级保存能力');
      return;
    }

    const config = {
      layoutStr,
      rows,
      viewMode,
      lockedIndices,
      seatMap,
    };

    try {
      setIsSaving(true);
      await onSaveConfig(config);
      setToolMessage(`已保存到${currentClass?.name || '当前班级'}`);
    } catch (error) {
      setToolMessage(error.message || '保存排座方案失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="smart-seating-shell">
      <aside className="smart-seating-sidebar glass-card">
        <div className="smart-seating-section">
          <div className="smart-seating-head">
            <Sparkles size={18} />
            <h3>智能排座</h3>
          </div>
          <p className="smart-seating-hint">
            参考你原来的智能排座逻辑，已经接进百宝箱，支持布局、锁座、拖拽和多种排座算法。
          </p>
        </div>

        <div className="smart-seating-section">
          <label className="smart-field">
            <span>布局模式</span>
            <input
              className="glass-input compact"
              value={layoutStr}
              onChange={(event) => setLayoutStr(event.target.value)}
              placeholder="例如 2-4-2"
            />
          </label>
          <label className="smart-field">
            <span>总行数</span>
            <input
              className="glass-input compact"
              min="1"
              type="number"
              value={rows}
              onChange={(event) => setRows(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>
          <div className="smart-layout-actions">
            <button className="smart-mini-btn" onClick={fitRowsToStudents} type="button">
              按人数紧凑排布
            </button>
            <span className="smart-layout-hint">
              当前 {layoutGroups.join('-')}，建议 {Math.max(1, Math.ceil(Math.max(studentMeta.length, 1) / Math.max(totalCols, 1)))} 行
            </span>
          </div>
          <div className="smart-stat-grid">
            <div className="smart-stat-card">
              <span>座位</span>
              <strong>{totalSeats}</strong>
            </div>
            <div className="smart-stat-card">
              <span>学生</span>
              <strong>{stats.seatedStudents}</strong>
            </div>
            <div className="smart-stat-card">
              <span>空位</span>
              <strong>{stats.emptySeats}</strong>
            </div>
          </div>
        </div>

        <div className="smart-seating-section">
          <div className="smart-toggle-row">
            <button
              className={`smart-toggle-btn ${viewMode === 'student' ? 'active' : ''}`}
              onClick={() => setViewMode('student')}
              type="button"
            >
              <Users size={15} />
              学生视角
            </button>
            <button
              className={`smart-toggle-btn ${viewMode === 'teacher' ? 'active' : ''}`}
              onClick={() => setViewMode('teacher')}
              type="button"
            >
              <Eye size={15} />
              老师视角
            </button>
          </div>
        </div>

        <div className="smart-seating-section">
          <div className="smart-seating-head small">
            <FileSpreadsheet size={16} />
            <h4>数据工具</h4>
          </div>
          <div className="smart-algo-grid smart-tool-grid">
            <button className="smart-action-btn" onClick={handleImportClick} type="button">
              <Import size={15} />
              导入 Excel
            </button>
            <button className="smart-action-btn" onClick={handleDownloadTemplate} type="button">
              <FileSpreadsheet size={15} />
              下载模板
            </button>
            <button className="smart-action-btn" onClick={handleExportSheet} type="button">
              <Download size={15} />
              导出座位表
            </button>
            <button className="smart-action-btn secondary" onClick={handleExportImage} type="button">
              <FileImage size={15} />
              导出图片
            </button>
            <button className="smart-action-btn primary" onClick={handleSaveCurrentPlan} type="button">
              <Save size={15} />
              {isSaving ? '保存中...' : '保存到班级'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            className="smart-hidden-input"
            onChange={handleImportStudents}
            type="file"
          />
          <div className="smart-tool-hint">
            支持表头：姓名、性别、身高、视力、成绩。也兼容 `name / gender / height / vision / score`。
          </div>
          {toolMessage ? <div className="smart-tool-message">{toolMessage}</div> : null}
        </div>

        <div className="smart-seating-section">
          <div className="smart-algo-grid">
            <button className="smart-action-btn" onClick={() => applyAlgorithm('shuffle')} type="button">
              <Shuffle size={15} />
              随机排座
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('height')} type="button">
              <UserRound size={15} />
              身高排序
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('vision')} type="button">
              <Eye size={15} />
              视力优先
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('score')} type="button">
              <Sparkles size={15} />
              成绩排序
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('tutoring')} type="button">
              <Users size={15} />
              互助模式
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('tutoringHeight')} type="button">
              <Grip size={15} />
              互助兼顾身高
            </button>
            <button className="smart-action-btn" onClick={() => applyAlgorithm('gender')} type="button">
              <UserRound size={15} />
              性别均衡
            </button>
            <button className="smart-action-btn secondary" onClick={handleRotate} type="button">
              <RotateCcw size={15} />
              整体轮换
            </button>
          </div>
          <button className="smart-reset-btn" onClick={reloadStudents} type="button">
            <RefreshCcw size={15} />
            重新载入当前班级学生
          </button>
        </div>

        <div className="smart-seating-section seat-editor">
          <div className="smart-seating-head small">
            <Grip size={16} />
            <h4>座位详情</h4>
          </div>
          {currentSeat ? (
            <div className="smart-editor-form">
              <div className="smart-editor-title">
                <strong>{currentSeat.name}</strong>
                <button
                  className="smart-lock-toggle"
                  onClick={() => toggleLock(selectedSeatIndex)}
                  type="button"
                >
                  {lockedIndices.includes(selectedSeatIndex) ? <Lock size={14} /> : <LockOpen size={14} />}
                  {lockedIndices.includes(selectedSeatIndex) ? '已锁定' : '未锁定'}
                </button>
              </div>
              <label className="smart-field">
                <span>性别</span>
                <select
                  className="glass-input compact"
                  value={currentSeat.gender}
                  onChange={(event) => updateCurrentSeatField('gender', event.target.value)}
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="未知">未知</option>
                </select>
              </label>
              <label className="smart-field">
                <span>身高</span>
                <input
                  className="glass-input compact"
                  type="number"
                  value={currentSeat.height}
                  onChange={(event) => updateCurrentSeatField('height', Number(event.target.value) || 0)}
                />
              </label>
              <label className="smart-field">
                <span>视力</span>
                <input
                  className="glass-input compact"
                  value={formatVision(currentSeat.vision)}
                  onChange={(event) => updateCurrentSeatField('vision', event.target.value)}
                />
              </label>
              <label className="smart-field">
                <span>成绩</span>
                <input
                  className="glass-input compact"
                  type="number"
                  value={currentSeat.score}
                  onChange={(event) => updateCurrentSeatField('score', Number(event.target.value) || 0)}
                />
              </label>
            </div>
          ) : (
            <div className="smart-editor-empty">
              点击任意座位卡片后，可以在这里调整学生属性并锁定座位。
            </div>
          )}
        </div>
      </aside>

      <section className="smart-seating-stage glass-card">
        <div className={`smart-seating-board ${viewMode === 'teacher' ? 'teacher-view' : ''}`}>
          <div className="smart-seating-export" ref={stageExportRef}>
            <div className="smart-seating-podium">讲 台</div>
            <div
              className="smart-seating-grid"
              style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
            >
              {seatMap.map((seat, index) => (
                <div
                  key={`seat-${index}`}
                  className="smart-seat-wrapper"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, index)}
                  style={getSeatWrapperStyle(index)}
                >
                  <SmartSeatCard
                    seat={seat}
                    index={index}
                    isLocked={lockedIndices.includes(index)}
                    isSelected={selectedSeatIndex === index}
                    onSelect={setSelectedSeatIndex}
                    onToggleLock={toggleLock}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
