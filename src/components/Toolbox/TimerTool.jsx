import React, { useEffect, useRef, useState } from 'react';
import { Expand, Pause, Play, RotateCcw, Settings2, Timer } from 'lucide-react';
import { notify } from '../../lib/notify';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
            notify('时间到！');
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
      notify('当前环境暂不支持全屏模式', 'warning');
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
            <button
              className={`timer-circle-btn primary ${isRunning ? 'pause' : 'play'}`}
              onClick={() => setIsRunning((prev) => !prev)}
              type="button"
              title={isRunning ? '暂停' : '开始'}
            >
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
            <div className="timer-custom-field">
              <input
                className="timer-custom-input"
                type="number"
                min="1"
                step="1"
                placeholder="输入分钟"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
              />
              <span className="timer-custom-unit">min</span>
            </div>
            <button className="timer-set-btn" onClick={handleCustomApply} type="button">
              设定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerTool;
