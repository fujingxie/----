import React, { useMemo, useState } from 'react';
import Modal from '../Common/Modal';
import { Sparkles } from 'lucide-react';
import { getPetImagePath, getPetNameById, PET_IMAGE_FALLBACK, PET_LIBRARY } from '../../api/petLibrary';
import './PetCollectionModal.css';

const PetCollectionModal = ({
  isOpen,
  onClose,
  student,
  collection = [],
  canAdoptNewEgg = false,
  onAdoptNewEgg,
}) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PET_IMAGE_FALLBACK;
  };

  const allEntries = useMemo(() => {
    const normalizedCollection = collection.map((entry) => ({
      ...entry,
      visualType: entry.status === 'active-egg' ? 'egg' : 'owned',
      key: entry.id,
    }));
    const ownedPetIds = new Set(
      normalizedCollection
        .map((entry) => entry.pet_type_id)
        .filter(Boolean),
    );
    const lockedEntries = PET_LIBRARY
      .filter((pet) => !ownedPetIds.has(pet.id))
      .map((pet) => ({
        id: `locked-${pet.id}`,
        key: `locked-${pet.id}`,
        pet_type_id: pet.id,
        pet_name: pet.name,
        pet_level: 0,
        status: 'locked',
        visualType: 'locked',
      }));

    return [...normalizedCollection, ...lockedEntries];
  }, [collection]);

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') {
      return allEntries;
    }

    return allEntries.filter((entry) => {
      if (activeFilter === 'graduated') {
        return entry.status === 'graduated';
      }
      if (activeFilter === 'active') {
        return entry.status === 'active';
      }
      if (activeFilter === 'egg') {
        return entry.status === 'active-egg';
      }
      if (activeFilter === 'locked') {
        return entry.status === 'locked';
      }
      return true;
    });
  }, [activeFilter, allEntries]);

  const filters = [
    { id: 'all', label: '全部', count: allEntries.length },
    { id: 'graduated', label: '已毕业', count: allEntries.filter((entry) => entry.status === 'graduated').length },
    { id: 'active', label: '出战中', count: allEntries.filter((entry) => entry.status === 'active').length },
    { id: 'egg', label: '神秘蛋', count: allEntries.filter((entry) => entry.status === 'active-egg').length },
    { id: 'locked', label: '未解锁', count: allEntries.filter((entry) => entry.status === 'locked').length },
  ];

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
        <div className="pet-collection-filters">
          {filters.map((filter) => (
            <button
              key={filter.id}
              className={`pet-collection-filter ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
              type="button"
            >
              <span>{filter.label}</span>
              <strong>{filter.count}</strong>
            </button>
          ))}
        </div>
        <div className="pet-collection-grid">
          {filteredEntries.map((entry) => {
            const isEgg = entry.status === 'active-egg';
            const isLocked = entry.status === 'locked';
            const statusLabel =
              entry.status === 'graduated'
                ? '已毕业'
                : entry.status === 'active'
                  ? '出战中'
                  : entry.status === 'active-egg'
                    ? '神秘蛋'
                    : '未解锁';

            return (
              <article key={entry.key} className={`pet-collection-card ${entry.status}`}>
                <span className="pet-collection-status">{statusLabel}</span>
                <span className="pet-collection-level">Lv.{entry.pet_level || 0}</span>
                <div className="pet-collection-visual">
                  <img
                    src={
                      isEgg
                        ? PET_IMAGE_FALLBACK
                        : getPetImagePath(entry.pet_type_id, entry.pet_level || 1)
                    }
                    alt={entry.pet_name}
                    onError={handleImageError}
                  />
                </div>
                <strong>{entry.pet_name || getPetNameById(entry.pet_type_id)}</strong>
                <span>{isLocked ? '等待解锁' : isEgg ? '神秘蛋' : getPetNameById(entry.pet_type_id)}</span>
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
