import React, { useState } from 'react';
import PetCard from './PetCard';
import PetSelectionModal from './PetSelectionModal';
import InteractionModal from './InteractionModal';
import './PetParadise.css';
import { UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

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
  onInteractStudent,
  rules,
  levelThresholds,
}) => {
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectingStudent, setSelectingStudent] = useState(null);
  const [interactingStudent, setInteractingStudent] = useState(null);

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
    <div className="pet-paradise-grid">
      {students.map(student => (
        <PetCard 
          key={student.id} 
          student={student} 
          onActivate={(s) => {
            if (s.pet_status === 'egg') {
              setSelectingStudent(s);
            } else {
              setInteractingStudent(s);
            }
          }} 
        />
      ))}

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

            await onInteractStudent(interactingStudent, rule, updated);
            setInteractingStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default PetParadise;
