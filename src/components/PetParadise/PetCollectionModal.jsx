import React from 'react';
import Modal from '../Common/Modal';
import { Sparkles } from 'lucide-react';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK } from '../../api/petLibrary';
import './PetCollectionModal.css';

const PetCollectionModal = ({
  isOpen,
  onClose,
  student,
  collection = [],
  canAdoptNewEgg = false,
  onAdoptNewEgg,
}) => {
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${student?.name} 的宠物图鉴墙`}
      contentClassName="pet-collection-modal-shell"
      bodyClassName="pet-collection-modal-body"
    >
      <div className="pet-collection-modal">
        <p className="pet-collection-total">总计领养：{collection.length} 只</p>
        <div className="pet-collection-grid">
          {collection.map((entry) => {
            const isEgg = entry.status === 'active-egg';
            const statusLabel = entry.status === 'graduated' ? '已毕业' : '出战中';

            return (
              <article key={entry.id} className={`pet-collection-card ${entry.status}`}>
                <span className="pet-collection-status">{statusLabel}</span>
                <span className="pet-collection-level">Lv.{entry.pet_level || 0}</span>
                <div className="pet-collection-visual">
                  <img
                    src={isEgg ? PET_IMAGE_FALLBACK : getPetImagePath(entry.pet_type_id, entry.pet_level)}
                    alt={entry.pet_name}
                    onError={handleImageError}
                  />
                </div>
                <strong>{entry.pet_name || getPetNameById(entry.pet_type_id)}</strong>
                <span>{isEgg ? '神秘蛋' : getPetNameById(entry.pet_type_id)}</span>
              </article>
            );
          })}
        </div>

        {canAdoptNewEgg && (
          <button className="pet-collection-upgrade-btn" onClick={onAdoptNewEgg} type="button">
            <Sparkles size={20} />
            <span>当前宠物已满级，准许领养新蛋！</span>
          </button>
        )}
      </div>
    </Modal>
  );
};

export default PetCollectionModal;
