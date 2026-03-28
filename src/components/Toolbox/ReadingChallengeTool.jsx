import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Expand, Mic, Pause, Play, RotateCcw } from 'lucide-react';
import { notify } from '../../lib/notify';
import { playActionSound } from '../../lib/sounds';

const READING_CHALLENGE_SETTINGS_STORAGE_KEY = 'class-pets:reading-challenge-settings';

const READING_CHALLENGE_DEFAULTS = {
  challengeMinutes: 30,
  bufferSeconds: 6,
  rewardEnergy: 1,
  threshold: 22,
  micGain: 1.8,
};

const READING_CHALLENGE_IMAGES = {
  countdownBg: '/images/toolbox/reading-challenge/countdown-bg.webp',
  challengeBg: '/images/toolbox/reading-challenge/challenge-bg.webp',
  idle: '/images/toolbox/reading-challenge/hero-idle.png',
  warning: '/images/toolbox/reading-challenge/hero-warning.png',
  fail: '/images/toolbox/reading-challenge/hero-fail.png',
  success: '/images/toolbox/reading-challenge/hero-success.png',
  fly: [
    '/images/toolbox/reading-challenge/hero-fly-1.png',
    '/images/toolbox/reading-challenge/hero-fly-2.png',
    '/images/toolbox/reading-challenge/hero-fly-3.png',
  ],
  cloud1: '/images/toolbox/reading-challenge/cloud-1.png',
  cloud2: '/images/toolbox/reading-challenge/cloud-2.png',
  sunGlow: '/images/toolbox/reading-challenge/sun-glow.png',
  reward: '/images/toolbox/reading-challenge/reward-energy.png',
};

const readStoredReadingChallengeSettings = () => {
  if (typeof window === 'undefined') {
    return READING_CHALLENGE_DEFAULTS;
  }

  try {
    const rawSettings = window.localStorage.getItem(READING_CHALLENGE_SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return READING_CHALLENGE_DEFAULTS;
    }

    const parsedSettings = JSON.parse(rawSettings);
    return {
      challengeMinutes: Number(parsedSettings?.challengeMinutes) || READING_CHALLENGE_DEFAULTS.challengeMinutes,
      bufferSeconds: Number(parsedSettings?.bufferSeconds) || READING_CHALLENGE_DEFAULTS.bufferSeconds,
      rewardEnergy: Number(parsedSettings?.rewardEnergy) || READING_CHALLENGE_DEFAULTS.rewardEnergy,
      threshold: Number(parsedSettings?.threshold) || READING_CHALLENGE_DEFAULTS.threshold,
      micGain: Number(parsedSettings?.micGain) || READING_CHALLENGE_DEFAULTS.micGain,
    };
  } catch {
    return READING_CHALLENGE_DEFAULTS;
  }
};

const formatQuietFishTimer = (totalSeconds) => {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const formatQuietFishMMSS = (totalSeconds) => {
  const total = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ReadingChallengeTool = ({ currentClass, students = [], onClose, onFeedStudentsBatch, onRequestConfirm }) => {
  const shellRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const dbLevelRef = useRef(0);
  const remainingSecondsRef = useRef(0);
  const bufferRemainingRef = useRef(0);
  const countdownRef = useRef(3);
  const imageCycleRef = useRef(0);
  const [settings, setSettings] = useState(() => readStoredReadingChallengeSettings());
  const [phase, setPhase] = useState('config');
  const [isPaused, setIsPaused] = useState(false);
  const [micError, setMicError] = useState('');
  const [dbLevel, setDbLevel] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(() => READING_CHALLENGE_DEFAULTS.challengeMinutes * 60);
  const [bufferRemaining, setBufferRemaining] = useState(READING_CHALLENGE_DEFAULTS.bufferSeconds);
  const [isInBuffer, setIsInBuffer] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [countdownLeft, setCountdownLeft] = useState(3);
  const [flyFrame, setFlyFrame] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const eligibleStudents = useMemo(() => students.filter((student) => student.pet_status !== 'egg'), [students]);
  const isListening = phase !== 'config';
  const isCompleted = phase === 'success';
  const isFailed = phase === 'failed';

  const stopAudio = useCallback(() => {
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
  }, []);

  useEffect(() => () => stopAudio(), [stopAudio]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetChallenge = useCallback((nextPhase = 'config') => {
    const totalSeconds = settings.challengeMinutes * 60;
    remainingSecondsRef.current = totalSeconds;
    bufferRemainingRef.current = settings.bufferSeconds;
    countdownRef.current = 3;
    dbLevelRef.current = 0;
    imageCycleRef.current = 0;
    setDbLevel(0);
    setRemainingSeconds(totalSeconds);
    setBufferRemaining(settings.bufferSeconds);
    setCountdownLeft(3);
    setIsInBuffer(false);
    setRewardClaimed(false);
    setIsPaused(false);
    setFlyFrame(0);
    setPhase(nextPhase);
  }, [settings.bufferSeconds, settings.challengeMinutes]);

  const ensureAudioReady = async () => {
    if (analyserRef.current && streamRef.current && audioContextRef.current) {
      return true;
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.86;
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
    return true;
  };

  const startMicTest = async () => {
    try {
      setMicError('');
      await ensureAudioReady();
      setIsTestingMic(true);
      notify('已开始测试音量，请大声朗读试试看', 'success');
    } catch {
      setMicError('没有拿到麦克风权限，请先允许浏览器访问麦克风。');
      notify('无法获取麦克风权限', 'warning');
      stopAudio();
    }
  };

  const startChallenge = async () => {
    try {
      setMicError('');
      await ensureAudioReady();
      resetChallenge('countdown');
      playActionSound('boat_start');
    } catch {
      setMicError('没有拿到麦克风权限，请先允许浏览器访问麦克风。');
      notify('无法获取麦克风权限', 'warning');
      stopAudio();
    }
  };

  useEffect(() => {
    if (!isListening && !isTestingMic) {
      return undefined;
    }

    const analyser = analyserRef.current;
    if (!analyser) {
      return undefined;
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const render = (timestamp) => {
      const delta = Math.min(0.1, (timestamp - lastFrameRef.current) / 1000 || 0);
      lastFrameRef.current = timestamp;

      analyser.getByteFrequencyData(frequencyData);
      let sum = 0;
      for (let index = 0; index < frequencyData.length; index += 1) {
        sum += frequencyData[index] * frequencyData[index];
      }
      const rms = Math.sqrt(sum / frequencyData.length || 0);
      let measuredDb = rms > 0 ? 20 * Math.log10(rms) + 10 : 0;
      measuredDb = Math.max(0, Math.min(100, measuredDb * settings.micGain));
      const nextDbLevel = dbLevelRef.current * 0.78 + measuredDb * 0.22;
      dbLevelRef.current = nextDbLevel;
      setDbLevel(Math.round(nextDbLevel));

      if (phase === 'countdown') {
        const nextCountdown = Math.max(0, countdownRef.current - delta);
        countdownRef.current = nextCountdown;
        setCountdownLeft(Math.ceil(nextCountdown));
        if (nextCountdown <= 0) {
          setPhase('challenge');
          playActionSound('positive');
        }
      } else if (phase === 'challenge' && !isPaused) {
        const hasVoice = nextDbLevel >= settings.threshold;
        const nextRemainingSeconds = Math.max(0, remainingSecondsRef.current - delta);
        remainingSecondsRef.current = nextRemainingSeconds;
        setRemainingSeconds(nextRemainingSeconds);

        if (hasVoice) {
          bufferRemainingRef.current = Math.min(settings.bufferSeconds, bufferRemainingRef.current + delta * 1.5);
          imageCycleRef.current += delta * 5;
          setFlyFrame(Math.floor(imageCycleRef.current) % READING_CHALLENGE_IMAGES.fly.length);
        } else {
          bufferRemainingRef.current = Math.max(0, bufferRemainingRef.current - delta);
        }

        const nextBuffer = bufferRemainingRef.current;
        setBufferRemaining(nextBuffer);
        setIsInBuffer(!hasVoice && nextBuffer < settings.bufferSeconds);

        if (nextRemainingSeconds <= 0) {
          setPhase('success');
          setIsPaused(true);
          playActionSound('positive');
          notify('朗读挑战成功完成', 'success');
        } else if (nextBuffer <= 0) {
          setPhase('failed');
          setIsPaused(true);
          playActionSound('boat_sink');
          notify('挑战失败，声音太小太久了', 'warning');
        }
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
  }, [isListening, isTestingMic, isPaused, phase, settings]);

  const handleRestart = () => {
    resetChallenge('config');
    setIsTestingMic(false);
    playActionSound('boat_start');
  };

  const handleSaveSettings = () => {
    try {
      window.localStorage.setItem(READING_CHALLENGE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      notify('朗读挑战规则已保存，下次会自动使用这套配置', 'success');
    } catch {
      notify('当前环境暂时无法保存配置', 'warning');
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

  const handleReward = async () => {
    if (!currentClass?.id) {
      notify('请先进入一个班级再发放挑战奖励', 'warning');
      return;
    }

    if (eligibleStudents.length === 0) {
      notify('当前班级还没有已唤醒宠物的学生，暂时无法发放挑战奖励', 'warning');
      return;
    }

    const confirmed = await onRequestConfirm?.({
      title: '发放朗读挑战奖励',
      message: `将为 ${currentClass.name} 中 ${eligibleStudents.length} 位已拥有宠物的学生统一发放朗读挑战奖励。\n\n奖励内容：+${settings.rewardEnergy} EXP，+${settings.rewardEnergy} 金币`,
      confirmLabel: '确认发放',
      cancelLabel: '取消',
      tone: 'default',
    });

    if (!confirmed) return;

    setIsRewarding(true);
    try {
      await onFeedStudentsBatch?.(
        eligibleStudents.map((student) => student.id),
        { name: '朗读挑战奖励', icon: '📣', exp: settings.rewardEnergy, coins: settings.rewardEnergy, type: 'positive' },
      );
      setRewardClaimed(true);
      playActionSound('adopt');
      notify('朗读挑战奖励已发放到当前班级', 'success');
    } catch (error) {
      notify(error?.message || '发放奖励失败，请稍后再试', 'warning');
    } finally {
      setIsRewarding(false);
    }
  };

  const totalSeconds = settings.challengeMinutes * 60;
  const bufferPercent = Math.max(0, Math.min(100, (bufferRemaining / settings.bufferSeconds) * 100));
  const gaugePercent = Math.max(0, Math.min(100, dbLevel));
  const challengeProgress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
  const activeFlyImage = READING_CHALLENGE_IMAGES.fly[flyFrame];
  const activeHeroImage = isFailed
    ? READING_CHALLENGE_IMAGES.fail
    : isCompleted
      ? READING_CHALLENGE_IMAGES.success
      : isInBuffer
        ? READING_CHALLENGE_IMAGES.warning
        : activeFlyImage;

  return (
    <div ref={shellRef} className={`reading-challenge-shell phase-${phase}`}>
      {phase === 'config' && (
        <div className="reading-challenge-setup">
          <section className="reading-challenge-panel sound">
            <div className="reading-challenge-panel-head">
              <div className="reading-challenge-panel-icon">🎙️</div>
              <div>
                <h3>朗读挑战</h3>
                <p>先测试现场音量，再开始整班朗读挑战。</p>
              </div>
            </div>

            {micError && <div className="reading-challenge-error">{micError}</div>}

            <div className="reading-challenge-gauge-card compact">
              <div className="reading-challenge-gauge" style={{ '--progress': `${gaugePercent}%` }}>
                <div className="reading-challenge-gauge-inner">
                  <strong>{dbLevel}</strong>
                  <span>{dbLevel >= settings.threshold ? '达标' : '安静'}</span>
                </div>
              </div>
              <button className="reading-challenge-stage-chip" type="button">
                {isTestingMic ? '测试中' : '待测试'}
              </button>
            </div>

            <div className="reading-challenge-mic-actions">
              {!isTestingMic ? (
                <button className="reading-challenge-primary" onClick={startMicTest} type="button">
                  <Mic size={18} />
                  一键测试音量
                </button>
              ) : (
                <button className="reading-challenge-action" onClick={() => setIsTestingMic(false)} type="button">
                  <Pause size={18} />
                  停止测试
                </button>
              )}
              <p>{dbLevel >= settings.threshold ? '当前音量已达挑战阈值。' : `再大声一点（至少 ${settings.threshold} dB）`}</p>
            </div>

            <div className="reading-challenge-settings-grid">
              <label className="reading-challenge-field">
                <span>大声阈值</span>
                <div className="reading-challenge-range">
                  <input type="range" min="10" max="60" value={settings.threshold} onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))} />
                  <strong>{settings.threshold}</strong>
                </div>
              </label>

              <label className="reading-challenge-field">
                <span>麦克风灵敏度</span>
                <div className="reading-challenge-range">
                  <input type="range" min="0.5" max="3" step="0.1" value={settings.micGain} onChange={(event) => setSettings((prev) => ({ ...prev, micGain: Number(event.target.value) }))} />
                  <strong>{settings.micGain.toFixed(1)}x</strong>
                </div>
              </label>
            </div>
          </section>

          <section className="reading-challenge-panel params">
            <div className="reading-challenge-panel-head">
              <div className="reading-challenge-panel-icon">⚙️</div>
              <div>
                <h3>挑战参数</h3>
                <p>{currentClass?.name || '当前班级'} · 发放统一课堂奖励</p>
              </div>
            </div>

            <div className="reading-challenge-settings-grid">
              <label className="reading-challenge-field">
                <span>挑战时长</span>
                <div className="reading-challenge-stepper">
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, challengeMinutes: Math.max(1, prev.challengeMinutes - 1) }))}>-</button>
                  <strong>{settings.challengeMinutes}</strong>
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, challengeMinutes: Math.min(60, prev.challengeMinutes + 1) }))}>+</button>
                  <span>分钟</span>
                </div>
              </label>

              <label className="reading-challenge-field">
                <span>缓冲时间</span>
                <div className="reading-challenge-stepper">
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, bufferSeconds: Math.max(2, prev.bufferSeconds - 1) }))}>-</button>
                  <strong>{settings.bufferSeconds}</strong>
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, bufferSeconds: Math.min(20, prev.bufferSeconds + 1) }))}>+</button>
                  <span>秒</span>
                </div>
              </label>

              <label className="reading-challenge-field">
                <span>奖励能量</span>
                <div className="reading-challenge-stepper">
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, rewardEnergy: Math.max(1, prev.rewardEnergy - 1) }))}>-</button>
                  <strong>{settings.rewardEnergy}</strong>
                  <button type="button" onClick={() => setSettings((prev) => ({ ...prev, rewardEnergy: Math.min(20, prev.rewardEnergy + 1) }))}>+</button>
                  <span>点</span>
                </div>
              </label>
            </div>

            <div className="reading-challenge-reward-preview">
              <img src={READING_CHALLENGE_IMAGES.reward} alt="reward" />
              <div>
                <strong>奖励说明</strong>
                <p>挑战成功后，将给当前班级已唤醒宠物的学生统一发放 +{settings.rewardEnergy} EXP 和 +{settings.rewardEnergy} 金币。</p>
              </div>
            </div>

            <div className="reading-challenge-setup-actions">
              <button className="reading-challenge-action ghost" onClick={toggleFullscreen} type="button">
                <Expand size={16} />
                {isFullscreen ? '退出全屏' : '全屏显示'}
              </button>
              <button className="reading-challenge-save-btn" onClick={handleSaveSettings} type="button">
                保存设置
              </button>
              <button className="reading-challenge-primary start" onClick={startChallenge} type="button">
                开始挑战
              </button>
            </div>
          </section>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="reading-challenge-countdown" style={{ backgroundImage: `url(${READING_CHALLENGE_IMAGES.countdownBg})` }}>
          <button className="reading-challenge-countdown-action" onClick={toggleFullscreen} type="button">
            <Expand size={16} />
            {isFullscreen ? '退出全屏' : '全屏显示'}
          </button>
          <div className="reading-challenge-countdown-rings" />
          <img className="reading-challenge-countdown-hero" src={READING_CHALLENGE_IMAGES.idle} alt="hero" />
          <div className="reading-challenge-countdown-copy">
            <strong>{countdownLeft}</strong>
            <p>准备好了吗？大声朗读吧！</p>
          </div>
          <div className="reading-challenge-countdown-dots">
            <span className={countdownLeft === 3 ? 'active' : ''} />
            <span className={countdownLeft === 2 ? 'active' : ''} />
            <span className={countdownLeft <= 1 ? 'active' : ''} />
          </div>
        </div>
      )}

      {(phase === 'challenge' || phase === 'failed' || phase === 'success') && (
        <div className="reading-challenge-live">
          <aside className="reading-challenge-live-sidebar">
            <div className="reading-challenge-live-status">
              <span />
              {isFailed ? '缓冲耗尽' : isCompleted ? '挑战成功' : isPaused ? '已暂停' : '监听中'}
            </div>

            <div className="reading-challenge-gauge-card live">
              <div className="reading-challenge-gauge" style={{ '--progress': `${gaugePercent}%` }}>
                <div className="reading-challenge-gauge-inner">
                  <strong>{dbLevel}</strong>
                  <span>{dbLevel >= settings.threshold ? '达标' : '安静'}</span>
                </div>
              </div>
              <button className="reading-challenge-stage-chip" type="button">
                {isFailed ? '失败' : isCompleted ? '成功' : isInBuffer ? '缓冲期' : '冲呀'}
              </button>
              <div className="reading-challenge-live-timer">
                <strong>{formatQuietFishTimer(remainingSeconds)}</strong>
                <span>剩余时间</span>
              </div>
            </div>

            <div className="reading-challenge-buffer-card">
              <div className="reading-challenge-buffer-head">
                <span>缓冲期</span>
                <strong>{bufferRemaining.toFixed(1)} 秒</strong>
              </div>
              <div className="reading-challenge-buffer-track">
                <div className="reading-challenge-buffer-fill" style={{ width: `${bufferPercent}%` }} />
              </div>
            </div>

            <div className="reading-challenge-settings-grid live">
              <label className="reading-challenge-field">
                <span>大声阈值</span>
                <div className="reading-challenge-range">
                  <input type="range" min="10" max="60" value={settings.threshold} onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))} />
                  <strong>{settings.threshold}</strong>
                </div>
              </label>

              <label className="reading-challenge-field">
                <span>麦克风灵敏度</span>
                <div className="reading-challenge-range">
                  <input type="range" min="0.5" max="3" step="0.1" value={settings.micGain} onChange={(event) => setSettings((prev) => ({ ...prev, micGain: Number(event.target.value) }))} />
                  <strong>{settings.micGain.toFixed(1)}x</strong>
                </div>
              </label>
            </div>

            <div className="reading-challenge-controls live">
              {isCompleted || isFailed ? (
                <button className="reading-challenge-primary" onClick={handleRestart} type="button">
                  <RotateCcw size={18} />
                  再来一次
                </button>
              ) : (
                <button className="reading-challenge-primary" onClick={() => setIsPaused((prev) => !prev)} type="button">
                  {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  {isPaused ? '继续挑战' : '暂停'}
                </button>
              )}
              <button className="reading-challenge-action ghost" onClick={toggleFullscreen} type="button">
                <Expand size={16} />
                {isFullscreen ? '退出全屏' : '全屏显示'}
              </button>
              <button className="reading-challenge-action" onClick={onClose} type="button">
                退出
              </button>
            </div>
          </aside>

          <section className="reading-challenge-live-stage" style={{ backgroundImage: `url(${READING_CHALLENGE_IMAGES.challengeBg})` }}>
            <img className="reading-challenge-live-sun" src={READING_CHALLENGE_IMAGES.sunGlow} alt="" aria-hidden="true" />
            <img className="reading-challenge-live-cloud cloud-left" src={READING_CHALLENGE_IMAGES.cloud1} alt="" aria-hidden="true" />
            <img className="reading-challenge-live-cloud cloud-right" src={READING_CHALLENGE_IMAGES.cloud2} alt="" aria-hidden="true" />
            <div className="reading-challenge-live-hero-wrap">
              <img className={`reading-challenge-live-hero ${isInBuffer ? 'warning' : ''} ${isFailed ? 'failed' : ''}`} src={activeHeroImage} alt="hero" />
            </div>
            <div className="reading-challenge-live-copy">
              <h3>{isFailed ? '声音太小了！' : isCompleted ? '挑战成功！' : isInBuffer ? '声音小了！快大声！' : '冲呀！声音继续！'}</h3>
              <p>{isFailed ? '宠物快掉下去了，重新开始再试一次。' : isCompleted ? '全班保持住了节奏，准备领取奖励。' : isInBuffer ? '保持声音达标，就能继续前进。' : '保持稳定朗读，飞天进度会继续推进。'}</p>
            </div>
            <div className="reading-challenge-live-footer">
              <span>{formatQuietFishMMSS(totalSeconds - remainingSeconds)}</span>
              <div className="reading-challenge-progress-track">
                <div className="reading-challenge-progress-fill" style={{ width: `${challengeProgress}%` }} />
              </div>
              <span>{formatQuietFishMMSS(totalSeconds)}</span>
            </div>

            {isCompleted && (
              <div className="reading-challenge-reward-card overlay">
                <div>
                  <strong>朗读挑战完成</strong>
                  <p>给当前班 {eligibleStudents.length} 位已唤醒宠物的学生发放统一奖励。</p>
                </div>
                <button className="reading-challenge-reward-btn" onClick={handleReward} type="button" disabled={rewardClaimed || isRewarding}>
                  {rewardClaimed ? '已发放奖励' : isRewarding ? '发放中...' : `发放 +${settings.rewardEnergy} 能量`}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ReadingChallengeTool;
