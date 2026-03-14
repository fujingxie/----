import React from 'react';
import './PetCard.css';
import { getPetImagePath } from '../../api/petLibrary';

const PetCard = ({ student, onActivate }) => {
  const isEgg = student.pet_status === 'egg';

  return (
    <div className="pet-card glass-card">
      <div className="pet-lv-badge">Lv.{student.pet_level || 0}</div>
      
      <div className="pet-visual">
        {isEgg ? (
          <div className="egg-display">
            <img src="/assets/pets/egg.png" alt="egg" className="egg-float" />
            <div className="egg-shadow"></div>
          </div>
        ) : (
          <img 
            src={getPetImagePath(student.pet_type_id, student.pet_level)} 
            alt="pet" 
            className="pet-image" 
          />
        )}
      </div>

      <div className="student-info">
        <span className="pet-type-label">{isEgg ? '神秘蛋' : student.pet_type_name}</span>
        <h3 className="student-name">{student.name}</h3>
      </div>

      <button 
        className={`pet-action-btn ${isEgg ? 'activate' : 'interact'}`}
        onClick={() => onActivate(student)}
      >
        {isEgg ? '点击唤醒宠物' : '互动'}
      </button>
    </div>
  );
};

export default PetCard;
