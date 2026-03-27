import React, { useEffect, useRef, useState } from 'react';
import { Expand, Pause, Play, Square, X } from 'lucide-react';
import { notify } from '../../lib/notify';
import { playActionSound } from '../../lib/sounds';

const ANGRY_TIGER_SETTINGS_STORAGE_KEY = 'class-pets:angry-tiger-settings';

const ANGRY_TIGER_DEFAULTS = {
  threshold: 60,
  bufferSeconds: 4,
  micGain: 1.3,
  recoverSpeed: 1.2,
};

const readStoredAngryTigerSettings = () => {
  if (typeof window === 'undefined') {
    return ANGRY_TIGER_DEFAULTS;
  }

  try {
    const rawSettings = window.localStorage.getItem(ANGRY_TIGER_SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return ANGRY_TIGER_DEFAULTS;
    }

    const parsedSettings = JSON.parse(rawSettings);
    return {
      threshold: Number(parsedSettings?.threshold) || ANGRY_TIGER_DEFAULTS.threshold,
      bufferSeconds: Number(parsedSettings?.bufferSeconds) || ANGRY_TIGER_DEFAULTS.bufferSeconds,
      micGain: Number(parsedSettings?.micGain) || ANGRY_TIGER_DEFAULTS.micGain,
      recoverSpeed: Number(parsedSettings?.recoverSpeed) || ANGRY_TIGER_DEFAULTS.recoverSpeed,
    };
  } catch {
    return ANGRY_TIGER_DEFAULTS;
  }
};

const formatMMSS = (totalSeconds) => {
  const total = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const WAVEFORM_BAR_COUNT = 24;

const AngryTigerTool = ({ onClose }) => {
  const shellRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const uiUpdateRef = useRef(0);
  const dbLevelRef = useRef(32);
  const rageSecondsRef = useRef(0);
  const quietSecondsRef = useRef(0);
  const previousVisualStateRef = useRef('idle');
  const [settings, setSettings] = useState(() => readStoredAngryTigerSettings());
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dbLevel, setDbLevel] = useState(32);
  const [rageSeconds, setRageSeconds] = useState(0);
  const [quietSeconds, setQuietSeconds] = useState(0);
  const [micError, setMicError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const tigerImages = {
    sleep: '/images/toolbox/angry-tiger/tiger-sleep.png',
    alert: '/images/toolbox/angry-tiger/tiger-alert.png',
    angry: '/images/toolbox/angry-tiger/tiger-angry.png',
  };

  const stopAudio = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  };

  const resetTigerState = (keepListening = false) => {
    rageSecondsRef.current = 0;
    quietSecondsRef.current = 0;
    dbLevelRef.current = 32;
    previousVisualStateRef.current = keepListening ? 'sleep' : 'idle';
    setDbLevel(32);
    setRageSeconds(0);
    setQuietSeconds(0);
    setIsPaused(false);
    if (!keepListening) {
      setIsListening(false);
    }
  };

  useEffect(() => () => stopAudio(), []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const saveSettings = () => {
    try {
      window.localStorage.setItem(ANGRY_TIGER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      notify('老虎规则已保存，下次会沿用这套设置', 'success');
    } catch {
      notify('当前环境暂时无法保存设置', 'warning');
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (shellRef.current?.requestFullscreen) {
        await shellRef.current.requestFullscreen();
      }
    } catch {
      notify('当前环境暂不支持全屏模式', 'warning');
    }
  };

  const startListening = async () => {
    try {
      setMicError('');
      stopAudio();
      resetTigerState(true);
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.84;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      streamRef.current = stream;
      lastFrameRef.current = performance.now();
      previousVisualStateRef.current = 'sleep';
      setIsListening(true);
      setIsPaused(false);
      playActionSound('boat_start');
    } catch {
      setMicError('没有拿到麦克风权限，请先允许浏览器访问麦克风。');
      notify('无法获取麦克风权限', 'warning');
      stopAudio();
      resetTigerState(false);
    }
  };

  useEffect(() => {
    if (!isListening) {
      return undefined;
    }

    const analyser = analyserRef.current;
    if (!analyser) {
      return undefined;
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const render = (timestamp) => {
      const delta = Math.min(0.06, (timestamp - lastFrameRef.current) / 1000 || 0);
      lastFrameRef.current = timestamp;

      let nextDbLevel = dbLevelRef.current;
      if (!isPaused) {
        analyser.getByteFrequencyData(frequencyData);
        let sum = 0;
        for (let index = 0; index < frequencyData.length; index += 1) {
          sum += frequencyData[index] * frequencyData[index];
        }
        const rms = Math.sqrt(sum / frequencyData.length || 0);
        let measuredDb = rms > 0 ? 20 * Math.log10(rms) + 10 : 28;
        measuredDb = Math.max(20, Math.min(100, measuredDb * settings.micGain));
        nextDbLevel = dbLevelRef.current * 0.76 + measuredDb * 0.24;
        dbLevelRef.current = nextDbLevel;

        if (nextDbLevel >= settings.threshold) {
          rageSecondsRef.current = Math.min(settings.bufferSeconds, rageSecondsRef.current + delta);
          quietSecondsRef.current = Math.max(0, quietSecondsRef.current - delta * 1.8);
        } else {
          rageSecondsRef.current = Math.max(0, rageSecondsRef.current - delta * settings.recoverSpeed);
          quietSecondsRef.current += delta;
        }
      }

      const visualState = !isListening
        ? 'idle'
        : isPaused
          ? 'paused'
          : rageSecondsRef.current >= settings.bufferSeconds
            ? 'angry'
            : nextDbLevel >= settings.threshold
              ? 'alert'
              : 'sleep';

      if (visualState !== previousVisualStateRef.current) {
        if (visualState === 'alert') {
          playActionSound('boat_warning');
        } else if (visualState === 'angry') {
          playActionSound('negative');
        } else if (visualState === 'sleep' && previousVisualStateRef.current !== 'idle') {
          playActionSound('positive');
        }
        previousVisualStateRef.current = visualState;
      }

      if (timestamp - uiUpdateRef.current >= 120) {
        uiUpdateRef.current = timestamp;
        setDbLevel(Math.round(nextDbLevel));
        setRageSeconds(rageSecondsRef.current);
        setQuietSeconds(quietSecondsRef.current);
      }

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isListening, isPaused, settings]);

  const handleClose = async () => {
    stopAudio();
    resetTigerState(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const visualState = !isListening
    ? 'idle'
    : isPaused
      ? 'paused'
      : rageSeconds >= settings.bufferSeconds
        ? 'angry'
        : dbLevel >= settings.threshold
          ? 'alert'
          : 'sleep';

  const stateMeta = {
    idle: {
      title: '老虎还没开始值守',
      description: '点击开始监听后，它会根据课堂分贝切换情绪。',
      zone: '未监听',
      zoneClass: 'idle',
      mood: '准备中',
      moodDesc: '点击开始监听',
      icon: 'schedule',
      tigerImage: tigerImages.sleep,
      stateLabel: '待机状态',
      quietLabel: '保持安静时长',
      quietDesc: '等待开始',
      dbLabel: '室内音量',
      dbDesc: '当前环境音量',
    },
    paused: {
      title: '老虎暂停观察',
      description: '继续监听后，会从当前环境重新判断是否该醒来。',
      zone: '暂停中',
      zoneClass: 'paused',
      mood: '暂停',
      moodDesc: '点击继续监听',
      icon: 'pause_circle',
      tigerImage: tigerImages.sleep,
      stateLabel: '暂停状态',
      quietLabel: '安静时长',
      quietDesc: '暂停中',
      dbLabel: '室内音量',
      dbDesc: '当前环境音量',
    },
    sleep: {
      title: '老虎正在做梦…',
      description: `教室当前音量 ${dbLevel}dB (安全区域)`,
      zone: '安全',
      zoneClass: 'safe',
      mood: '低',
      moodDesc: '老虎现在很有耐心',
      icon: 'mode_night',
      tigerImage: tigerImages.sleep,
      stateLabel: '熟睡状态',
      quietLabel: '保持安静时长',
      quietDesc: '专注工作的时长（分钟）',
      dbLabel: '室内音量',
      dbDesc: '当前环境音量',
    },
    alert: {
      title: '老虎要醒了！',
      description: `教室当前音量 ${dbLevel}dB (警告区域)`,
      zone: '警告',
      zoneClass: 'warning',
      mood: '中度',
      moodDesc: '老虎正在失去耐心',
      icon: 'notification_important',
      tigerImage: tigerImages.alert,
      stateLabel: '惊醒状态',
      quietLabel: '安静连续时长',
      quietDesc: '刚刚中断了',
      dbLabel: '室内音量',
      dbDesc: '当前环境水平',
    },
    angry: {
      title: '老虎发火了！',
      description: `教室当前音量 ${dbLevel}dB (危险区域)`,
      zone: '危险',
      zoneClass: 'danger',
      mood: '极度愤怒',
      moodDesc: '老虎现在很生气！',
      icon: 'warning',
      tigerImage: tigerImages.angry,
      stateLabel: '怒吼状态',
      quietLabel: '安静时段',
      quietDesc: '记录中断！',
      dbLabel: '教室音量',
      dbDesc: '当前噪音峰值',
    },
  }[visualState];

  const ragePercent = Math.max(0, Math.min(100, (rageSeconds / settings.bufferSeconds) * 100));

  // Generate waveform bar heights from dbLevel
  const waveformBars = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
    const base = dbLevel / 100;
    const seed = Math.sin(i * 1.7 + dbLevel * 0.1) * 0.5 + 0.5;
    const h = Math.max(0.1, Math.min(1, base * 0.6 + seed * 0.5));
    return Math.round(h * 100);
  });

  const moodIcons = {
    idle: 'sentiment_neutral',
    paused: 'pause_circle',
    sleep: 'sentiment_satisfied',
    alert: 'sentiment_neutral',
    angry: 'sentiment_very_dissatisfied',
  };

  return (
    <div
      ref={shellRef}
      className={`atv2-shell atv2-state-${stateMeta.zoneClass} ${isFullscreen ? 'atv2-fullscreen' : ''}`}
    >
      {/* === HEADER === */}
      <header className="atv2-header">
        <div className="atv2-header-brand">
          <div className="atv2-header-icon">
            <span className="material-symbols-outlined" data-icon="pets">pets</span>
          </div>
          <h1 className="atv2-header-title">别吵醒老虎</h1>
        </div>
        <div className="atv2-header-actions">
          <button className="atv2-header-btn" onClick={toggleFullscreen} type="button" aria-label={isFullscreen ? '退出全屏' : '进入全屏'}>
            <Expand size={18} />
          </button>
          <button className="atv2-header-btn" onClick={() => setShowSettings(s => !s)} type="button" aria-label="设置">
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
          </button>
          <button className="atv2-header-btn" onClick={handleClose} type="button" aria-label="退出">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* === MAIN CANVAS === */}
      <main className="atv2-main">
        {/* Ambient blobs */}
        <div className="atv2-ambient">
          <div className="atv2-ambient-blob atv2-ambient-blob-1" />
          <div className="atv2-ambient-blob atv2-ambient-blob-2" />
        </div>

        {/* Central tiger area */}
        <div className="atv2-center">
          {/* Floating status bubble */}
          <div className={`atv2-bubble ${visualState === 'angry' ? 'atv2-bubble-shake' : 'atv2-bubble-float'}`}>
            <div className="atv2-bubble-inner">
              <span className="material-symbols-outlined atv2-bubble-icon" data-icon={stateMeta.icon} style={{ fontVariationSettings: "'FILL' 1" }}>{stateMeta.icon}</span>
              <div>
                <p className="atv2-bubble-title">{stateMeta.title}</p>
                <p className="atv2-bubble-desc">{stateMeta.description}</p>
              </div>
            </div>
          </div>

          {micError && <div className="atv2-mic-error">{micError}</div>}

          {/* Tiger image */}
          <div className="atv2-tiger-wrap">
            <img
              alt={stateMeta.stateLabel}
              className={`atv2-tiger-img ${visualState === 'angry' ? 'atv2-tiger-shake atv2-no-hover' : ''}`}
              src={stateMeta.tigerImage}
            />
            <div className="atv2-tiger-overlay" />
            {visualState !== 'idle' && visualState !== 'paused' && (
              <div className="atv2-tiger-state-label">
                <span>{stateMeta.stateLabel}</span>
              </div>
            )}
          </div>

          {/* Bento Stats Grid */}
          <div className={`atv2-stats-grid ${visualState === 'idle' || visualState === 'paused' ? 'atv2-stats-dimmed' : ''}`}>
            {/* Stat 1: Silence Duration */}
            <div className="atv2-stat-card">
              <p className="atv2-stat-label">{stateMeta.quietLabel}</p>
              <h3 className="atv2-stat-value atv2-stat-value-primary">{formatMMSS(quietSeconds)}</h3>
              <p className="atv2-stat-desc">{stateMeta.quietDesc}</p>
            </div>
            {/* Stat 2: Mood */}
            <div className="atv2-stat-card atv2-stat-card-accent">
              <p className="atv2-stat-label">情绪表</p>
              <div className="atv2-stat-mood-row">
                <h3 className="atv2-stat-value atv2-stat-value-mood">{stateMeta.mood}</h3>
                <span className="material-symbols-outlined atv2-stat-mood-icon" data-icon={moodIcons[visualState]}>{moodIcons[visualState]}</span>
              </div>
              <p className="atv2-stat-desc">{stateMeta.moodDesc}</p>
            </div>
            {/* Stat 3: dB Level */}
            <div className="atv2-stat-card">
              <p className="atv2-stat-label">{stateMeta.dbLabel}</p>
              <h3 className="atv2-stat-value">{dbLevel} <span className="atv2-stat-unit">dB</span></h3>
              <p className="atv2-stat-desc">{stateMeta.dbDesc}</p>
            </div>
          </div>
        </div>
      </main>

      {/* === FOOTER / CONTROL DOCK === */}
      <footer className="atv2-footer">
        <div className="atv2-footer-inner">
          {/* Waveform */}
          <div className="atv2-waveform">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className={`atv2-waveform-bar ${visualState === 'angry' ? 'atv2-waveform-peak' : ''} ${visualState === 'idle' || visualState === 'paused' ? 'atv2-waveform-breathe' : ''}`}
                style={{ height: `${height}%`, animationDelay: visualState === 'angry' ? `${(i * 0.04).toFixed(2)}s` : `${(i * 0.12).toFixed(2)}s` }}
              />
            ))}
          </div>

          {/* Controls row */}
          <div className="atv2-controls-row">
            {/* Sensitivity control */}
            <div className="atv2-sensitivity-panel">
              <div className="atv2-sensitivity-icon">
                <span className="material-symbols-outlined" data-icon="tune">tune</span>
              </div>
              <div className="atv2-sensitivity-body">
                <div className="atv2-sensitivity-labels">
                  <span>老虎脾气</span>
                  <span className="atv2-sensitivity-value">{stateMeta.zone}</span>
                </div>
                <input
                  className="atv2-sensitivity-range"
                  type="range"
                  min="30"
                  max="90"
                  value={settings.threshold}
                  onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))}
                />
              </div>
            </div>

            {/* Primary Action */}
            <div className="atv2-primary-action">
              {!isListening ? (
                <button className="atv2-play-btn" onClick={startListening} type="button">
                  <Play size={28} fill="currentColor" />
                </button>
              ) : (
                <>
                  <button className="atv2-play-btn" onClick={() => setIsPaused((prev) => !prev)} type="button">
                    {isPaused ? <Play size={28} fill="currentColor" /> : <Pause size={28} fill="currentColor" />}
                  </button>
                  <button className="atv2-stop-btn" onClick={() => { stopAudio(); resetTigerState(false); }} type="button" aria-label="停止监听">
                    <Square size={18} fill="currentColor" />
                  </button>
                </>
              )}
              <div className="atv2-play-copy">
                <p className="atv2-play-title">{!isListening ? '唤醒老虎' : isPaused ? '继续监听' : '正在监听'}</p>
                <p className="atv2-play-desc">{!isListening ? '开启麦克风监听' : isPaused ? '继续判断情绪' : '点击暂停'}</p>
              </div>
            </div>

            {/* Rage progress (compact) */}
            <div className="atv2-rage-mini">
              <div className="atv2-rage-mini-labels">
                <span>怒吼进度</span>
                <strong>{rageSeconds.toFixed(1)} / {settings.bufferSeconds}s</strong>
              </div>
              <div className="atv2-rage-mini-track">
                <div className="atv2-rage-mini-fill" style={{ width: `${ragePercent}%` }} />
              </div>
            </div>
          </div>

          {/* Settings panel (collapsible with smooth transition) */}
          <div className={`atv2-settings-panel ${showSettings ? 'atv2-settings-open' : ''}`}>
            <label className="atv2-setting-row">
              <span>怒吼缓冲</span>
              <div className="atv2-setting-range">
                <input type="range" min="2" max="10" step="0.5" value={settings.bufferSeconds} onChange={(e) => setSettings((prev) => ({ ...prev, bufferSeconds: Number(e.target.value) }))} />
                <strong>{settings.bufferSeconds}s</strong>
              </div>
            </label>
            <label className="atv2-setting-row">
              <span>麦克风灵敏度</span>
              <div className="atv2-setting-range">
                <input type="range" min="0.6" max="2.5" step="0.1" value={settings.micGain} onChange={(e) => setSettings((prev) => ({ ...prev, micGain: Number(e.target.value) }))} />
                <strong>{settings.micGain.toFixed(1)}x</strong>
              </div>
            </label>
            <label className="atv2-setting-row">
              <span>怒气恢复</span>
              <div className="atv2-setting-range">
                <input type="range" min="0.5" max="3" step="0.1" value={settings.recoverSpeed} onChange={(e) => setSettings((prev) => ({ ...prev, recoverSpeed: Number(e.target.value) }))} />
                <strong>{settings.recoverSpeed.toFixed(1)}x</strong>
              </div>
            </label>
            <button className="atv2-save-btn" onClick={saveSettings} type="button">保存规则</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AngryTigerTool;
