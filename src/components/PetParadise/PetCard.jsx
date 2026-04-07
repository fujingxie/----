import React from 'react';
import { BookOpen, Star, ClipboardList } from 'lucide-react';
import './PetCard.css';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
import { getPetConditionLabel, getPetSafetyHint, formatLastFedLabel } from '../../lib/petCondition';

const getNextLevelInfo = (student, levelThresholds = []) => {
  if (student.pet_status === 'egg') {
    return { label: '等待唤醒宠物', progress: 0 };
  }

  const currentLevel = Number(student.pet_level || 1);
  const currentExp = Number(student.total_exp || 0);
  const previousThreshold = currentLevel <= 1 ? 0 : Number(levelThresholds[currentLevel - 2] || 0);
  const nextThreshold = Number(levelThresholds[currentLevel - 1] || 0);

  if (!nextThreshold) {
    return { label: '已满级，可毕业领养新宠', progress: 100 };
  }

  const distance = Math.max(nextThreshold - currentExp, 0);
  const progress = ((currentExp - previousThreshold) / Math.max(nextThreshold - previousThreshold, 1)) * 100;

  return {
    label: `距 Lv.${currentLevel + 1} 差 ${distance}`,
    progress: Math.max(6, Math.min(100, progress)),
  };
};

const PetCard = ({
  student,
  levelThresholds = [],
  petConditionConfig = null,
  effect = null,
  onActivate,
  onOpenCollection,
  onOpenLog,
  adoptionCount = 0,
  isReadyForNewPet = false,
  isSelectable = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const isEgg = student.pet_status === 'egg';
  const petTypeLabel = isEgg ? '神秘蛋' : student.pet_type_name || getPetNameById(student.pet_type_id);
  const petDisplayName = isEgg ? '神秘蛋' : student.pet_name || petTypeLabel;
  const petOwnerLabel = `${student.name}的${petDisplayName}`;
  const nextLevelInfo = getNextLevelInfo(student, levelThresholds);
  const conditionLabel = getPetConditionLabel(student.pet_condition);
  const visualCondition = student.pet_condition || 'healthy';
  const conditionDecoration = {
    healthy: { icon: '✨', accent: '状态稳定' },
    hungry: { icon: '🍽️', accent: '肚子饿了' },
    weak: { icon: '⚠️', accent: '急需照顾' },
    sleeping: { icon: '💤', accent: '正在休眠' },
  }[visualCondition];
  const primaryButtonLabel = isEgg
    ? '点击唤醒宠物'
    : isReadyForNewPet
      ? '查看图鉴，领取新宠'
      : '课堂互动';

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  return (
    <div
      className={`pet-card glass-card ${effect ? `is-${effect.type}` : ''} ${isSelected ? 'selected' : ''} ${
        !isEgg ? `condition-${student.pet_condition || 'healthy'}` : ''
      }`}
    >
      <div className="pet-lv-badge">Lv.{student.pet_level || 0}</div>

      {isSelectable && (
        <button
          className={`pet-select-toggle ${isSelected ? 'selected' : ''}`}
          type="button"
          onClick={() => onToggleSelect?.(student)}
          aria-label={isSelected ? `取消选择 ${student.name}` : `选择 ${student.name}`}
        />
      )}

      {adoptionCount > 0 && (
        <button
          className={`pet-collection-trigger ${isSelectable ? 'with-selector' : ''}`}
          type="button"
          onClick={() => onOpenCollection(student)}
          title="宠物图鉴"
        >
          <BookOpen size={16} />
          <span className="pet-collection-count">{adoptionCount}</span>
        </button>
      )}

      {onOpenLog && (
        <button
          className={`pet-log-trigger ${isSelectable ? 'with-selector' : ''} ${!isSelectable && adoptionCount === 0 ? 'no-collection' : ''}`}
          type="button"
          onClick={() => onOpenLog(student)}
          title="成长记录"
        >
          <ClipboardList size={16} />
        </button>
      )}

      <button className="pet-visual pet-visual-trigger" type="button" onClick={() => onActivate(student)}>
        {!isEgg && (
          <>
            <div className={`pet-status-aura ${visualCondition}`} />
            <div className={`pet-status-orb ${visualCondition}`}>
              <span>{conditionDecoration.icon}</span>
            </div>
            <div className={`pet-status-particles ${visualCondition}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </>
        )}
        {effect && (
          <>
            <div className={`pet-exp-burst ${effect.type}`}>
              {effect.deltaExp > 0 ? `+${effect.deltaExp}` : effect.deltaExp} EXP
            </div>
            <div className="pet-effect-icons">
              {effect.icons.map((item, index) => (
                <span key={item.id} className={`pet-effect-icon orbit-${index + 1}`}>
                  {item.icon}
                </span>
              ))}
            </div>
          </>
        )}

        {isEgg ? (
          <div className="egg-display">
            <img src={PET_IMAGE_FALLBACK} alt="egg" className="egg-float" onError={handleImageError} />
            <div className="egg-shadow"></div>
          </div>
        ) : (
          <img
            src={getPetImagePath(student.pet_type_id, student.pet_level)}
            alt="pet"
            className={`pet-image ${effect ? `shake-${effect.type}` : ''}`}
            onError={handleImageError}
          />
        )}
      </button>

      <div className="student-info">
        <div className="student-info-main">
          <div>
            <div className="pet-title-row">
              <h3 className="student-name">{student.name}</h3>
              {!isEgg && <span className={`pet-condition-inline ${visualCondition}`}>{conditionLabel}</span>}
            </div>
            <span className="pet-type-label">{petOwnerLabel}</span>
            {!isEgg && <span className={`pet-condition-accent ${visualCondition}`}>{conditionDecoration.accent}</span>}
          </div>
          <div className="reward-count">
            <Star size={16} />
            <strong>{student.total_exp || 0}</strong>
          </div>
        </div>
        {!isEgg && (
          <div className="pet-status-copy">
            <span className={`pet-status-last-fed ${visualCondition}`}>{formatLastFedLabel(student.last_fed_at)}</span>
            <p className="pet-status-hint">{getPetSafetyHint(student, petConditionConfig)}</p>
          </div>
        )}
        <p className="pet-level-caption">{nextLevelInfo.label}</p>
        <div className="pet-progress-track">
          <div className="pet-progress-fill" style={{ width: `${nextLevelInfo.progress}%` }} />
        </div>
      </div>

      <button
        className={`pet-action-btn ${isEgg ? 'activate' : 'interact'}`}
        onClick={() => onActivate(student)}
        type="button"
      >
        {primaryButtonLabel}
      </button>
    </div>
  );
};

export default PetCard;
