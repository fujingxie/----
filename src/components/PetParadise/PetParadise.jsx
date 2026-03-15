import React, { useState } from 'react';
import PetCard from './PetCard';
import PetSelectionModal from './PetSelectionModal';
import InteractionModal from './InteractionModal';
import PetCollectionModal from './PetCollectionModal';
import './PetParadise.css';
import { UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAdoptionCount, graduateToNewEgg, isStudentAtMaxLevel, syncStudentCollectionProgress } from '../../lib/petCollection';

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
  onImportStudents,
  onActivatePet,
  onGraduatePet,
  onInteractStudent,
  rules,
  levelThresholds,
}) => {
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectingStudent, setSelectingStudent] = useState(null);
  const [interactingStudent, setInteractingStudent] = useState(null);
  const [collectionStudent, setCollectionStudent] = useState(null);
  const activePetsCount = students.filter((student) => student.pet_status !== 'egg').length;
  const totalAdoptions = students.reduce((sum, student) => sum + getAdoptionCount(student), 0);
  const classCoins = students.reduce((sum, student) => sum + (student.coins || 0), 0);

  const handlePetPrimaryAction = async (student) => {
    if (student.pet_status === 'egg') {
      setSelectingStudent(student);
      return;
    }

    if (isStudentAtMaxLevel(student, levelThresholds)) {
      const graduatedStudent = graduateToNewEgg(student);
      await onGraduatePet(student, graduatedStudent);
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
        <div className="pet-paradise-grid">
          {students.map(student => (
            <PetCard 
              key={student.id} 
              student={student} 
              adoptionCount={getAdoptionCount(student)}
              isReadyForNewPet={isStudentAtMaxLevel(student, levelThresholds)}
              onOpenCollection={setCollectionStudent}
              onActivate={handlePetPrimaryAction}
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
            const nextTotalExp = (interactingStudent.total_exp || 0) + Math.max(rule.exp, 0);
            const nextTotalCoins = (interactingStudent.total_coins || 0) + Math.max(rule.coins, 0);
            const updated = {
              ...interactingStudent,
              pet_points: nextPetPoints,
              coins: nextCoins,
              total_exp: nextTotalExp,
              total_coins: nextTotalCoins,
              pet_level: resolvePetLevel(nextTotalExp, levelThresholds),
            };
            updated.pet_collection = syncStudentCollectionProgress(updated);

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
        />
      )}
    </div>
  );
};

export default PetParadise;
