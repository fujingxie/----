import React, { useState } from 'react';
import { Clock3, Sparkles, Trophy } from 'lucide-react';

const RandomPickerTool = ({ students }) => {
  const [pickCount, setPickCount] = useState(1);
  const [pickedStudents, setPickedStudents] = useState([]);
  const [recentPicks, setRecentPicks] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [repeatMode, setRepeatMode] = useState('recent-5');
  const [roundPool, setRoundPool] = useState([]);

  const maxPickCount = Math.min(5, Math.max(1, students.length));
  const activePickCount = Math.min(pickCount, maxPickCount);

  const pickUniqueStudents = (source, count) => {
    const pool = [...source];
    const winners = [];

    while (pool.length > 0 && winners.length < count) {
      const nextIndex = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(nextIndex, 1)[0]);
    }

    return winners;
  };

  const resolveCandidateStudents = (count) => {
    if (repeatMode === 'round-robin') {
      let nextRoundPool = roundPool.filter((studentId) =>
        students.some((student) => student.id === studentId),
      );
      if (nextRoundPool.length < count) {
        nextRoundPool = students.map((student) => student.id);
      }
      const poolStudents = students.filter((student) => nextRoundPool.includes(student.id));
      const winners = pickUniqueStudents(poolStudents, count);
      const remainingIds = nextRoundPool.filter((studentId) => !winners.some((student) => student.id === studentId));

      setRoundPool(remainingIds);
      return winners;
    }

    if (repeatMode === 'recent-5') {
      const recentIds = new Set(
        recentPicks
          .slice(0, 5)
          .flatMap((entry) => entry.students.map((student) => student.id)),
      );
      const filteredStudents = students.filter((student) => !recentIds.has(student.id));
      const candidateStudents = filteredStudents.length >= count ? filteredStudents : students;
      return pickUniqueStudents(candidateStudents, count);
    }

    return pickUniqueStudents(students, count);
  };

  const startRandomSelect = () => {
    if (students.length === 0) {
      return;
    }

    const safeCount = Math.min(activePickCount, students.length);
    setIsRolling(true);
    let count = 0;
    let finalWinners = [];
    const interval = setInterval(() => {
      const rollingWinners = pickUniqueStudents(students, safeCount);
      setPickedStudents(rollingWinners);
      count += 1;

      if (count > 18) {
        clearInterval(interval);
        finalWinners = resolveCandidateStudents(safeCount);
        setPickedStudents(finalWinners);
        setRecentPicks((prev) => {
          const nextEntry = {
            id: `${Date.now()}-${finalWinners.map((student) => student.id).join('-')}`,
            students: finalWinners,
            mode: repeatMode,
            createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          };

          return [nextEntry, ...prev].slice(0, 6);
        });
        setIsRolling(false);
      }
    }, 110);
  };

  const pickedNames = pickedStudents.map((student) => student.name).join('、');

  return (
    <div className="random-picker-layout">
      <section className="random-picker-main">
        <div className="random-count-tabs">
          {Array.from({ length: maxPickCount }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              className={`random-count-tab ${activePickCount === value ? 'active' : ''}`}
              onClick={() => setPickCount(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>

        <div className="random-mode-tabs">
          <button
            className={`random-mode-tab ${repeatMode === 'recent-5' ? 'active' : ''}`}
            onClick={() => setRepeatMode('recent-5')}
            type="button"
          >
            最近 5 次不重复
          </button>
          <button
            className={`random-mode-tab ${repeatMode === 'round-robin' ? 'active' : ''}`}
            onClick={() => setRepeatMode('round-robin')}
            type="button"
          >
            本轮全员点完再重置
          </button>
        </div>

        <div className="random-picked-board">
          {pickedStudents.length === 0 ? (
            <div className="random-picked-placeholder">等待抽取...</div>
          ) : pickedStudents.length === 1 ? (
            <div className={`lucky-name ${isRolling ? 'rolling' : ''}`}>{pickedStudents[0].name}</div>
          ) : (
            <div className={`lucky-name multi ${isRolling ? 'rolling' : ''}`}>{pickedNames}</div>
          )}
        </div>

        <button
          className="roll-btn"
          disabled={isRolling || students.length === 0}
          onClick={startRandomSelect}
          type="button"
        >
          <Sparkles size={18} />
          {isRolling ? `正在抽取 ${activePickCount} 人...` : `抽取 ${activePickCount} 人`}
        </button>
      </section>

      <aside className="random-picker-history">
        <div className="random-history-title">
          <Clock3 size={20} />
          <h4>最近点名记录</h4>
        </div>

        {recentPicks.length === 0 ? (
          <div className="random-history-empty">还没有点名记录</div>
        ) : (
          <div className="random-history-list">
            {recentPicks.map((entry) => (
              <div key={entry.id} className="random-history-item">
                <div className="random-history-copy">
                  <div className="random-history-names">
                    {entry.students.map((student) => student.name).join('、')}
                  </div>
                  <span className="random-history-meta">
                    {entry.mode === 'round-robin' ? '轮询模式' : '最近去重'} · {entry.createdAt}
                  </span>
                </div>
                <Trophy size={16} />
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
};

export default RandomPickerTool;
