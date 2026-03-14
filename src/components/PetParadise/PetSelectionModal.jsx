import React, { useState } from 'react';
import Modal from '../Common/Modal';
import { PET_LIBRARY } from '../../api/petLibrary';
import './PetSelectionModal.css';

const PetSelectionModal = ({ isOpen, onClose, student, onConfirm }) => {
  const [selectedPet, setSelectedPet] = useState(null);
  const [petName, setPetName] = useState('');

  const handleConfirm = () => {
    if (!selectedPet) return;
    onConfirm({
      ...student,
      pet_status: 'active',
      pet_type_id: selectedPet.id, // 关键：存储 ID
      pet_type_name: selectedPet.name,
      pet_name: petName || selectedPet.name,
      pet_level: 1,
      pet_points: 0,
      coins: student.coins || 0
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`为 ${student?.name} 挑选初始宠物`}>
      <div className="pet-selection-container">
        <p className="subtitle">从图鉴库中选择一个喜欢的生灵，建立你们的课堂羁绊吧！</p>
        
        <div className="pet-grid">
          {PET_LIBRARY.map(pet => (
            <div 
              key={pet.id} 
              className={`pet-option ${selectedPet?.id === pet.id ? 'active' : ''}`}
              onClick={() => setSelectedPet(pet)}
            >
              <div className="pet-icon-wrapper">
                <img src={pet.icon} alt={pet.name} />
              </div>
              <span>{pet.name}</span>
            </div>
          ))}
        </div>

        <div className="pet-naming-section">
          <label>给它起个名字吧（留空则默认使用物种名）</label>
          <input 
            type="text" 
            placeholder="例如: 王富贵" 
            className="glass-input"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
          />
        </div>

        <button 
          className="confirm-activation-btn" 
          disabled={!selectedPet}
          onClick={handleConfirm}
        >
          确认破壳唤醒
        </button>
      </div>
    </Modal>
  );
};

export default PetSelectionModal;
