import React, { useMemo, useState } from 'react';
import { Egg, X } from 'lucide-react';
import Modal from '../Common/Modal';
import { ADOPTABLE_PET_LIBRARY, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
import { activateStudentPet } from '../../lib/petCollection';
import './PetSelectionModal.css';

const PetSelectionModal = ({ isOpen, onClose, student, onConfirm }) => {
  const [selectedPet, setSelectedPet] = useState(null);
  const [petName, setPetName] = useState('');

  const previewName = useMemo(() => petName.trim() || selectedPet?.name || '未命名伙伴', [petName, selectedPet]);

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  const handleConfirm = () => {
    if (!selectedPet) return;
    onConfirm(activateStudentPet(student, selectedPet, petName));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showHeader={false} contentClassName="pet-selection-modal-shell" bodyClassName="pet-selection-modal-body">
      <div className="pet-selection-container">
        <button className="pet-selection-close" onClick={onClose} type="button">
          <X size={22} />
        </button>

        <div className="pet-selection-hero">
          <div className="pet-selection-egg">
            <Egg size={30} />
          </div>
          <h2>为 <span>{student?.name}</span> 挑选初始宠物</h2>
          <p>从图鉴库中选择一个喜欢的生灵，建立你们的课堂羁绊吧！</p>
        </div>

        <div className="pet-grid">
          {ADOPTABLE_PET_LIBRARY.map((pet) => (
            <button
              key={pet.id}
              className={`pet-option ${selectedPet?.id === pet.id ? 'active' : ''}`}
              onClick={() => setSelectedPet(pet)}
              type="button"
            >
              <div className="pet-icon-wrapper">
                <img src={pet.icon} alt={pet.name} onError={handleImageError} />
              </div>
              <span>{pet.name}</span>
            </button>
          ))}
        </div>

        <div className="pet-selection-footer">
          <div className="pet-naming-section">
            <label>给它起个名字吧（留空则默认使用物种名）</label>
            <input
              type="text"
              placeholder="例如：王富贵"
              className="glass-input"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
            />
            <p className="pet-preview-copy">
              当前预览：<strong>{previewName}</strong>{selectedPet ? ` · ${selectedPet.name}` : ''}
            </p>
          </div>

          <button
            className="confirm-activation-btn"
            disabled={!selectedPet}
            onClick={handleConfirm}
            type="button"
          >
            确认破壳唤醒
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PetSelectionModal;
