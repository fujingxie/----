import React, { useState } from 'react';
import './HallOfFame.css';
import { Crown, Medal } from 'lucide-react';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
import EmptyState from '../Common/EmptyState';

const HallOfFame = ({ students }) => {
  const [activeRank, setActiveRank] = useState('pet'); // pet, coin

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  const petRanking = [...students].sort((a, b) => (b.pet_points || 0) - (a.pet_points || 0));
  const coinRanking = [...students].sort((a, b) => (b.coins || 0) - (a.coins || 0));

  const currentRanking = activeRank === 'pet' ? petRanking : coinRanking;
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
      : '班级首富';

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
        </div>
      </div>

      {podiumRanking[0] ? (
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
                            {activeRank === 'pet' ? `${student.total_exp || 0} EXP` : `💰${student.coins || 0}`}
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
                    {activeRank === 'pet' ? student.pet_name : `余额: 💰${student.coins || 0}`}
                  </span>
                </div>
                  <div className="rank-score">{activeRank === 'pet' ? `${student.total_exp || 0} EXP` : `💰${student.coins || 0}`}</div>
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
