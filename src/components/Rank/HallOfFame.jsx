import React, { useEffect, useMemo, useState } from 'react';
import './HallOfFame.css';
import { Crown, Medal } from 'lucide-react';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
import EmptyState from '../Common/EmptyState';
import { fetchProgressRanking } from '../../api/client';

const toDateInputValue = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const HallOfFame = ({ students, currentClass }) => {
  const [activeRank, setActiveRank] = useState('pet'); // pet, coin, progress
  const [progressRange, setProgressRange] = useState('7d');
  const [customRange, setCustomRange] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      start: toDateInputValue(start),
      end: toDateInputValue(today),
    };
  });
  const [progressRanking, setProgressRanking] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState('');

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  const petRanking = [...students].sort((a, b) => (b.lifetime_exp || 0) - (a.lifetime_exp || 0));
  const coinRanking = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));
  const progressRankingResolved = useMemo(
    () =>
      progressRanking
        .map((entry) => {
          const student = students.find((item) => item.id === entry.studentId);
          return student ? { ...student, ...entry } : null;
        })
        .filter(Boolean),
    [progressRanking, students],
  );

  const currentRanking = activeRank === 'pet'
    ? petRanking
    : activeRank === 'coin'
      ? coinRanking
      : progressRankingResolved;
  const podiumRanking = currentRanking.slice(0, 3);
  const remainingRanking = currentRanking.slice(3, 10);
  const podiumOrder = [
    { student: podiumRanking[1] || null, place: 2 },
    { student: podiumRanking[0] || null, place: 1 },
    { student: podiumRanking[2] || null, place: 3 },
  ];

  const renderRankMeta = (student) =>
    activeRank === 'pet'
      ? `LV.${student.pet_level || 0} ${student.pet_type_name || getPetNameById(student.pet_type_id)}`
      : activeRank === 'coin'
        ? '班级首富'
        : `累计加分 ${student.gainedExp || 0} · 累计减分 ${student.lostExp || 0}`;

  useEffect(() => {
    if (activeRank !== 'progress' || !currentClass?.id) {
      return;
    }

    const today = new Date();
    const startDate = new Date(today);
    let start = '';
    let end = toDateInputValue(today);

    if (progressRange === 'today') {
      start = toDateInputValue(today);
    } else if (progressRange === '7d') {
      startDate.setDate(today.getDate() - 6);
      start = toDateInputValue(startDate);
    } else if (progressRange === '30d') {
      startDate.setDate(today.getDate() - 29);
      start = toDateInputValue(startDate);
    } else {
      start = customRange.start;
      end = customRange.end;
    }

    if (!start || !end) {
      setProgressRanking([]);
      return;
    }

    let cancelled = false;
    const loadProgressRanking = async () => {
      setIsLoadingProgress(true);
      setProgressError('');
      try {
        const response = await fetchProgressRanking({
          classId: currentClass.id,
          start,
          end,
          limit: 10,
        });
        if (!cancelled) {
          setProgressRanking(response.rankings || []);
        }
      } catch (error) {
        if (!cancelled) {
          setProgressRanking([]);
          setProgressError(error.message || '加载进步榜失败');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProgress(false);
        }
      }
    };

    loadProgressRanking();
    return () => {
      cancelled = true;
    };
  }, [activeRank, currentClass?.id, customRange.end, customRange.start, progressRange]);

  return (
    <div className="hof-container">
      <div className="hof-header">
        <div className="rank-switches glass-card">
          <button 
            className={activeRank === 'pet' ? 'active' : ''} 
            onClick={() => setActiveRank('pet')}
          >
            宠物战力榜
          </button>
          <button 
            className={activeRank === 'coin' ? 'active' : ''} 
            onClick={() => setActiveRank('coin')}
          >
            班级财力榜
          </button>
          <button
            className={activeRank === 'progress' ? 'active' : ''}
            onClick={() => setActiveRank('progress')}
          >
            班级进步榜
          </button>
        </div>
      </div>

      {activeRank === 'progress' && (
        <div className="hof-progress-toolbar glass-card">
          <div className="hof-progress-range">
            <button className={progressRange === 'today' ? 'active' : ''} onClick={() => setProgressRange('today')} type="button">今天</button>
            <button className={progressRange === '7d' ? 'active' : ''} onClick={() => setProgressRange('7d')} type="button">近7天</button>
            <button className={progressRange === '30d' ? 'active' : ''} onClick={() => setProgressRange('30d')} type="button">近30天</button>
            <button className={progressRange === 'custom' ? 'active' : ''} onClick={() => setProgressRange('custom')} type="button">自定义</button>
          </div>
          {progressRange === 'custom' && (
            <div className="hof-progress-custom">
              <input
                type="date"
                value={customRange.start}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, start: event.target.value }))}
              />
              <span>至</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(event) => setCustomRange((prev) => ({ ...prev, end: event.target.value }))}
              />
            </div>
          )}
        </div>
      )}

      {progressError ? (
        <EmptyState
          className="empty-hof"
          icon={<Medal size={36} />}
          title="班级进步榜加载失败"
          description={progressError}
        />
      ) : isLoadingProgress && activeRank === 'progress' ? (
        <EmptyState
          className="empty-hof"
          icon={<Medal size={36} />}
          title="班级进步榜统计中"
          description="正在根据你选择的时间段计算积分增量。"
        />
      ) : podiumRanking[0] ? (
        <div className="hof-content">
          <div className="podium-wrapper">
            <div className="podium-stage glass-card">
              <div className="podium-stage-head">
                <div>
                  <span className="podium-kicker">荣耀领奖台</span>
                  <h2>前三名高光时刻</h2>
                </div>
                <div className="podium-crown-badge">
                  <Crown size={30} className="crown-icon" />
                </div>
              </div>

              <div className="podium-grid">
                {podiumOrder.map(({ student, place }) => (
                  <div
                    key={`podium-${place}-${student?.id || 'empty'}`}
                    className={`podium-slot place-${place} ${student ? 'filled' : 'empty'}`}
                  >
                    <div className="podium-rank-badge">#{place}</div>
                    {student ? (
                      <>
                        <div className="podium-visual">
                          <img
                            src={getPetImagePath(student.pet_type_id, student.pet_level)}
                            alt={student.name}
                            onError={handleImageError}
                          />
                        </div>
                        <div className="podium-info">
                          <strong className="podium-name">{student.name}</strong>
                          <span className="podium-meta">{renderRankMeta(student)}</span>
                          <span className="podium-score">
                            {activeRank === 'pet'
                              ? `${student.lifetime_exp || 0} EXP`
                              : activeRank === 'coin'
                                ? `💰${student.coins || 0}`
                                : `${student.totalExpDelta || 0} EXP`}
                          </span>
                        </div>
                        <div className="podium-base">
                          <span className="podium-base-label">{place === 1 ? '冠军' : place === 2 ? '亚军' : '季军'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="podium-empty-state">
                        <span>等待上榜</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ranking-list glass-card">
            {remainingRanking.map((student, index) => (
              <div key={student.id} className="rank-item">
                <div className="rank-num">#{index + 4}</div>
                <div className="rank-info">
                  <span className="rank-name">{student.name}</span>
                  <span className="rank-pet">
                    {activeRank === 'pet'
                      ? student.pet_name
                      : activeRank === 'coin'
                        ? `余额: 💰${student.coins || 0}`
                        : `加分 ${student.gainedExp || 0} · 减分 ${student.lostExp || 0}`}
                  </span>
                </div>
                <div className="rank-score">
                  {activeRank === 'pet'
                    ? `${student.lifetime_exp || 0} EXP`
                    : activeRank === 'coin'
                      ? `💰${student.coins || 0}`
                      : `${student.totalExpDelta || 0} EXP`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          className="empty-hof"
          icon={<Medal size={36} />}
          title="光荣榜暂未点亮"
          description="当前班级还没有足够数据生成榜单，先去添加学生、互动成长或积累金币吧。"
        />
      )}
    </div>
  );
};

export default HallOfFame;
