import React, { useEffect, useMemo, useState } from 'react';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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

export default QuietStudyTool;
