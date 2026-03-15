import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Toolbox.css';
import {
  Clock3,
  Expand,
  Lock,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Timer,
  Trophy,
  UserCheck,
  Mic,
  BookOpen,
  Coffee,
  RotateCcw,
} from 'lucide-react';
import Modal from '../Common/Modal';

const Toolbox = ({ user, students }) => {
  const [activeTool, setActiveTool] = useState(null);

  const isVip2 = user?.level === 'vip2' || user?.level === 'permanent';
  const tools = [
    { id: 'random', name: '随机点名', icon: <UserCheck size={32} />, type: 'basic', color: '#6366f1', status: 'ready' },
    { id: 'timer', name: '倒计时', icon: <Timer size={32} />, type: 'basic', color: '#10b981', status: 'ready' },
    { id: 'read_forest', name: '早读素养', icon: <BookOpen size={32} />, type: 'advanced', color: '#f59e0b', status: 'coming' },
    { id: 'mic_power', name: '大声读', icon: <Mic size={32} />, type: 'advanced', color: '#f43f5e', status: 'coming' },
    { id: 'quiet_study', name: '静心自习', icon: <Coffee size={32} />, type: 'advanced', color: '#0f766e', status: 'ready' },
  ];

  const handleToolClick = (tool) => {
    if (tool.type === 'advanced' && !isVip2) {
      window.alert('🔒 此工具需要 VIP 2 或永久账号才可使用');
      return;
    }

    if (tool.status !== 'ready') {
      window.alert('这个高级工具正在打磨中，本轮已优先完成“静心自习”');
      return;
    }

    setActiveTool(tool.id);
  };

  return (
    <div className="toolbox-container">
      <div className="toolbox-grid">
        {tools.map((tool) => (
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
            {tool.type === 'advanced' && isVip2 && tool.status === 'ready' && (
              <div className="tool-tag ready">已可用</div>
            )}
            {tool.type === 'advanced' && isVip2 && tool.status !== 'ready' && (
              <div className="tool-tag coming">开发中</div>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={activeTool === 'random'}
        onClose={() => setActiveTool(null)}
        title="课堂幸运儿"
        contentClassName="random-picker-modal"
        bodyClassName="random-picker-modal-body"
      >
        <RandomPickerTool students={students} />
      </Modal>

      <Modal
        isOpen={activeTool === 'timer'}
        onClose={() => setActiveTool(null)}
        showHeader={false}
        contentClassName="timer-modal"
        bodyClassName="timer-modal-body"
      >
        <TimerTool onClose={() => setActiveTool(null)} />
      </Modal>

      <Modal isOpen={activeTool === 'quiet_study'} onClose={() => setActiveTool(null)} title="静心自习">
        <QuietStudyTool students={students} />
      </Modal>
    </div>
  );
};

const RandomPickerTool = ({ students }) => {
  const [pickCount, setPickCount] = useState(1);
  const [pickedStudents, setPickedStudents] = useState([]);
  const [recentPicks, setRecentPicks] = useState([]);
  const [isRolling, setIsRolling] = useState(false);

  const maxPickCount = Math.min(5, Math.max(1, students.length));
  const activePickCount = Math.min(pickCount, maxPickCount);

  const startRandomSelect = () => {
    if (students.length === 0) {
      return;
    }

    const safeCount = Math.min(activePickCount, students.length);
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      setPickedStudents(shuffled.slice(0, safeCount));
      count += 1;

      if (count > 18) {
        clearInterval(interval);
        const winners = shuffled.slice(0, safeCount);
        setPickedStudents(winners);
        setRecentPicks((prev) => {
          const nextEntry = {
            id: `${Date.now()}-${winners.map((student) => student.id).join('-')}`,
            students: winners,
          };

          return [nextEntry, ...prev].slice(0, 6);
        });
        setIsRolling(false);
      }
    }, 110);
  };

  const pickedNames = pickedStudents.map((student) => student.name).join('、');

  return (
    <div className="random-picker-layout">
      <section className="random-picker-main">
        <div className="random-count-tabs">
          {Array.from({ length: maxPickCount }, (_, index) => index + 1).map((value) => (
            <button
              key={value}
              className={`random-count-tab ${activePickCount === value ? 'active' : ''}`}
              onClick={() => setPickCount(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>

        <div className="random-picked-board">
          {pickedStudents.length === 0 ? (
            <div className="random-picked-placeholder">等待抽取...</div>
          ) : pickedStudents.length === 1 ? (
            <div className={`lucky-name ${isRolling ? 'rolling' : ''}`}>{pickedStudents[0].name}</div>
          ) : (
            <div className={`lucky-name multi ${isRolling ? 'rolling' : ''}`}>{pickedNames}</div>
          )}
        </div>

        <button
          className="roll-btn"
          disabled={isRolling || students.length === 0}
          onClick={startRandomSelect}
          type="button"
        >
          <Sparkles size={18} />
          {isRolling ? `正在抽取 ${activePickCount} 人...` : `抽取 ${activePickCount} 人`}
        </button>
      </section>

      <aside className="random-picker-history">
        <div className="random-history-title">
          <Clock3 size={20} />
          <h4>最近点名记录</h4>
        </div>

        {recentPicks.length === 0 ? (
          <div className="random-history-empty">还没有点名记录</div>
        ) : (
          <div className="random-history-list">
            {recentPicks.map((entry) => (
              <div key={entry.id} className="random-history-item">
                <div className="random-history-names">
                  {entry.students.map((student) => student.name).join('、')}
                </div>
                <Trophy size={16} />
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
};

const TimerTool = ({ onClose }) => {
  const [durationSeconds, setDurationSeconds] = useState(5 * 60);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const shellRef = useRef(null);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((durationSeconds - timeLeft) / Math.max(durationSeconds, 1)) * 100;

  const applyDuration = (minutes) => {
    const nextSeconds = minutes * 60;
    setDurationSeconds(nextSeconds);
    setTimeLeft(nextSeconds);
    setIsRunning(false);
  };

  const handleReset = () => {
    setTimeLeft(durationSeconds);
    setIsRunning(false);
  };

  const handleCustomApply = () => {
    const minutes = Number(customMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return;
    }

    applyDuration(minutes);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (shellRef.current?.requestFullscreen) {
        await shellRef.current.requestFullscreen();
      }
    } catch {
      window.alert('当前环境暂不支持全屏模式');
    }
  };

  return (
    <div ref={shellRef} className={`timer-shell ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <div className="timer-surface">
        <div className="timer-topbar">
          <div className="timer-title-group">
            <div className="timer-title-icon">
              <Timer size={24} />
            </div>
            <div className="timer-title-copy">
              <h3>沉浸倒计时</h3>
            </div>
          </div>
          <button className="timer-close-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="timer-center-stage">
          <div className="timer-display hero">{formatTime(timeLeft)}</div>
          <div className="timer-progress-track">
            <div className="timer-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>

          <div className="timer-control-dock">
            <button className="timer-circle-btn secondary" onClick={handleReset} type="button" title="重置">
              <RotateCcw size={28} />
            </button>
            <button className={`timer-circle-btn primary ${isRunning ? 'pause' : 'play'}`} onClick={() => setIsRunning((prev) => !prev)} type="button" title={isRunning ? '暂停' : '开始'}>
              {isRunning ? <Pause size={34} /> : <Play size={34} fill="currentColor" />}
            </button>
            <button className="timer-circle-btn secondary" onClick={toggleFullscreen} type="button" title="全屏">
              <Expand size={28} />
            </button>
          </div>
        </div>

        <div className="timer-bottom-bar">
          <div className="timer-quick-picks">
            <span className="timer-bottom-label">快捷时间</span>
            {[5, 10, 30].map((minutes) => (
              <button
                key={minutes}
                className={`timer-preset-chip ${durationSeconds === minutes * 60 ? 'active' : ''}`}
                onClick={() => applyDuration(minutes)}
                type="button"
              >
                {minutes} m
              </button>
            ))}
          </div>

          <div className="timer-custom-setter">
            <Settings2 size={18} />
            <input
              className="timer-custom-input"
              type="number"
              min="1"
              step="1"
              placeholder="自定义"
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
            />
            <button className="timer-set-btn" onClick={handleCustomApply} type="button">
              设定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuietStudyTool = ({ students }) => {
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    setTimeLeft(durationMinutes * 60);
  }, [durationMinutes]);

  useEffect(() => {
    if (!isRunning || timeLeft === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => {
            setCompletedSessions((count) => count + 1);
            setIsRunning(false);
          }, 0);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const focusHint = useMemo(() => {
    if (students.length === 0) {
      return '当前班级还没有学生，适合先去创建班级再回来发起自习。';
    }

    if (students.length < 10) {
      return '小班模式建议把时长控制在 8-10 分钟，方便快速回顾。';
    }

    return '人数较多时建议使用 10-15 分钟专注轮次，并在结束后做 1 句复盘。';
  }, [students.length]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((durationMinutes * 60 - timeLeft) / (durationMinutes * 60 || 1)) * 100;

  return (
    <div className="quiet-study-view">
      <div className="quiet-study-top">
        <div>
          <h3>专注自习模式</h3>
          <p>{focusHint}</p>
        </div>
        <div className="quiet-study-badge">已完成 {completedSessions} 轮</div>
      </div>

      <div className="quiet-study-meter">
        <div className="quiet-study-progress" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>

      <div className="timer-display quiet">{formatTime(timeLeft)}</div>

      <div className="timer-presets">
        {[5, 10, 15].map((minutes) => (
          <button
            key={minutes}
            className={`preset-btn ${durationMinutes === minutes ? 'active' : ''}`}
            onClick={() => {
              setDurationMinutes(minutes);
              setIsRunning(false);
            }}
            type="button"
          >
            {minutes} 分钟
          </button>
        ))}
      </div>

      <div className="timer-controls">
        <button className="control-btn main" onClick={() => setIsRunning((prev) => !prev)} type="button">
          {isRunning ? '暂停本轮' : '开始专注'}
        </button>
        <button
          className="control-btn reset"
          onClick={() => {
            setIsRunning(false);
            setTimeLeft(durationMinutes * 60);
          }}
          type="button"
        >
          重新开始
        </button>
      </div>

      <div className="quiet-study-reflection">
        <label>结束复盘</label>
        <textarea
          className="glass-input"
          rows={4}
          placeholder="记录这轮自习的状态，比如：全班进入状态很快，后排需要第二次提醒。"
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
        />
      </div>
    </div>
  );
};

export default Toolbox;
