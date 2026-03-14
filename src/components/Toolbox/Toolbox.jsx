import React, { useState, useEffect } from 'react';
import './Toolbox.css';
import { Lock, Timer, UserCheck, Mic, BookOpen, Coffee } from 'lucide-react';
import Modal from '../Common/Modal';

const Toolbox = ({ user, students }) => {
  const [activeTool, setActiveTool] = useState(null);
  const [randomStudent, setRandomStudent] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  
  const isVip2 = user?.level === 'vip2' || user?.level === 'permanent'; // 简化逻辑

  const tools = [
    { id: 'random', name: '随机点名', icon: <UserCheck size={32} />, type: 'basic', color: '#6366f1' },
    { id: 'timer', name: '倒计时', icon: <Timer size={32} />, type: 'basic', color: '#10b981' },
    { id: 'read_forest', name: '早读素养', icon: <BookOpen size={32} />, type: 'advanced', color: '#f59e0b' },
    { id: 'mic_power', name: '大声读', icon: <Mic size={32} />, type: 'advanced', color: '#f43f5e' },
    { id: 'quiet_study', name: '静心自习', icon: <Coffee size={32} />, type: 'advanced', color: '#8b5cf6' },
  ];

  const handleToolClick = (tool) => {
    if (tool.type === 'advanced' && !isVip2) {
      alert('🔒 此工具暂未解锁\n提升账户至 VIP 2 即可即刻体验高级课堂工具！');
      return;
    }
    setActiveTool(tool.id);
  };

  const startRandomSelect = () => {
    if (students.length === 0) return;
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      const lucky = students[Math.floor(Math.random() * students.length)];
      setRandomStudent(lucky);
      count++;
      if (count > 20) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 100);
  };

  return (
    <div className="toolbox-container">
      <div className="toolbox-grid">
        {tools.map(tool => (
          <div 
            key={tool.id} 
            className={`tool-card glass-card ${tool.type === 'advanced' && !isVip2 ? 'locked' : ''}`}
            onClick={() => handleToolClick(tool)}
          >
            <div className="tool-icon" style={{ color: tool.color }}>
              {tool.icon}
            </div>
            <h3 className="tool-name">{tool.name}</h3>
            {tool.type === 'advanced' && !isVip2 && (
              <div className="lock-badge">
                <Lock size={12} />
                <span>VIP 2 解锁</span>
              </div>
            )}
            {tool.type === 'basic' && <div className="tool-tag">全员可用</div>}
          </div>
        ))}
      </div>

      {/* 随机点名 Modal */}
      <Modal 
        isOpen={activeTool === 'random'} 
        onClose={() => setActiveTool(null)}
        title="课堂幸运儿"
      >
        <div className="random-select-view">
          <div className={`lucky-name ${isRolling ? 'rolling' : ''}`}>
            {randomStudent ? randomStudent.name : '等待抽取...'}
          </div>
          <button 
            className="roll-btn" 
            disabled={isRolling || students.length === 0}
            onClick={startRandomSelect}
          >
            {isRolling ? '正在寻找幸运儿...' : '立即抽取'}
          </button>
        </div>
      </Modal>

      {/* 倒计时 Modal */}
      <Modal 
        isOpen={activeTool === 'timer'} 
        onClose={() => setActiveTool(null)}
        title="课堂计时器"
      >
        <TimerTool />
      </Modal>

      {/* 计时器组件内部实现 */}
    </div>
  );
};

const TimerTool = () => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || timeLeft === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            setIsRunning(false);
            window.alert('⏰ 时间到！');
          }, 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer-view">
      <div className="timer-display">{formatTime(timeLeft)}</div>
      <div className="timer-presets">
        {[1, 3, 5].map(m => (
          <button key={m} className="preset-btn" onClick={() => { setTimeLeft(m * 60); setIsRunning(false); }}>
            {m}分
          </button>
        ))}
      </div>
      <div className="timer-controls">
        <button className="control-btn main" onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? '暂停' : '开始'}
        </button>
        <button className="control-btn reset" onClick={() => { setTimeLeft(60); setIsRunning(false); }}>重置</button>
      </div>
    </div>
  );
};

export default Toolbox;
