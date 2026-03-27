import React, { useState } from 'react';
import './Toolbox.css';
import { BookOpen, Coffee, Lock, Map, Mic, PawPrint, Timer, Trophy, UserCheck } from 'lucide-react';
import Modal from '../Common/Modal';
import { notify } from '../../lib/notify';
import AngryTigerTool from './AngryTigerTool';
import { LoudBoatTool, QuietFishTool, ReadingChallengeTool } from './InteractiveTools';
import QuietStudyTool from './QuietStudyTool';
import RandomPickerTool from './RandomPickerTool';
import SmartSeatingTool from './SmartSeatingTool';
import TimerTool from './TimerTool';

const LEVEL_LABELS = {
  temporary: '全员可用',
  vip1: '会员一级',
  vip2: '会员二级',
  permanent: '永久会员',
};

const LEVEL_RANK = {
  temporary: 0,
  vip1: 1,
  vip2: 2,
  permanent: 3,
};

const DEFAULT_TOOLBOX_ACCESS = {
  random: 'temporary',
  timer: 'temporary',
  smart_seating: 'vip2',
  read_forest: 'vip2',
  mic_power: 'vip2',
  angry_tiger: 'vip2',
  reading_challenge: 'vip2',
  quiet_study: 'vip2',
};

const Toolbox = ({
  user,
  currentClass,
  students,
  onFeedStudentsBatch,
  onRequestConfirm,
  savedSmartSeatingConfig,
  onSaveSmartSeatingConfig,
  toolboxAccessConfig,
}) => {
  const [activeTool, setActiveTool] = useState(null);
  const currentLevelRank = LEVEL_RANK[user?.level || 'temporary'] ?? 0;
  const resolvedAccess = { ...DEFAULT_TOOLBOX_ACCESS, ...(toolboxAccessConfig || {}) };

  const tools = [
    { id: 'random', name: '随机点名', icon: <UserCheck size={32} />, color: '#6366f1', status: 'ready' },
    { id: 'timer', name: '倒计时', icon: <Timer size={32} />, color: '#10b981', status: 'ready' },
    { id: 'smart_seating', name: '智能排座', icon: <Map size={32} />, color: '#2563eb', status: 'ready' },
    { id: 'read_forest', name: '安静养鱼', icon: <BookOpen size={32} />, color: '#0ea5e9', status: 'ready' },
    { id: 'mic_power', name: '大声读', icon: <Mic size={32} />, color: '#f43f5e', status: 'ready' },
    { id: 'angry_tiger', name: '生气的老虎', icon: <PawPrint size={32} />, color: '#16a34a', status: 'ready' },
    { id: 'reading_challenge', name: '朗读挑战', icon: <Trophy size={32} />, color: '#f59e0b', status: 'ready' },
    { id: 'quiet_study', name: '静心自习', icon: <Coffee size={32} />, color: '#0f766e', status: 'ready' },
  ].map((tool) => {
    const minLevel = resolvedAccess[tool.id] || 'temporary';
    const unlocked = currentLevelRank >= (LEVEL_RANK[minLevel] ?? 0);

    return {
      ...tool,
      minLevel,
      unlocked,
    };
  });

  const handleToolClick = (tool) => {
    if (!tool.unlocked) {
      notify(`此工具需要 ${LEVEL_LABELS[tool.minLevel] || tool.minLevel} 才可使用`, 'warning');
      return;
    }

    if (tool.status !== 'ready') {
      notify('这个高级工具正在打磨中，本轮已优先完成“静心自习”', 'warning');
      return;
    }

    setActiveTool(tool.id);
  };

  const closeFullscreenModal = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setActiveTool(null);
  };

  return (
    <div className="toolbox-container">
      <div className="toolbox-grid">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className={`tool-card glass-card ${!tool.unlocked ? 'locked' : ''}`}
            onClick={() => handleToolClick(tool)}
          >
            <div className="tool-icon" style={{ color: tool.color }}>
              {tool.icon}
            </div>
            <h3 className="tool-name">{tool.name}</h3>
            {!tool.unlocked && (
              <div className="lock-badge">
                <Lock size={12} />
                <span>{LEVEL_LABELS[tool.minLevel] || tool.minLevel} 解锁</span>
              </div>
            )}
            {tool.minLevel !== 'temporary' && tool.unlocked && tool.status === 'ready' && <div className="tool-tag ready">已可用</div>}
            {tool.minLevel !== 'temporary' && tool.unlocked && tool.status !== 'ready' && <div className="tool-tag coming">开发中</div>}
            {tool.minLevel === 'temporary' && tool.status === 'ready' && <div className="tool-tag">全员可用</div>}
            {tool.minLevel === 'temporary' && tool.status !== 'ready' && <div className="tool-tag coming">开发中</div>}
          </div>
        ))}
      </div>

      <Modal isOpen={activeTool === 'random'} onClose={() => setActiveTool(null)} title="课堂幸运儿" contentClassName="random-picker-modal" bodyClassName="random-picker-modal-body">
        <RandomPickerTool students={students} />
      </Modal>

      <Modal isOpen={activeTool === 'timer'} onClose={() => setActiveTool(null)} showHeader={false} contentClassName="timer-modal" bodyClassName="timer-modal-body">
        <TimerTool onClose={() => setActiveTool(null)} />
      </Modal>

      <Modal isOpen={activeTool === 'quiet_study'} onClose={() => setActiveTool(null)} title="静心自习">
        <QuietStudyTool students={students} />
      </Modal>

      <Modal isOpen={activeTool === 'read_forest'} onClose={() => setActiveTool(null)} showHeader={false} contentClassName="quiet-fish-modal" bodyClassName="quiet-fish-modal-body">
        <QuietFishTool />
      </Modal>

      <Modal isOpen={activeTool === 'mic_power'} onClose={() => setActiveTool(null)} showHeader={false} contentClassName="loud-boat-modal" bodyClassName="loud-boat-modal-body">
        <LoudBoatTool />
      </Modal>

      <Modal isOpen={activeTool === 'angry_tiger'} onClose={closeFullscreenModal} showHeader={false} contentClassName="angry-tiger-modal" bodyClassName="angry-tiger-modal-body">
        <AngryTigerTool onClose={closeFullscreenModal} />
      </Modal>

      <Modal isOpen={activeTool === 'reading_challenge'} onClose={closeFullscreenModal} showHeader={false} contentClassName="reading-challenge-modal" bodyClassName="reading-challenge-modal-body">
        <ReadingChallengeTool
          currentClass={currentClass}
          students={students}
          onClose={closeFullscreenModal}
          onFeedStudentsBatch={onFeedStudentsBatch}
          onRequestConfirm={onRequestConfirm}
        />
      </Modal>

      <Modal isOpen={activeTool === 'smart_seating'} onClose={() => setActiveTool(null)} title="智能排座" contentClassName="smart-seating-modal" bodyClassName="smart-seating-modal-body">
        <SmartSeatingTool
          currentClass={currentClass}
          students={students}
          savedConfig={savedSmartSeatingConfig}
          onSaveConfig={onSaveSmartSeatingConfig}
        />
      </Modal>
    </div>
  );
};

export default Toolbox;
