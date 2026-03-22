import React, { useEffect, useMemo, useState } from 'react';
import PetCard from './PetCard';
import PetSelectionModal from './PetSelectionModal';
import InteractionModal from './InteractionModal';
import PetCollectionModal from './PetCollectionModal';
import './PetParadise.css';
import { CheckCircle2, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PET_LIBRARY } from '../../api/petLibrary';
import { activateStudentPet, getAdoptionCount, graduateToNewEgg, isStudentAtMaxLevel, syncStudentCollectionProgress } from '../../lib/petCollection';
import { playActionSound } from '../../lib/sounds';

const POSITIVE_EFFECT_ICONS = ['✨', '💖', '🌟', '🍗', '🎉'];
const NEGATIVE_EFFECT_ICONS = ['💩', '😵', '⚠️', '🌧️', '🥀'];
const BULK_FEED_RULE = {
  id: 'bulk-feed',
  name: '批量喂养',
  exp: 1,
  coins: 0,
  type: 'positive',
};

const resolvePetLevel = (totalExp, thresholds) => {
  let nextLevel = 1;

  thresholds.forEach((threshold, index) => {
    if (totalExp >= threshold) {
      nextLevel = index + 2;
    }
  });

  return nextLevel;
};

const PetParadise = ({
  currentClass,
  students,
  logs,
  onImportStudents,
  onActivatePet,
  onGraduatePet,
  onInteractStudent,
  onFeedStudentsBatch,
  onRequestConfirm,
  rules,
  levelThresholds,
  petConditionConfig,
}) => {
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectingStudent, setSelectingStudent] = useState(null);
  const [interactingStudent, setInteractingStudent] = useState(null);
  const [collectionStudent, setCollectionStudent] = useState(null);
  const [petEffects, setPetEffects] = useState({});
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkFeeding, setIsBulkFeeding] = useState(false);
  const [isBulkAdopting, setIsBulkAdopting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const activePetsCount = students.filter((student) => student.pet_status !== 'egg').length;
  const eggStudents = useMemo(() => students.filter((student) => student.pet_status === 'egg'), [students]);
  const totalAdoptions = students.reduce((sum, student) => sum + getAdoptionCount(student), 0);
  const classCoins = students.reduce((sum, student) => sum + (student.coins || 0), 0);
  const totalRewards = students.reduce((sum, student) => sum + (student.reward_count || 0), 0);
  const feedableStudents = useMemo(() => students.filter((student) => student.pet_status !== 'egg'), [students]);
  const conditionSummary = useMemo(
    () =>
      students.reduce(
        (summary, student) => {
          if (student.pet_status === 'egg') {
            return summary;
          }

          summary[student.pet_condition || 'healthy'] += 1;
          return summary;
        },
        { healthy: 0, hungry: 0, weak: 0, sleeping: 0 },
      ),
    [students],
  );
  const filteredStudents = useMemo(() => {
    if (activeFilter === 'attention') {
      return students.filter((student) => student.pet_status !== 'egg' && student.pet_condition !== 'healthy');
    }

    if (activeFilter === 'sleeping') {
      return students.filter((student) => student.pet_status !== 'egg' && student.pet_condition === 'sleeping');
    }

    return students;
  }, [activeFilter, students]);
  const achievements = useMemo(() => {
    const rewardMaster = totalRewards >= 10;
    const firstGraduate = students.some((student) => isStudentAtMaxLevel(student, levelThresholds))
      || (logs || []).some((log) => log.actionType === '宠物毕业');
    const adoptionCollector = totalAdoptions >= 20;

    return [
      {
        id: 'reward-master',
        title: '奖励达人',
        description: '累计奖励 10 次',
        unlocked: rewardMaster,
        progress: `${Math.min(totalRewards, 10)}/10`,
      },
      {
        id: 'first-graduate',
        title: '首次满级',
        description: '班级诞生第一只满级宠物',
        unlocked: firstGraduate,
        progress: firstGraduate ? '已达成' : '进行中',
      },
      {
        id: 'adoption-collector',
        title: '领养收藏家',
        description: '班级累计领养 20 只',
        unlocked: adoptionCollector,
        progress: `${Math.min(totalAdoptions, 20)}/20`,
      },
    ];
  }, [levelThresholds, logs, students, totalAdoptions, totalRewards]);

  useEffect(() => {
    const feedableIds = new Set(feedableStudents.map((student) => student.id));
    setSelectedStudentIds((prev) => prev.filter((id) => feedableIds.has(id)));
  }, [feedableStudents]);

  useEffect(() => {
    if (!isBulkMode) {
      setSelectedStudentIds([]);
    }
  }, [isBulkMode]);

  const handlePetPrimaryAction = async (student) => {
    if (student.pet_status === 'egg') {
      setSelectingStudent(student);
      return;
    }

    if (isStudentAtMaxLevel(student, levelThresholds)) {
      setCollectionStudent(student);
      return;
    }

    setInteractingStudent(student);
  };

  const handleImport = async () => {
    const names = importText.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    await onImportStudents(names);
    setImportText('');
    setIsImporting(false);
  };

  const triggerPetEffect = (studentId, type, rule) => {
    const icons = type === 'positive' ? POSITIVE_EFFECT_ICONS : NEGATIVE_EFFECT_ICONS;
    const nextEffect = {
      type,
      deltaExp: rule.exp,
      icons: icons.map((icon, index) => ({
        id: `${studentId}-${type}-${Date.now()}-${index}`,
        icon,
      })),
    };

    setPetEffects((prev) => ({
      ...prev,
      [studentId]: nextEffect,
    }));

    window.setTimeout(() => {
      setPetEffects((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }, 1500);
  };

  const toggleSelectStudent = (student) => {
    if (student.pet_status === 'egg') {
      return;
    }

    setSelectedStudentIds((prev) =>
      prev.includes(student.id) ? prev.filter((id) => id !== student.id) : [...prev, student.id],
    );
  };

  const handleSelectAllFeedable = () => {
    const allFeedableIds = feedableStudents.map((student) => student.id);
    setSelectedStudentIds((prev) =>
      prev.length === allFeedableIds.length ? [] : allFeedableIds,
    );
  };

  const handleBulkFeed = async () => {
    if (selectedStudentIds.length === 0 || isBulkFeeding) {
      return;
    }

    const selectedStudents = feedableStudents.filter((student) => selectedStudentIds.includes(student.id));

    if (selectedStudents.length === 0) {
      return;
    }

    setIsBulkFeeding(true);

    try {
      selectedStudents.forEach((student) => {
        triggerPetEffect(student.id, 'positive', BULK_FEED_RULE);
      });
      playActionSound('positive');
      await onFeedStudentsBatch(selectedStudentIds);

      setSelectedStudentIds([]);
      setIsBulkMode(false);
    } finally {
      setIsBulkFeeding(false);
    }
  };

  const handleBulkAdopt = async () => {
    if (eggStudents.length === 0 || isBulkAdopting) {
      return;
    }

    const confirmed = await onRequestConfirm?.({
      title: '批量领养宠物',
      message: `批量领养会为 ${eggStudents.length} 个神秘蛋随机选择宠物，确认继续吗？`,
      confirmLabel: '确认领养',
    });

    if (!confirmed) {
      return;
    }

    setIsBulkAdopting(true);

    try {
      for (const student of eggStudents) {
        const randomPet = PET_LIBRARY[Math.floor(Math.random() * PET_LIBRARY.length)];
        await onActivatePet(activateStudentPet(student, randomPet));
      }

      playActionSound('adopt');
      confetti({
        particleCount: Math.min(220, Math.max(90, eggStudents.length * 18)),
        spread: 82,
        origin: { y: 0.58 },
        colors: ['#6366f1', '#10b981', '#f59e0b'],
      });
      setActiveFilter('all');
    } finally {
      setIsBulkAdopting(false);
    }
  };

  if (!currentClass) {
    return (
      <div className="empty-state">
        <div className="empty-illustration">🏫</div>
        <h2>请先选择或创建一个班级</h2>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-illustration">🥚</div>
        <h2>此班级暂无学生</h2>
        <p>点击下方按钮批量导入学生名单，开启养宠之旅</p>
        <button className="import-btn-large" onClick={() => setIsImporting(true)} type="button">
          <UserPlus size={20} />
          <span>批量导入学生</span>
        </button>

        {isImporting && (
          <div className="import-overlay glass-card">
            <h3>批量导入学生</h3>
            <textarea 
              placeholder="请输入学生姓名，每行一个..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="glass-input"
              rows={8}
            />
            <div className="import-actions">
              <button onClick={() => setIsImporting(false)} type="button">取消</button>
              <button className="confirm-btn" onClick={handleImport} type="button">确认入库</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pet-paradise-page">
      <section className="pet-paradise-hero glass-card">
        <div className="pet-paradise-hero-copy">
          <span className="pet-paradise-eyebrow">{currentClass.name}</span>
          <h2>宠物乐园正在营业</h2>
          <p>为每位学生准备一只课堂伙伴，让奖励、互动和成长都能被看见。</p>
        </div>

        <div className="pet-paradise-hero-actions">
          {eggStudents.length > 0 && (
            <button
              className="bulk-adopt-btn"
              onClick={handleBulkAdopt}
              disabled={isBulkAdopting}
              type="button"
            >
              {isBulkAdopting ? '领养中...' : '批量领养'}
            </button>
          )}
          {feedableStudents.length > 0 && (
            <button
              className={`bulk-mode-btn ${isBulkMode ? 'active' : ''}`}
              onClick={() => setIsBulkMode((prev) => !prev)}
              type="button"
            >
              {isBulkMode ? '退出批量' : '批量喂养'}
            </button>
          )}
          <button className="import-btn-large compact" onClick={() => setIsImporting(true)} type="button">
            <UserPlus size={18} />
            <span>继续导入学生</span>
          </button>
        </div>

        <div className="pet-paradise-stats">
          <div className="pet-stat-card">
            <span className="pet-stat-label">班级人数</span>
            <strong>{students.length}</strong>
          </div>
          <div className="pet-stat-card">
            <span className="pet-stat-label">已唤醒宠物</span>
            <strong>{activePetsCount}</strong>
          </div>
          <div className="pet-stat-card">
            <span className="pet-stat-label">累计领养</span>
            <strong>{totalAdoptions}</strong>
          </div>
          <div className="pet-stat-card">
            <span className="pet-stat-label">班级金币</span>
            <strong>{classCoins}</strong>
          </div>
          <div className="pet-stat-card status healthy">
            <span className="pet-stat-label">健康中</span>
            <strong>{conditionSummary.healthy}</strong>
          </div>
          <div className="pet-stat-card status hungry">
            <span className="pet-stat-label">即将饥饿</span>
            <strong>{conditionSummary.hungry}</strong>
          </div>
          <div className="pet-stat-card status weak">
            <span className="pet-stat-label">虚弱中</span>
            <strong>{conditionSummary.weak}</strong>
          </div>
          <div className="pet-stat-card status sleeping">
            <span className="pet-stat-label">休眠中</span>
            <strong>{conditionSummary.sleeping}</strong>
          </div>
        </div>

        <div className="pet-achievement-row">
          {achievements.map((achievement) => (
            <article
              key={achievement.id}
              className={`pet-achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="pet-achievement-kicker">{achievement.unlocked ? '已达成' : '成长成就'}</span>
              <strong>{achievement.title}</strong>
              <p>{achievement.description}</p>
              <span className="pet-achievement-progress">{achievement.progress}</span>
            </article>
          ))}
        </div>
      </section>

      {isImporting && (
        <section className="import-overlay glass-card inline-import-panel">
          <div className="inline-import-head">
            <div>
              <h3>批量导入学生</h3>
              <p>支持每行一个姓名，导入后会自动出现在宠物乐园中。</p>
            </div>
          </div>
          <textarea
            placeholder="请输入学生姓名，每行一个..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="glass-input"
            rows={8}
          />
          <div className="import-actions">
            <button onClick={() => setIsImporting(false)} type="button">取消</button>
            <button className="confirm-btn" onClick={handleImport} type="button">确认入库</button>
          </div>
        </section>
      )}

      <section className="pet-paradise-grid-wrap glass-card">
        <div className="pet-filter-row">
          <button
            className={`pet-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
            type="button"
          >
            全部
          </button>
          <button
            className={`pet-filter-chip ${activeFilter === 'attention' ? 'active' : ''}`}
            onClick={() => setActiveFilter('attention')}
            type="button"
          >
            需喂养
          </button>
          <button
            className={`pet-filter-chip ${activeFilter === 'sleeping' ? 'active' : ''}`}
            onClick={() => setActiveFilter('sleeping')}
            type="button"
          >
            已休眠
          </button>
        </div>
        <div className="pet-paradise-grid">
          {filteredStudents.map(student => (
            <PetCard 
              key={student.id} 
              student={student} 
              adoptionCount={getAdoptionCount(student)}
              isReadyForNewPet={isStudentAtMaxLevel(student, levelThresholds)}
              levelThresholds={levelThresholds}
              petConditionConfig={petConditionConfig}
              effect={petEffects[student.id] || null}
              onOpenCollection={setCollectionStudent}
              onActivate={handlePetPrimaryAction}
              isSelectable={isBulkMode && student.pet_status !== 'egg'}
              isSelected={selectedStudentIds.includes(student.id)}
              onToggleSelect={toggleSelectStudent}
            />
          ))}
        </div>
      </section>

      {isBulkMode && feedableStudents.length > 0 && (
        <div className="bulk-feed-toolbar">
          <div className="bulk-feed-summary">
            <span className="bulk-feed-dot" />
            <span>已选</span>
            <strong>{selectedStudentIds.length}</strong>
            <span>人</span>
          </div>
          <button className="bulk-feed-select-all" onClick={handleSelectAllFeedable} type="button">
            <CheckCircle2 size={18} />
            <span>{selectedStudentIds.length === feedableStudents.length ? '取消全选' : '全选可用宠物'}</span>
          </button>
          <button className="bulk-feed-cancel" onClick={() => setIsBulkMode(false)} type="button">
            取消
          </button>
          <button
            className="bulk-feed-action"
            onClick={handleBulkFeed}
            disabled={selectedStudentIds.length === 0 || isBulkFeeding}
            type="button"
          >
            {isBulkFeeding ? '喂养中...' : '批量喂养'}
          </button>
        </div>
      )}

      {selectingStudent && (
        <PetSelectionModal 
          key={selectingStudent.id}
          isOpen={!!selectingStudent}
          onClose={() => setSelectingStudent(null)}
          student={selectingStudent}
          onConfirm={async (updatedStudent) => {
            playActionSound('adopt');
            await onActivatePet(updatedStudent);
            setSelectingStudent(null);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#10b981', '#f59e0b']
            });
          }}
        />
      )}

      {interactingStudent && (
        <InteractionModal 
          key={interactingStudent.id}
          isOpen={!!interactingStudent}
          onClose={() => setInteractingStudent(null)}
          student={interactingStudent}
          rules={rules}
          onInteract={async (rule) => {
            const nextPetPoints = Math.max(0, (interactingStudent.pet_points || 0) + rule.exp);
            const nextCoins = Math.max(0, (interactingStudent.coins || 0) + rule.coins);
            const nextTotalExp = Math.max(0, (interactingStudent.total_exp || 0) + rule.exp);
            const nextTotalCoins = Math.max(0, (interactingStudent.total_coins || 0) + rule.coins);
            const updated = {
              ...interactingStudent,
              pet_points: nextPetPoints,
              coins: nextCoins,
              total_exp: nextTotalExp,
              total_coins: nextTotalCoins,
              reward_count:
                (interactingStudent.reward_count || 0) + (rule.type === 'positive' ? 1 : 0),
              pet_level: resolvePetLevel(nextTotalExp, levelThresholds),
            };

            if (rule.type === 'positive') {
              updated.last_fed_at = new Date().toISOString();
              updated.last_decay_at = updated.last_fed_at;
              updated.pet_condition = 'healthy';
              updated.pet_condition_locked_at = null;
            }

            updated.pet_collection = syncStudentCollectionProgress(updated);

            triggerPetEffect(interactingStudent.id, rule.type, rule);
            playActionSound(rule.type === 'negative' ? 'negative' : 'positive');
            await onInteractStudent(interactingStudent, rule, updated);
            setInteractingStudent(null);
          }}
        />
      )}

      {collectionStudent && (
        <PetCollectionModal
          isOpen={!!collectionStudent}
          onClose={() => setCollectionStudent(null)}
          student={collectionStudent}
          collection={collectionStudent.pet_collection || []}
          canAdoptNewEgg={isStudentAtMaxLevel(collectionStudent, levelThresholds)}
          onAdoptNewEgg={async () => {
            const graduatedStudent = graduateToNewEgg(collectionStudent);
            playActionSound('adopt');
            await onGraduatePet(collectionStudent, graduatedStudent);
            setCollectionStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default PetParadise;
