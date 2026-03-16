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
  const champion = currentRanking[0];

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

      {champion ? (
        <div className="hof-content">
          {/* 冠军大卡片 */}
          <div className="champion-card-wrapper">
             <div className="champion-card glass-card">
                <div className="crown-box">
                  <Crown size={48} className="crown-icon" />
                </div>
                <div className="champion-visual">
                  {activeRank === 'pet' ? (
                    <img
                      src={getPetImagePath(champion.pet_type_id, champion.pet_level)}
                      alt="champion"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="coin-champion-avatar">💰</div>
                  )}
                </div>
                <div className="champion-info">
                  <h2 className="title-gradient">{champion.name}</h2>
                  <p className="champion-honor">
                    {activeRank === 'pet'
                      ? `LV.${champion.pet_level || 0} ${champion.pet_type_name || getPetNameById(champion.pet_type_id)}`
                      : '班级首富'}
                  </p>
                  <div className="champion-stats">
                    <div className="stat">
                      <span className="label">{activeRank === 'pet' ? '总经验' : '总资产'}</span>
                      <span className="value">{activeRank === 'pet' ? champion.total_exp || 0 : champion.coins || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="label">{activeRank === 'pet' ? '当前等级' : '当前余额'}</span>
                      <span className="value">{activeRank === 'pet' ? `Lv.${champion.pet_level || 0}` : champion.coins || 0}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* 排名列表 */}
          <div className="ranking-list glass-card">
            {currentRanking.slice(1, 10).map((student, index) => (
              <div key={student.id} className="rank-item">
                <div className="rank-num">#{index + 2}</div>
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
