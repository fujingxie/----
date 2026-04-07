import React, { useEffect, useMemo, useRef, useState } from 'react';
import PetCard from './PetCard';
import PetSelectionModal from './PetSelectionModal';
import InteractionModal from './InteractionModal';
import PetCollectionModal from './PetCollectionModal';
import StudentLogModal from './StudentLogModal';
import Modal from '../Common/Modal';
import './PetParadise.css';
import { CheckCircle2, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ADOPTABLE_PET_LIBRARY, getPetImagePath, getPetNameById } from '../../api/petLibrary';
import { activateStudentPet, getAdoptionCount, graduateToNewEgg, isStudentAtMaxLevel, syncStudentCollectionProgress } from '../../lib/petCollection';
import { playActionSound } from '../../lib/sounds';
import { speakText, stopVoicePlayback } from '../../lib/voice';

const POSITIVE_EFFECT_ICONS = ['✨', '💖', '🌟', '🍗', '🎉'];
const NEGATIVE_EFFECT_ICONS = ['💩', '😵', '⚠️', '🌧️', '🥀'];
const LEVELUP_HIGHLIGHT_DURATION_MS = 1800;
const BULK_FEED_RULE = {
  name: '批量喂养',
  icon: '🍗',
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

const buildLevelUpHighlightEntry = (student, previousLevel, options = {}) => ({
  id: `${student.id}-${previousLevel}-${student.pet_level}-${options.queueId || Date.now()}`,
  studentId: student.id,
  studentName: student.name,
  petName: student.pet_name || getPetNameById(student.pet_type_id) || '课堂伙伴',
  petTypeId: student.pet_type_id,
  previousLevel,
  nextLevel: Number(student.pet_level || previousLevel),
  queueId: options.queueId || `levelup-${student.id}-${Date.now()}`,
  announceMode: options.announceMode || 'single',
});

const getPositiveValue = (value) => Math.abs(Number(value || 0));

const willStudentLevelUpByRule = (student, rule, thresholds) => {
  if (!student || !rule) {
    return false;
  }

  const nextTotalExp = Math.max(0, Number(student.total_exp || 0) + Number(rule.exp || 0));
  const currentLevel = Number(student.pet_level || 0);
  return resolvePetLevel(nextTotalExp, thresholds) > currentLevel;
};

const buildSingleLevelUpSpeech = (highlight) =>
  `恭喜${highlight.studentName}同学的${highlight.petName}升到${highlight.nextLevel}级`;

const buildBatchLevelUpSpeech = () => '恭喜以下同学宠物升级啦';

const buildSingleInteractionSpeech = (student, rule) => {
  if (!student || !rule) {
    return '';
  }

  const expValue = getPositiveValue(rule.exp);
  const coinValue = getPositiveValue(rule.coins);
  if (rule.type === 'negative') {
    return `${student.name}同学因为违反${rule.name}规则，扣除经验${expValue}，金币${coinValue}，要加油哦`;
  }

  return `恭喜${student.name}同学因为遵守${rule.name}规则，获得经验${expValue}，金币${coinValue}`;
};

const buildBatchInteractionSpeech = (rule, options = {}) => {
  if (!rule) {
    return '';
  }

  const expValue = getPositiveValue(rule.exp);
  const coinValue = getPositiveValue(rule.coins);
  if (options.mode === 'feed') {
    return `恭喜这些同学完成批量喂养，获得经验${expValue}，金币${coinValue}`;
  }

  if (rule.type === 'negative') {
    return `这些同学因为违反${rule.name}规则，扣除经验${expValue}，金币${coinValue}，要加油哦`;
  }

  return `恭喜这些同学因为遵守${rule.name}规则，获得经验${expValue}，金币${coinValue}`;
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
  lastBulkFedAt = null,
  voiceEnabled = false,
}) => {
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectingStudent, setSelectingStudent] = useState(null);
  const [interactingStudent, setInteractingStudent] = useState(null);
  const [collectionStudent, setCollectionStudent] = useState(null);
  const [logStudent, setLogStudent] = useState(null);
  const [petEffects, setPetEffects] = useState({});
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkApplyingRule, setIsBulkApplyingRule] = useState(false);
  const [isBulkAdopting, setIsBulkAdopting] = useState(false);
  const [isDailyBulkFeeding, setIsDailyBulkFeeding] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeBulkRuleType, setActiveBulkRuleType] = useState('positive');
  const [selectedBulkRuleId, setSelectedBulkRuleId] = useState(null);
  const [levelUpHighlights, setLevelUpHighlights] = useState([]);
  const [activeLevelUpIndex, setActiveLevelUpIndex] = useState(0);
  const pendingBatchLevelUpRef = useRef(null);
  const spokenLevelUpQueueIdsRef = useRef(new Set());
  const hasBatchLevelUpOverview = levelUpHighlights.length > 1;
  const totalLevelUpSlides = hasBatchLevelUpOverview ? levelUpHighlights.length + 1 : levelUpHighlights.length;
  const isBatchLevelUpOverview = hasBatchLevelUpOverview && activeLevelUpIndex === 0;
  const activeLevelUpHighlight = hasBatchLevelUpOverview
    ? levelUpHighlights[Math.max(0, activeLevelUpIndex - 1)] || null
    : levelUpHighlights[activeLevelUpIndex] || null;
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
      setSelectedBulkRuleId(null);
      setActiveBulkRuleType('positive');
    }
  }, [isBulkMode]);

  useEffect(() => {
    setSelectedBulkRuleId(null);
  }, [activeBulkRuleType]);

  useEffect(() => {
    const pendingBatch = pendingBatchLevelUpRef.current;
    if (!pendingBatch) {
      return;
    }

    const currentStudentsById = new Map(students.map((student) => [student.id, student]));
    const hasResolvedChange = pendingBatch.studentIds.some((studentId) => {
      const currentStudent = currentStudentsById.get(studentId);
      const beforeStudent = pendingBatch.beforeById[studentId];
      if (!currentStudent || !beforeStudent) {
        return false;
      }

      return (
        Number(currentStudent.pet_level || 0) !== beforeStudent.level
        || Number(currentStudent.total_exp || 0) !== beforeStudent.totalExp
        || Number(currentStudent.coins || 0) !== beforeStudent.coins
        || String(currentStudent.pet_condition || '') !== beforeStudent.petCondition
      );
    });

    if (!hasResolvedChange) {
      return;
    }

    const queueId = `levelup-batch-${Date.now()}`;
    let upgrades = pendingBatch.studentIds
      .map((studentId) => {
        const currentStudent = currentStudentsById.get(studentId);
        const beforeStudent = pendingBatch.beforeById[studentId];
        if (!currentStudent || !beforeStudent) {
          return null;
        }

        return Number(currentStudent.pet_level || 0) > beforeStudent.level
          ? buildLevelUpHighlightEntry(currentStudent, beforeStudent.level, {
              queueId,
              announceMode: 'batch',
            })
          : null;
      })
      .filter(Boolean);

    pendingBatchLevelUpRef.current = null;
    if (upgrades.length > 0) {
      if (upgrades.length === 1) {
        upgrades = upgrades.map((item) => ({ ...item, announceMode: 'single' }));
      }
      setLevelUpHighlights((prev) => [...prev, ...upgrades]);
    }
  }, [students]);

  useEffect(() => {
    if (levelUpHighlights.length === 0) {
      setActiveLevelUpIndex(0);
      spokenLevelUpQueueIdsRef.current.clear();
      return undefined;
    }

    const activeHighlight = activeLevelUpHighlight;
    if (!activeHighlight) {
      return undefined;
    }

    playActionSound('adopt');
    confetti({
      particleCount: 120,
      spread: 72,
      origin: { y: 0.52 },
      colors: ['#f59e0b', '#f97316', '#facc15', '#fde68a'],
    });

    if (voiceEnabled) {
      if (isBatchLevelUpOverview && activeHighlight.announceMode === 'batch') {
        if (!spokenLevelUpQueueIdsRef.current.has(activeHighlight.queueId)) {
          spokenLevelUpQueueIdsRef.current.add(activeHighlight.queueId);
          speakText(buildBatchLevelUpSpeech());
        }
      } else if (activeHighlight.announceMode === 'single') {
        speakText(buildSingleLevelUpSpeech(activeHighlight));
      }
    }

    if (totalLevelUpSlides === 1) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setActiveLevelUpIndex((prev) => {
        if (prev >= totalLevelUpSlides - 1) {
          setLevelUpHighlights([]);
          return 0;
        }

        return prev + 1;
      });
    }, LEVELUP_HIGHLIGHT_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeLevelUpHighlight, activeLevelUpIndex, isBatchLevelUpOverview, levelUpHighlights, totalLevelUpSlides, voiceEnabled]);

  useEffect(() => () => {
    stopVoicePlayback();
  }, []);

  const hasUsedDailyBulkFeed = useMemo(() => {
    if (!currentClass?.id || !lastBulkFedAt) {
      return false;
    }

    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const lastFedDateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(lastBulkFedAt));

    return lastFedDateKey === todayKey;
  }, [currentClass?.id, lastBulkFedAt]);

  const bulkRules = useMemo(
    () => rules.filter((rule) => rule.type === activeBulkRuleType),
    [activeBulkRuleType, rules],
  );
  const selectedBulkRule = useMemo(
    () => rules.find((rule) => rule.id === selectedBulkRuleId) || null,
    [rules, selectedBulkRuleId],
  );

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
    if (isBulkApplyingRule || feedableStudents.length === 0) {
      return;
    }

    setIsBulkMode(true);
  };

  const handleDailyBulkFeed = async () => {
    if (!currentClass?.id || feedableStudents.length === 0 || isDailyBulkFeeding || hasUsedDailyBulkFeed) {
      return;
    }

    const confirmed = await onRequestConfirm?.({
      title: '批量喂养',
      message: `将为 ${feedableStudents.length} 位已拥有宠物的学生统一执行一次批量喂养，每天只能使用一次。确认继续吗？`,
      confirmLabel: '确认喂养',
      cancelLabel: '取消',
      tone: 'default',
    });

    if (!confirmed) {
      return;
    }

    setIsDailyBulkFeeding(true);

    try {
      const willTriggerLevelUp = feedableStudents.some((student) =>
        willStudentLevelUpByRule(student, BULK_FEED_RULE, levelThresholds),
      );
      pendingBatchLevelUpRef.current = {
        studentIds: feedableStudents.map((student) => student.id),
        beforeById: Object.fromEntries(
          feedableStudents.map((student) => [
            student.id,
            {
              level: Number(student.pet_level || 0),
              totalExp: Number(student.total_exp || 0),
              coins: Number(student.coins || 0),
              petCondition: String(student.pet_condition || ''),
            },
          ]),
        ),
      };
      feedableStudents.forEach((student) => {
        triggerPetEffect(student.id, 'positive', BULK_FEED_RULE);
      });
      if (!willTriggerLevelUp) {
        playActionSound('positive');
      }
      await onFeedStudentsBatch(
        feedableStudents.map((student) => student.id),
        BULK_FEED_RULE,
        { dailyBulkFeed: true },
      );
      if (voiceEnabled && !willTriggerLevelUp) {
        speakText(buildBatchInteractionSpeech(BULK_FEED_RULE, { mode: 'feed' }));
      }
    } catch (error) {
      pendingBatchLevelUpRef.current = null;
      throw error;
    } finally {
      setIsDailyBulkFeeding(false);
    }
  };

  const handleBulkFeedByRule = async (rule = selectedBulkRule) => {
    if (selectedStudentIds.length === 0 || isBulkApplyingRule) {
      return;
    }

    const selectedStudents = feedableStudents.filter((student) => selectedStudentIds.includes(student.id));

    if (selectedStudents.length === 0) {
      return;
    }

    setIsBulkApplyingRule(true);

    try {
      const willTriggerLevelUp = selectedStudents.some((student) =>
        willStudentLevelUpByRule(student, rule, levelThresholds),
      );
      pendingBatchLevelUpRef.current = {
        studentIds: selectedStudentIds,
        beforeById: Object.fromEntries(
          selectedStudents.map((student) => [
            student.id,
            {
              level: Number(student.pet_level || 0),
              totalExp: Number(student.total_exp || 0),
              coins: Number(student.coins || 0),
              petCondition: String(student.pet_condition || ''),
            },
          ]),
        ),
      };
      selectedStudents.forEach((student) => {
        triggerPetEffect(student.id, rule.type, rule);
      });
      if (!willTriggerLevelUp) {
        playActionSound(rule.type === 'negative' ? 'negative' : 'positive');
      }
      await onFeedStudentsBatch(selectedStudentIds, rule);
      if (voiceEnabled && !willTriggerLevelUp) {
        speakText(buildBatchInteractionSpeech(rule));
      }

      setSelectedStudentIds([]);
      setIsBulkMode(false);
    } catch (error) {
      pendingBatchLevelUpRef.current = null;
      throw error;
    } finally {
      setIsBulkApplyingRule(false);
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
        const randomPet = ADOPTABLE_PET_LIBRARY[Math.floor(Math.random() * ADOPTABLE_PET_LIBRARY.length)];
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
              onClick={handleBulkFeed}
              type="button"
            >
              批量互动
            </button>
          )}
          {feedableStudents.length > 0 && !hasUsedDailyBulkFeed && (
            <button
              className="bulk-adopt-btn"
              onClick={handleDailyBulkFeed}
              disabled={isDailyBulkFeeding}
              type="button"
            >
              {isDailyBulkFeeding ? '喂养中...' : '批量喂养'}
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
              onOpenLog={setLogStudent}
              onActivate={handlePetPrimaryAction}
              isSelectable={false}
              isSelected={selectedStudentIds.includes(student.id)}
              onToggleSelect={toggleSelectStudent}
            />
          ))}
        </div>
      </section>

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

      <Modal
        isOpen={isBulkMode && feedableStudents.length > 0}
        onClose={() => setIsBulkMode(false)}
        title="批量互动"
        contentClassName="bulk-interaction-modal"
        bodyClassName="bulk-interaction-modal-body"
      >
        <div className="bulk-interaction-shell">
          <section className="bulk-interaction-panel rules">
            <div className="bulk-interaction-panel-head">
              <h4>选择规则</h4>
              <p>先选一条规则，再从右侧勾选学生。</p>
            </div>
            <div className="bulk-interaction-tabs">
              <button
                className={activeBulkRuleType === 'positive' ? 'active' : ''}
                onClick={() => setActiveBulkRuleType('positive')}
                type="button"
              >
                表现活跃
              </button>
              <button
                className={activeBulkRuleType === 'negative' ? 'active negative' : ''}
                onClick={() => setActiveBulkRuleType('negative')}
                type="button"
              >
                需要改进
              </button>
            </div>
            <div className="bulk-rule-list">
              {bulkRules.length === 0 ? (
                <div className="bulk-empty-hint">当前没有这类规则，请先去系统设置添加。</div>
              ) : (
                bulkRules.map((rule) => (
                  <button
                    key={rule.id}
                    className={`bulk-rule-card ${selectedBulkRuleId === rule.id ? 'active' : ''} ${rule.type}`}
                    onClick={() => setSelectedBulkRuleId(rule.id)}
                    type="button"
                  >
                    <div className="bulk-rule-icon">{rule.icon || '⭐'}</div>
                    <div className="bulk-rule-copy">
                      <strong>{rule.name}</strong>
                      <span>{rule.exp > 0 ? '+' : ''}{rule.exp} EXP · {rule.coins > 0 ? '+' : ''}{rule.coins} 金币</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="bulk-interaction-panel students">
            <div className="bulk-interaction-panel-head">
              <h4>选择学生</h4>
              <p>这里只显示已经拥有宠物的学生。</p>
            </div>
            <div className="bulk-student-list">
              {feedableStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <button
                    key={student.id}
                    className={`bulk-student-row ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleSelectStudent(student)}
                    type="button"
                  >
                    <span className="bulk-student-name">{student.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="bulk-feed-toolbar inline">
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
            onClick={() => handleBulkFeedByRule()}
            disabled={!selectedBulkRule || selectedStudentIds.length === 0 || isBulkApplyingRule}
            type="button"
          >
            {isBulkApplyingRule ? '应用中...' : '批量互动'}
          </button>
        </div>
      </Modal>

      {interactingStudent && (
        <InteractionModal 
          key={interactingStudent.id}
          isOpen={!!interactingStudent}
          onClose={() => setInteractingStudent(null)}
          student={interactingStudent}
          rules={rules}
          onInteract={async (rule) => {
            const willTriggerLevelUp = willStudentLevelUpByRule(interactingStudent, rule, levelThresholds);
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
            if (!willTriggerLevelUp) {
              playActionSound(rule.type === 'negative' ? 'negative' : 'positive');
            }
            await onInteractStudent(interactingStudent, rule, updated);
            if (voiceEnabled && !willTriggerLevelUp) {
              speakText(buildSingleInteractionSpeech(interactingStudent, rule));
            }
            if (Number(updated.pet_level || 0) > Number(interactingStudent.pet_level || 0)) {
              setLevelUpHighlights((prev) => [
                ...prev,
                buildLevelUpHighlightEntry(updated, Number(interactingStudent.pet_level || 0), {
                  queueId: `levelup-single-${updated.id}-${Date.now()}`,
                  announceMode: 'single',
                }),
              ]);
            }
            setInteractingStudent(null);
          }}
        />
      )}

      {levelUpHighlights.length > 0 && activeLevelUpHighlight && (
        <div className="pet-levelup-overlay" role="dialog" aria-modal="true">
          <div className="pet-levelup-backdrop" />
          <div className="pet-levelup-spotlight" />
          <div className="pet-levelup-card glass-card">
            <span className="pet-levelup-kicker">LEVEL UP</span>
            {isBatchLevelUpOverview ? (
              <>
                <h3>恭喜以下同学宠物升级啦！</h3>
                <p>这一轮一共有 {levelUpHighlights.length} 只宠物完成升级，马上进入逐个展示。</p>
                <div className="pet-levelup-overview-list">
                  {levelUpHighlights.map((highlight) => (
                    <div key={highlight.id} className="pet-levelup-overview-item">
                      <strong>{highlight.studentName}同学</strong>
                      <span>{highlight.petName} · Lv.{highlight.nextLevel}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h3>{activeLevelUpHighlight.studentName} 的宠物升级啦！</h3>
                <p>
                  {activeLevelUpHighlight.petName}
                  {' '}从 Lv.{activeLevelUpHighlight.previousLevel}
                  {' '}升到 Lv.{activeLevelUpHighlight.nextLevel}
                </p>
                <div className="pet-levelup-hero">
                  <div className="pet-levelup-ring ring-one" />
                  <div className="pet-levelup-ring ring-two" />
                  <img
                    src={getPetImagePath(
                      activeLevelUpHighlight.petTypeId,
                      activeLevelUpHighlight.nextLevel,
                    )}
                    alt={activeLevelUpHighlight.petName}
                    className="pet-levelup-image"
                  />
                </div>
                <div className="pet-levelup-badge-row">
                  <span className="pet-levelup-badge old">Lv.{activeLevelUpHighlight.previousLevel}</span>
                  <span className="pet-levelup-arrow">→</span>
                  <span className="pet-levelup-badge new">Lv.{activeLevelUpHighlight.nextLevel}</span>
                </div>
              </>
            )}
            <div className="pet-levelup-footer">
              <span>{activeLevelUpIndex + 1} / {totalLevelUpSlides}</span>
              <button
                className="pet-levelup-skip"
                onClick={() => {
                  stopVoicePlayback();
                  setLevelUpHighlights([]);
                  setActiveLevelUpIndex(0);
                }}
                type="button"
              >
                {totalLevelUpSlides === 1 ? '完成' : '跳过全部'}
              </button>
            </div>
          </div>
        </div>
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

      {logStudent && (
        <StudentLogModal
          isOpen={!!logStudent}
          onClose={() => setLogStudent(null)}
          student={logStudent}
          currentClass={currentClass}
          onInteraction={(student) => {
            setLogStudent(null);
            setInteractingStudent(student);
          }}
        />
      )}
    </div>
  );
};

export default PetParadise;
