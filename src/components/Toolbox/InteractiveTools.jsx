import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Clock3, Expand, Gift, Mic, Pause, Play, RotateCcw } from 'lucide-react';
import { notify } from '../../lib/notify';
import { playActionSound } from '../../lib/sounds';

const QUIET_FISH_DEFAULTS = {
  threshold: 50,
  spawnSeconds: 10,
  fishStyle: 'cartoon',
  surpriseEnabled: true,
  surpriseType: 'whale',
  surpriseMinutes: 1,
};

const LOUD_BOAT_DEFAULTS = {
  threshold: 56,
  leakRate: 18,
  drainPower: 28,
  sinkAfterSeconds: 7,
};

const LOUD_BOAT_SETTINGS_STORAGE_KEY = 'class-pets:loud-boat-settings';
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

const readStoredLoudBoatSettings = () => {
  if (typeof window === 'undefined') {
    return LOUD_BOAT_DEFAULTS;
  }

  try {
    const rawSettings = window.localStorage.getItem(LOUD_BOAT_SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return LOUD_BOAT_DEFAULTS;
    }

    const parsedSettings = JSON.parse(rawSettings);
    return {
      threshold: Number(parsedSettings?.threshold) || LOUD_BOAT_DEFAULTS.threshold,
      leakRate: Number(parsedSettings?.leakRate) || LOUD_BOAT_DEFAULTS.leakRate,
      drainPower: Number(parsedSettings?.drainPower) || LOUD_BOAT_DEFAULTS.drainPower,
      sinkAfterSeconds: Number(parsedSettings?.sinkAfterSeconds) || LOUD_BOAT_DEFAULTS.sinkAfterSeconds,
    };
  } catch {
    return LOUD_BOAT_DEFAULTS;
  }
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

const createQuietFish = (width, height, style = 'cartoon', quality = 0) => {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const size = 18 + quality * 28 + Math.random() * 12;

  return {
    x: direction === 1 ? -size * 2 : width + size * 2,
    y: 150 + Math.random() * Math.max(120, height - 280),
    vx: (1.2 + Math.random() * 1.1) * direction,
    vy: (Math.random() - 0.5) * 0.45,
    size,
    style,
    hue: Math.floor(Math.random() * 360),
    wobble: Math.random() * Math.PI * 2,
    panic: false,
  };
};

const createBubble = (width, height) => ({
  x: Math.random() * width,
  y: height + Math.random() * 120,
  size: 2 + Math.random() * 6,
  speed: 0.45 + Math.random() * 1.1,
  alpha: 0.12 + Math.random() * 0.28,
});

const createSpecialFish = (width, height, type = 'whale') => ({
  type,
  x: -220,
  y: 170 + Math.random() * Math.max(120, height - 300),
  vx: type === 'shark' ? 2.4 : 1.45,
  size: type === 'shark' ? 124 : 176,
  phase: 0,
});

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

export const QuietFishTool = () => {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const uiUpdateRef = useRef(0);
  const lastFrameRef = useRef(0);
  const dbLevelRef = useRef(30);
  const sessionQuietRef = useRef(0);
  const totalQuietRef = useRef(0);
  const fishRef = useRef([]);
  const bubbleRef = useRef([]);
  const specialRef = useRef(null);
  const specialSpawnCooldownRef = useRef(0);
  const [settings, setSettings] = useState(QUIET_FISH_DEFAULTS);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoud, setIsLoud] = useState(false);
  const [dbLevel, setDbLevel] = useState(30);
  const [fishCount, setFishCount] = useState(0);
  const [totalQuietSeconds, setTotalQuietSeconds] = useState(0);
  const [hasSurprise, setHasSurprise] = useState(false);
  const [micError, setMicError] = useState('');
  const [isSettingsVisible, setIsSettingsVisible] = useState(true);

  const surpriseTargetSeconds = settings.surpriseMinutes * 60;
  const surpriseCountdown = Math.max(0, surpriseTargetSeconds - totalQuietSeconds);
  const showSurpriseCountdown = settings.surpriseEnabled;

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

  useEffect(() => () => stopAudio(), []);

  const resetAquarium = () => {
    fishRef.current = [];
    bubbleRef.current = [];
    specialRef.current = null;
    specialSpawnCooldownRef.current = 0;
    sessionQuietRef.current = 0;
    totalQuietRef.current = 0;
    dbLevelRef.current = 30;
    setFishCount(0);
    setTotalQuietSeconds(0);
    setHasSurprise(false);
  };

  const ensureCanvasEntities = (width, height) => {
    if (bubbleRef.current.length === 0) {
      bubbleRef.current = Array.from({ length: 24 }, () => createBubble(width, height));
    }
  };

  const drawFish = (ctx, fish) => {
    ctx.save();
    ctx.translate(fish.x, fish.y);
    ctx.scale(fish.vx >= 0 ? 1 : -1, 1);
    const mainColor = `hsl(${fish.hue} 82% 62%)`;
    const finColor = `hsla(${(fish.hue + 25) % 360} 90% 72% / 0.95)`;

    if (fish.style === 'cartoon') {
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-fish.size * 0.86, 0);
      ctx.lineTo(-fish.size * 1.52, -fish.size * 0.52);
      ctx.lineTo(-fish.size * 1.52, fish.size * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = finColor;
      ctx.beginPath();
      ctx.ellipse(-fish.size * 0.08, -fish.size * 0.44, fish.size * 0.28, fish.size * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(fish.size, 0);
      ctx.quadraticCurveTo(fish.size * 0.15, -fish.size * 0.72, -fish.size, -fish.size * 0.44);
      ctx.lineTo(-fish.size * 1.7, 0);
      ctx.lineTo(-fish.size, fish.size * 0.44);
      ctx.quadraticCurveTo(fish.size * 0.18, fish.size * 0.72, fish.size, 0);
      ctx.fill();
      ctx.fillStyle = finColor;
      ctx.beginPath();
      ctx.moveTo(-fish.size * 0.2, 0);
      ctx.lineTo(fish.size * 0.18, -fish.size * 0.82);
      ctx.lineTo(fish.size * 0.32, -fish.size * 0.12);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(fish.size * 0.55, -fish.size * 0.14, fish.size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.arc(fish.size * 0.6, -fish.size * 0.14, fish.size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawSpecial = (ctx, special, width) => {
    ctx.save();
    ctx.translate(special.x, special.y + Math.sin(special.phase) * 14);
    const facing = special.vx >= 0 ? 1 : -1;
    ctx.scale(facing, 1);

    if (special.type === 'shark') {
      ctx.fillStyle = '#93a6b6';
      ctx.beginPath();
      ctx.moveTo(-special.size, 0);
      ctx.quadraticCurveTo(0, -special.size * 0.45, special.size, -special.size * 0.1);
      ctx.lineTo(special.size * 0.9, special.size * 0.18);
      ctx.quadraticCurveTo(0, special.size * 0.38, -special.size, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-special.size * 0.82, 0);
      ctx.lineTo(-special.size * 1.56, -special.size * 0.42);
      ctx.lineTo(-special.size * 1.56, special.size * 0.22);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(0, 0, special.size, special.size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, special.size * 0.14, special.size * 0.72, special.size * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-special.size * 0.9, 0);
      ctx.lineTo(-special.size * 1.45, -special.size * 0.32);
      ctx.lineTo(-special.size * 1.45, special.size * 0.32);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.arc(special.size * 0.54, -special.size * 0.05, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '700 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(special.type === 'shark' ? '鲨鱼巡游中' : '鲸鱼来访中', Math.min(Math.max(special.x, 120), width - 120), special.y - special.size * 0.66);
    ctx.restore();
  };

  const startListening = async () => {
    try {
      setMicError('');
      resetAquarium();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
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
      setIsListening(true);
      setIsPaused(false);
    } catch {
      setMicError('没有拿到麦克风权限，请先允许浏览器访问麦克风。');
      notify('无法获取麦克风权限', 'warning');
      stopAudio();
    }
  };

  useEffect(() => {
    if (!isListening) {
      return undefined;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const analyser = analyserRef.current;

    if (!canvas || !ctx || !analyser) {
      return undefined;
    }

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const resizeCanvas = () => {
      const nextWidth = canvas.clientWidth || 960;
      const nextHeight = canvas.clientHeight || 620;
      if (canvas.width !== nextWidth) {
        canvas.width = nextWidth;
      }
      if (canvas.height !== nextHeight) {
        canvas.height = nextHeight;
      }
      ensureCanvasEntities(nextWidth, nextHeight);
    };

    const render = (timestamp) => {
      resizeCanvas();
      const width = canvas.width;
      const height = canvas.height;
      const delta = Math.min(0.05, (timestamp - lastFrameRef.current) / 1000 || 0);
      lastFrameRef.current = timestamp;

      let nextDbLevel = dbLevelRef.current;
      if (!isPaused) {
        analyser.getByteFrequencyData(frequencyData);
        let sum = 0;
        for (let index = 0; index < frequencyData.length; index += 1) {
          sum += frequencyData[index] * frequencyData[index];
        }
        const rms = Math.sqrt(sum / frequencyData.length || 0);
        let measuredDb = rms > 0 ? 20 * Math.log10(rms) + 10 : 30;
        measuredDb = Math.max(30, Math.min(100, measuredDb));
        nextDbLevel = dbLevelRef.current * 0.8 + measuredDb * 0.2;
        dbLevelRef.current = nextDbLevel;
      }

      const loudNow = nextDbLevel > settings.threshold;
      if (!isPaused) {
        if (loudNow) {
          sessionQuietRef.current = Math.max(0, sessionQuietRef.current - delta * 4);
        } else {
          totalQuietRef.current += delta;
          sessionQuietRef.current += delta;

          if (sessionQuietRef.current >= settings.spawnSeconds) {
            const quality = Math.min(1, totalQuietRef.current / 600);
            fishRef.current.push(createQuietFish(width, height, settings.fishStyle, quality));
            sessionQuietRef.current = 0;
          }

          if (settings.surpriseEnabled && totalQuietRef.current >= settings.surpriseMinutes * 60) {
            if (!specialRef.current) {
              specialRef.current = createSpecialFish(width, height, settings.surpriseType);
              setHasSurprise(true);
            } else if (specialRef.current.type !== settings.surpriseType) {
              specialRef.current = createSpecialFish(width, height, settings.surpriseType);
            }
          }
        }
      }

      if (!settings.surpriseEnabled) {
        specialRef.current = null;
        specialSpawnCooldownRef.current = 0;
        setHasSurprise(false);
      }

      ctx.clearRect(0, 0, width, height);

      const floorGlow = ctx.createLinearGradient(0, height * 0.74, 0, height);
      floorGlow.addColorStop(0, 'rgba(125, 211, 252, 0)');
      floorGlow.addColorStop(1, 'rgba(14, 165, 233, 0.18)');
      ctx.fillStyle = floorGlow;
      ctx.fillRect(0, height * 0.72, width, height * 0.28);

      for (let seaweedIndex = 0; seaweedIndex < Math.ceil(width / 70); seaweedIndex += 1) {
        const baseX = seaweedIndex * 70 + 24;
        const tipX = baseX + Math.sin(timestamp * 0.0016 + seaweedIndex * 0.7) * 16;
        ctx.strokeStyle = seaweedIndex % 2 === 0 ? 'rgba(34,197,94,0.58)' : 'rgba(16,185,129,0.52)';
        ctx.lineWidth = seaweedIndex % 2 === 0 ? 5 : 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(baseX, height);
        ctx.quadraticCurveTo(baseX - 12, height - 80, tipX, height - 150 - (seaweedIndex % 3) * 18);
        ctx.stroke();
      }

      bubbleRef.current = bubbleRef.current.map((bubble) => {
        const nextBubble = { ...bubble, y: bubble.y - bubble.speed };
        if (nextBubble.y < -24) {
          return createBubble(width, height);
        }
        ctx.fillStyle = `rgba(255,255,255,${nextBubble.alpha})`;
        ctx.beginPath();
        ctx.arc(nextBubble.x, nextBubble.y, nextBubble.size, 0, Math.PI * 2);
        ctx.fill();
        return nextBubble;
      });

      fishRef.current = fishRef.current.filter((fish) => {
        const nextFish = fish;
        nextFish.panic = loudNow;
        if (loudNow) {
          nextFish.vx = (nextFish.x < width / 2 ? -1 : 1) * (5 + nextFish.size / 24);
        } else {
          if (Math.abs(nextFish.vx) > 2.4) {
            nextFish.vx *= 0.94;
          }
          if (Math.abs(nextFish.vx) < 1) {
            nextFish.vx = (nextFish.vx >= 0 ? 1 : -1) * (1.05 + nextFish.size / 80);
          }
        }

        nextFish.x += nextFish.vx;
        nextFish.y += nextFish.vy + Math.sin(nextFish.wobble) * 0.35;
        nextFish.wobble += 0.08;

        if (!loudNow) {
          if (nextFish.x > width - nextFish.size && nextFish.vx > 0) nextFish.vx *= -1;
          if (nextFish.x < nextFish.size && nextFish.vx < 0) nextFish.vx *= -1;
          if (nextFish.y > height - 80 || nextFish.y < 90) nextFish.vy *= -1;
        }

        const onStage = nextFish.x > -240 && nextFish.x < width + 240;
        if (onStage) {
          drawFish(ctx, nextFish);
        }
        return onStage;
      });

      if (specialRef.current) {
        const special = specialRef.current;
        special.phase += 0.05;
        special.x += loudNow ? Math.max(8, special.vx * 4) : special.vx;

        if (special.type === 'shark' && !loudNow && fishRef.current.length > 0) {
          specialSpawnCooldownRef.current += delta;
          if (specialSpawnCooldownRef.current >= 1.5) {
            specialSpawnCooldownRef.current = 0;
            fishRef.current = fishRef.current.filter((fish, index) => index !== 0);
          }
        }

        drawSpecial(ctx, special, width);
        if (special.x > width + special.size * 2) {
          specialRef.current = createSpecialFish(width, height, settings.surpriseType);
          specialSpawnCooldownRef.current = 0;
        }
      }

      if (loudNow) {
        ctx.fillStyle = 'rgba(239,68,68,0.16)';
        ctx.fillRect(0, 0, width, height);
      }

      if (timestamp - uiUpdateRef.current >= 120) {
        uiUpdateRef.current = timestamp;
        setDbLevel(Math.round(nextDbLevel));
        setIsLoud((prev) => (prev === loudNow ? prev : loudNow));
        setFishCount(fishRef.current.length);
        setTotalQuietSeconds(totalQuietRef.current);
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

  return (
    <div ref={shellRef} className={`quiet-fish-shell ${isSettingsVisible ? '' : 'settings-hidden'}`.trim()}>
      <div className={`quiet-fish-stage ${isLoud ? 'is-loud' : ''}`}>
        <canvas ref={canvasRef} className="quiet-fish-canvas" />
        <div className="quiet-fish-scene-decor" aria-hidden="true">
          <div className="quiet-fish-school quiet-fish-school-left">› › › ›</div>
          <div className="quiet-fish-school quiet-fish-school-right">‹ ‹ ‹</div>
          <div className="quiet-fish-coral quiet-fish-coral-left" />
          <div className="quiet-fish-coral quiet-fish-coral-center" />
          <div className="quiet-fish-coral quiet-fish-coral-right" />
        </div>
        <div className={`quiet-fish-warning ${isLoud ? 'show' : ''}`}>
          <strong>太吵啦！</strong>
          <span>小鱼正在慌张逃跑</span>
        </div>

        <div className="quiet-fish-hud">
          <div className="quiet-fish-topbar">
            <div className="quiet-fish-title">
              <div className="quiet-fish-heading">课堂安静养小鱼</div>
              <p>保持安静 {settings.spawnSeconds} 秒，就会收获一条新的小鱼。</p>
            </div>
            <div className="quiet-fish-actions">
              <button className="quiet-fish-action ghost" onClick={toggleFullscreen} type="button">
                <Expand size={16} />
                全屏
              </button>
              {!isListening ? (
                <button className="quiet-fish-primary" onClick={startListening} type="button">
                  <Mic size={18} />
                  开始养鱼
                </button>
              ) : (
                <>
                  <button className="quiet-fish-primary" onClick={() => setIsPaused((prev) => !prev)} type="button">
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                    {isPaused ? '继续养鱼' : '暂停养鱼'}
                  </button>
                  <button className="quiet-fish-action" onClick={resetAquarium} type="button">
                    <RotateCcw size={16} />
                    清空鱼缸
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="quiet-fish-hud-lower">
            <div className="quiet-fish-db-card">
              <div className="quiet-fish-stat-icon">
                <Mic size={24} />
              </div>
              <span className="quiet-fish-db-label">实时音量</span>
              <strong style={{ color: dbLevel > settings.threshold ? '#fecaca' : '#eff6ff' }}>{dbLevel}</strong>
              <span className="quiet-fish-db-unit">dB</span>
            </div>

            <div className="quiet-fish-center-panel">
              <div className="quiet-fish-stats">
                <div className="quiet-fish-stat">
                  <div className="quiet-fish-stat-icon">
                    <span>🐟</span>
                  </div>
                  <span>小鱼数量</span>
                  <strong>{fishCount}</strong>
                </div>
                <div className="quiet-fish-stat">
                  <div className="quiet-fish-stat-icon">
                    <Clock3 size={24} />
                  </div>
                  <span>安静时长</span>
                  <strong>{formatQuietFishTimer(totalQuietSeconds)}</strong>
                </div>
                {showSurpriseCountdown && (
                  <div className="quiet-fish-stat">
                    <div className="quiet-fish-stat-icon">
                      <Gift size={24} />
                    </div>
                    <span>惊喜倒计时</span>
                    <strong>{hasSurprise ? '已出现' : formatQuietFishMMSS(surpriseCountdown)}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isSettingsVisible && (
        <button className="quiet-fish-panel-toggle hidden" onClick={() => setIsSettingsVisible(true)} type="button">
          <span>显示设置</span>
          <ChevronDown size={16} />
        </button>
      )}

      {isSettingsVisible && (
        <div className="quiet-fish-settings">
          <div className="quiet-fish-settings-head">
            <div>
              <h3>养鱼规则</h3>
              <p>保留现场可调，先把鱼缸作为主舞台。</p>
            </div>
            <div className="quiet-fish-settings-head-actions">
              <div className="quiet-fish-status-pill">{isListening ? (isPaused ? '已暂停' : '监听中') : '待启动'}</div>
              <button className="quiet-fish-hide-panel-btn" onClick={() => setIsSettingsVisible(false)} type="button">
                <span>隐藏设置</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {micError && <div className="quiet-fish-error">{micError}</div>}

          <div className="quiet-fish-settings-summary-card">
            <div className="quiet-fish-settings-summary-title">
              <span>养鱼规则</span>
              <div className="quiet-fish-status-pill compact">{isListening ? (isPaused ? '已暂停' : '待启动中') : '待启动'}</div>
            </div>
            <div className="quiet-fish-settings-summary">
              <div className="quiet-fish-summary-chip">阈值 {settings.threshold} dB</div>
              <div className="quiet-fish-summary-chip">孵化 {settings.spawnSeconds} 秒</div>
              <div className="quiet-fish-summary-chip">{settings.fishStyle === 'cartoon' ? '卡通鱼' : '热带鱼'}</div>
              <div className="quiet-fish-summary-chip">
                {settings.surpriseEnabled ? `${settings.surpriseType === 'whale' ? '鲸鱼' : '鲨鱼'} ${settings.surpriseMinutes} 分钟` : '无惊喜'}
              </div>
            </div>
          </div>

          <div className="quiet-fish-settings-grid">
            <label className="quiet-fish-field">
              <span>灵敏度阈值</span>
              <div className="quiet-fish-range">
                <input type="range" min="30" max="100" value={settings.threshold} onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))} />
                <strong>{settings.threshold} dB</strong>
              </div>
            </label>

            <label className="quiet-fish-field">
              <span>小鱼孵化间隔</span>
              <div className="quiet-fish-range">
                <input type="range" min="5" max="120" value={settings.spawnSeconds} onChange={(event) => setSettings((prev) => ({ ...prev, spawnSeconds: Number(event.target.value) }))} />
                <strong>{settings.spawnSeconds} 秒</strong>
              </div>
            </label>

            <label className="quiet-fish-field">
              <span>小鱼风格</span>
              <select value={settings.fishStyle} onChange={(event) => setSettings((prev) => ({ ...prev, fishStyle: event.target.value }))}>
                <option value="cartoon">圆滚滚卡通鱼</option>
                <option value="tropical">炫彩热带鱼</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜模式</span>
              <select value={String(settings.surpriseEnabled)} onChange={(event) => setSettings((prev) => ({ ...prev, surpriseEnabled: event.target.value === 'true' }))}>
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜生物</span>
              <select value={settings.surpriseType} onChange={(event) => setSettings((prev) => ({ ...prev, surpriseType: event.target.value }))} disabled={!settings.surpriseEnabled}>
                <option value="whale">鲸鱼来访</option>
                <option value="shark">鲨鱼巡游</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜触发时间</span>
              <div className="quiet-fish-range">
                <input type="range" min="0.5" max="15" step="0.5" value={settings.surpriseMinutes} onChange={(event) => setSettings((prev) => ({ ...prev, surpriseMinutes: Number(event.target.value) }))} disabled={!settings.surpriseEnabled} />
                <strong>{settings.surpriseMinutes} 分钟</strong>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export const LoudBoatTool = () => {
  const shellRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const dbLevelRef = useRef(30);
  const waterLevelRef = useRef(28);
  const sinkDepthRef = useRef(0);
  const readingSecondsRef = useRef(0);
  const lowVoiceSecondsRef = useRef(0);
  const bailSoundCooldownRef = useRef(0);
  const warningPlayedRef = useRef(false);
  const [settings, setSettings] = useState(() => readStoredLoudBoatSettings());
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [micError, setMicError] = useState('');
  const [dbLevel, setDbLevel] = useState(30);
  const [waterLevel, setWaterLevel] = useState(28);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [lowVoiceSeconds, setLowVoiceSeconds] = useState(0);
  const [drainStrength, setDrainStrength] = useState(0);
  const [boatTilt, setBoatTilt] = useState(0);
  const [sinkDepth, setSinkDepth] = useState(0);
  const [isFailed, setIsFailed] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(true);

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

  useEffect(() => () => stopAudio(), []);

  const resetBoat = () => {
    waterLevelRef.current = 28;
    sinkDepthRef.current = 0;
    readingSecondsRef.current = 0;
    lowVoiceSecondsRef.current = 0;
    bailSoundCooldownRef.current = 0;
    warningPlayedRef.current = false;
    dbLevelRef.current = 30;
    setWaterLevel(28);
    setReadingSeconds(0);
    setLowVoiceSeconds(0);
    setDbLevel(30);
    setDrainStrength(0);
    setBoatTilt(0);
    setSinkDepth(0);
    setIsFailed(false);
  };

  const startListening = async () => {
    try {
      setMicError('');
      resetBoat();
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
      setIsListening(true);
      setIsPaused(false);
      playActionSound('boat_start');
    } catch {
      setMicError('没有拿到麦克风权限，请先允许浏览器访问麦克风。');
      notify('无法获取麦克风权限', 'warning');
      stopAudio();
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
      const delta = Math.min(0.05, (timestamp - lastFrameRef.current) / 1000 || 0);
      lastFrameRef.current = timestamp;

      let nextDbLevel = dbLevelRef.current;
      if (!isPaused && !isFailed) {
        analyser.getByteFrequencyData(frequencyData);
        let sum = 0;
        for (let index = 0; index < frequencyData.length; index += 1) {
          sum += frequencyData[index] * frequencyData[index];
        }
        const rms = Math.sqrt(sum / frequencyData.length || 0);
        let measuredDb = rms > 0 ? 20 * Math.log10(rms) + 10 : 30;
        measuredDb = Math.max(30, Math.min(100, measuredDb));
        nextDbLevel = dbLevelRef.current * 0.8 + measuredDb * 0.2;
        dbLevelRef.current = nextDbLevel;

        const hasVoice = nextDbLevel >= settings.threshold;
        const loudness = hasVoice ? 0.72 + Math.max(0, Math.min(0.28, (nextDbLevel - settings.threshold) / 40)) : 0;
        const drainPerSecond = settings.drainPower * loudness;
        const leakPerSecond = settings.leakRate;
        const nextWaterLevel = Math.max(0, Math.min(100, waterLevelRef.current + (leakPerSecond - drainPerSecond) * delta));
        waterLevelRef.current = nextWaterLevel;
        readingSecondsRef.current += delta;
        lowVoiceSecondsRef.current = hasVoice ? Math.max(0, lowVoiceSecondsRef.current - delta * 2.4) : lowVoiceSecondsRef.current + delta;
        bailSoundCooldownRef.current = Math.max(0, bailSoundCooldownRef.current - delta);

        if (hasVoice && bailSoundCooldownRef.current <= 0) {
          bailSoundCooldownRef.current = 0.34;
          playActionSound('boat_bail');
        }

        if (lowVoiceSecondsRef.current >= settings.sinkAfterSeconds * 0.6) {
          if (!warningPlayedRef.current) {
            warningPlayedRef.current = true;
            playActionSound('boat_warning');
          }
        } else {
          warningPlayedRef.current = false;
        }

        if (nextWaterLevel >= 100 || lowVoiceSecondsRef.current >= settings.sinkAfterSeconds) {
          setIsFailed(true);
          playActionSound('boat_sink');
          notify('船进水太多，已经沉下去了', 'warning');
        }

        setDrainStrength(loudness);
        setWaterLevel(nextWaterLevel);
        setReadingSeconds(readingSecondsRef.current);
        setLowVoiceSeconds(lowVoiceSecondsRef.current);
        setBoatTilt(Math.max(-8, Math.min(14, (nextWaterLevel - 34) * 0.12 + Math.sin(timestamp * 0.0014) * 1.6)));
      } else if (isFailed) {
        sinkDepthRef.current = Math.min(140, sinkDepthRef.current + delta * 38);
        setSinkDepth(sinkDepthRef.current);
        setBoatTilt((prev) => Math.min(22, prev + delta * 12));
      }

      setDbLevel(Math.round(nextDbLevel));
      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isListening, isPaused, isFailed, settings]);

  const restartGame = () => {
    setIsPaused(false);
    resetBoat();
    playActionSound('boat_start');
  };

  const handleSaveSettings = () => {
    try {
      window.localStorage.setItem(LOUD_BOAT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      notify('朗读规则已保存，下次会自动使用这套配置', 'success');
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

  const dangerPercent = Math.min(100, (lowVoiceSeconds / settings.sinkAfterSeconds) * 100);

  return (
    <div ref={shellRef} className={`loud-boat-shell ${isSettingsVisible ? '' : 'settings-hidden'}`.trim()}>
      <div className={`loud-boat-stage ${isFailed ? 'failed' : ''}`.trim()}>
        <div className="loud-boat-backdrop" />
        <div className="loud-boat-river" />
        <div className="loud-boat-floating-notes" aria-hidden="true">
          <span>朗</span>
          <span>读</span>
          <span>加</span>
          <span>油</span>
        </div>

        <div className="loud-boat-hud">
          <div className="loud-boat-topbar">
            <div className="loud-boat-title">
              <div className="loud-boat-heading">大声读救小船</div>
              <p>只要开始朗读，火柴人就会持续排水。声音太小太久，小船就会慢慢沉下去。</p>
            </div>
            <div className="loud-boat-actions">
              <button className="loud-boat-action ghost" onClick={toggleFullscreen} type="button">
                <Expand size={16} />
                全屏
              </button>
              {!isListening ? (
                <button className="loud-boat-primary" onClick={startListening} type="button">
                  <Mic size={18} />
                  开始朗读
                </button>
              ) : (
                <>
                  <button className="loud-boat-primary" onClick={() => setIsPaused((prev) => !prev)} type="button">
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                    {isPaused ? '继续朗读' : '暂停朗读'}
                  </button>
                  <button className="loud-boat-action" onClick={restartGame} type="button">
                    <RotateCcw size={16} />
                    重新开始
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="loud-boat-stats">
            <div className="loud-boat-stat">
              <span>实时音量</span>
              <strong>{dbLevel} dB</strong>
            </div>
            <div className="loud-boat-stat">
              <span>船舱进水</span>
              <strong>{Math.round(waterLevel)}%</strong>
            </div>
            <div className="loud-boat-stat">
              <span>朗读时长</span>
              <strong>{formatQuietFishTimer(readingSeconds)}</strong>
            </div>
            <div className={`loud-boat-stat ${dangerPercent > 60 ? 'danger' : ''}`}>
              <span>低音量危险</span>
              <strong>{Math.max(0, settings.sinkAfterSeconds - lowVoiceSeconds).toFixed(1)} 秒</strong>
            </div>
          </div>
        </div>

        <div className="loud-boat-scene">
          <div className="loud-boat-waterline" />
          <div className={`loud-boat-raft ${isFailed ? 'failed' : ''}`} style={{ transform: `translateY(${sinkDepth}px) rotate(${boatTilt}deg)` }}>
            <div className="loud-boat-water-fill" style={{ height: `${waterLevel}%` }} />
            <div className="loud-boat-hull-body">
              <span />
              <span />
              <span />
            </div>
            <div className="loud-boat-monkey-wrap">
              <div className={`loud-boat-stickman ${drainStrength > 0.12 ? 'working' : ''}`} style={{ '--pump-speed': `${Math.max(0.5, 1.6 - drainStrength)}s` }}>
                <div className="loud-boat-stickman-head" />
                <div className="loud-boat-stickman-body" />
                <div className="loud-boat-stickman-arm left" />
                <div className="loud-boat-stickman-arm right" />
                <div className="loud-boat-stickman-leg left" />
                <div className="loud-boat-stickman-leg right" />
                <div className="loud-boat-bucket" />
                <div className="loud-boat-splash" style={{ opacity: Math.max(0.08, drainStrength) }} />
              </div>
            </div>
          </div>
        </div>

        {isFailed && (
          <div className="loud-boat-fail-banner">
            <strong>沉船了</strong>
            <span>声音太小太久，火柴人已经来不及把水排出去。</span>
          </div>
        )}
      </div>

      {!isSettingsVisible && (
        <button className="loud-boat-panel-toggle hidden" onClick={() => setIsSettingsVisible(true)} type="button">
          <span>显示设置</span>
          <ChevronDown size={16} />
        </button>
      )}

      {isSettingsVisible && (
        <div className="loud-boat-settings">
          <div className="loud-boat-settings-head">
            <div>
              <h3>朗读规则</h3>
              <p>通过麦克风音量控制火柴人排水节奏，水满前坚持把小船保住。</p>
            </div>
            <div className="loud-boat-settings-head-actions">
              <div className="loud-boat-status-pill">{isListening ? (isPaused ? '已暂停' : '监听中') : '待启动'}</div>
              <button className="loud-boat-save-settings-btn" onClick={handleSaveSettings} type="button">
                保存设置
              </button>
              <button className="loud-boat-hide-panel-btn" onClick={() => setIsSettingsVisible(false)} type="button">
                <span>隐藏设置</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {micError && <div className="loud-boat-error">{micError}</div>}

          <div className="loud-boat-settings-summary-card">
            <div className="loud-boat-settings-summary-title">
              <span>当前挑战</span>
              <div className="loud-boat-status-pill compact">{isFailed ? '已沉船' : '进行中'}</div>
            </div>
            <div className="loud-boat-settings-summary">
              <div className="loud-boat-summary-chip">阈值 {settings.threshold} dB</div>
              <div className="loud-boat-summary-chip">漏水 {settings.leakRate}/秒</div>
              <div className="loud-boat-summary-chip">排水 {settings.drainPower}/秒</div>
              <div className="loud-boat-summary-chip">低音量 {settings.sinkAfterSeconds} 秒沉船</div>
            </div>
          </div>

          <div className="loud-boat-danger-meter">
            <div className="loud-boat-danger-copy">
              <span>沉船警报</span>
              <strong>{Math.round(dangerPercent)}%</strong>
            </div>
            <div className="loud-boat-danger-track">
              <div className="loud-boat-danger-fill" style={{ width: `${dangerPercent}%` }} />
            </div>
          </div>

          <div className="loud-boat-settings-grid">
            <label className="loud-boat-field">
              <span>有效朗读阈值</span>
              <div className="loud-boat-range">
                <input type="range" min="40" max="80" value={settings.threshold} onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))} />
                <strong>{settings.threshold} dB</strong>
              </div>
            </label>

            <label className="loud-boat-field">
              <span>船底漏水速度</span>
              <div className="loud-boat-range">
                <input type="range" min="8" max="30" value={settings.leakRate} onChange={(event) => setSettings((prev) => ({ ...prev, leakRate: Number(event.target.value) }))} />
                <strong>{settings.leakRate} / 秒</strong>
              </div>
            </label>

            <label className="loud-boat-field">
              <span>火柴人最大排水</span>
              <div className="loud-boat-range">
                <input type="range" min="12" max="42" value={settings.drainPower} onChange={(event) => setSettings((prev) => ({ ...prev, drainPower: Number(event.target.value) }))} />
                <strong>{settings.drainPower} / 秒</strong>
              </div>
            </label>

            <label className="loud-boat-field">
              <span>低音量容错</span>
              <div className="loud-boat-range">
                <input type="range" min="3" max="15" value={settings.sinkAfterSeconds} onChange={(event) => setSettings((prev) => ({ ...prev, sinkAfterSeconds: Number(event.target.value) }))} />
                <strong>{settings.sinkAfterSeconds} 秒</strong>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReadingChallengeTool = ({ currentClass, students = [], onClose, onFeedStudentsBatch, onRequestConfirm }) => {
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
