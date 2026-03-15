import React from 'react';
import { BookOpen } from 'lucide-react';
import './PetCard.css';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK } from '../../api/petLibrary';

const PetCard = ({ student, onActivate, onOpenCollection, adoptionCount = 0, isReadyForNewPet = false }) => {
  const isEgg = student.pet_status === 'egg';
  const petTypeLabel = isEgg ? '神秘蛋' : student.pet_type_name || getPetNameById(student.pet_type_id);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  return (
    <div className="pet-card glass-card">
      <div className="pet-lv-badge">Lv.{student.pet_level || 0}</div>
      {adoptionCount > 0 && (
        <button className="pet-collection-trigger" type="button" onClick={() => onOpenCollection(student)}>
          <BookOpen size={16} />
          <span className="pet-collection-count">{adoptionCount}</span>
        </button>
      )}
      
      <button className="pet-visual pet-visual-trigger" type="button" onClick={() => onActivate(student)}>
        {isEgg ? (
          <div className="egg-display">
            <img src={PET_IMAGE_FALLBACK} alt="egg" className="egg-float" onError={handleImageError} />
            <div className="egg-shadow"></div>
          </div>
        ) : (
          <img 
            src={getPetImagePath(student.pet_type_id, student.pet_level)} 
            alt="pet" 
            className="pet-image"
            onError={handleImageError}
          />
        )}
      </button>

      <div className="student-info">
        <span className="pet-type-label">{petTypeLabel}</span>
        <h3 className="student-name">{student.name}</h3>
      </div>

      <button 
        className={`pet-action-btn ${isEgg ? 'activate' : 'interact'}`}
        onClick={() => onActivate(student)}
      >
        {isEgg ? '点击唤醒宠物' : isReadyForNewPet ? '满级毕业，领养新宠' : '互动'}
      </button>
    </div>
  );
};

export default PetCard;
