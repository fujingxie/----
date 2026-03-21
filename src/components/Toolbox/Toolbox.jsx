import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Toolbox.css';
import {
  ChevronDown,
  Clock3,
  Expand,
  Gift,
  Lock,
  Map,
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
import { notify } from '../../lib/notify';
import SmartSeatingTool from './SmartSeatingTool';

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
  quiet_study: 'vip2',
};

const Toolbox = ({
  user,
  currentClass,
  students,
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
    { id: 'mic_power', name: '大声读', icon: <Mic size={32} />, color: '#f43f5e', status: 'coming' },
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
            {tool.minLevel !== 'temporary' && tool.unlocked && tool.status === 'ready' && (
              <div className="tool-tag ready">已可用</div>
            )}
            {tool.minLevel !== 'temporary' && tool.unlocked && tool.status !== 'ready' && (
              <div className="tool-tag coming">开发中</div>
            )}
            {tool.minLevel === 'temporary' && tool.status === 'ready' && <div className="tool-tag">全员可用</div>}
            {tool.minLevel === 'temporary' && tool.status !== 'ready' && <div className="tool-tag coming">开发中</div>}
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

      <Modal
        isOpen={activeTool === 'read_forest'}
        onClose={() => setActiveTool(null)}
        showHeader={false}
        contentClassName="quiet-fish-modal"
        bodyClassName="quiet-fish-modal-body"
      >
        <QuietFishTool onClose={() => setActiveTool(null)} />
      </Modal>

      <Modal
        isOpen={activeTool === 'smart_seating'}
        onClose={() => setActiveTool(null)}
        title="智能排座"
        contentClassName="smart-seating-modal"
        bodyClassName="smart-seating-modal-body"
      >
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

const QUIET_FISH_DEFAULTS = {
  threshold: 50,
  spawnSeconds: 10,
  fishStyle: 'cartoon',
  surpriseEnabled: true,
  surpriseType: 'whale',
  surpriseMinutes: 1,
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

const QuietFishTool = ({ onClose }) => {
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
  const [sessionQuietSeconds, setSessionQuietSeconds] = useState(0);
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
    setSessionQuietSeconds(0);
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
    } catch (error) {
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
        if (hasSurprise) {
          setHasSurprise(false);
        }
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
        setSessionQuietSeconds(sessionQuietRef.current);
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
        <button
          className="quiet-fish-panel-toggle hidden"
          onClick={() => setIsSettingsVisible(true)}
          type="button"
        >
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
              <button
                className="quiet-fish-hide-panel-btn"
                onClick={() => setIsSettingsVisible(false)}
                type="button"
              >
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
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={settings.threshold}
                  onChange={(event) => setSettings((prev) => ({ ...prev, threshold: Number(event.target.value) }))}
                />
                <strong>{settings.threshold} dB</strong>
              </div>
            </label>

            <label className="quiet-fish-field">
              <span>小鱼孵化间隔</span>
              <div className="quiet-fish-range">
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={settings.spawnSeconds}
                  onChange={(event) => setSettings((prev) => ({ ...prev, spawnSeconds: Number(event.target.value) }))}
                />
                <strong>{settings.spawnSeconds} 秒</strong>
              </div>
            </label>

            <label className="quiet-fish-field">
              <span>小鱼风格</span>
              <select
                value={settings.fishStyle}
                onChange={(event) => setSettings((prev) => ({ ...prev, fishStyle: event.target.value }))}
              >
                <option value="cartoon">圆滚滚卡通鱼</option>
                <option value="tropical">炫彩热带鱼</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜模式</span>
              <select
                value={String(settings.surpriseEnabled)}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    surpriseEnabled: event.target.value === 'true',
                  }))
                }
              >
                <option value="true">开启</option>
                <option value="false">关闭</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜生物</span>
              <select
                value={settings.surpriseType}
                onChange={(event) => setSettings((prev) => ({ ...prev, surpriseType: event.target.value }))}
                disabled={!settings.surpriseEnabled}
              >
                <option value="whale">鲸鱼来访</option>
                <option value="shark">鲨鱼巡游</option>
              </select>
            </label>

            <label className="quiet-fish-field">
              <span>惊喜触发时间</span>
              <div className="quiet-fish-range">
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={settings.surpriseMinutes}
                  onChange={(event) => setSettings((prev) => ({ ...prev, surpriseMinutes: Number(event.target.value) }))}
                  disabled={!settings.surpriseEnabled}
                />
                <strong>{settings.surpriseMinutes} 分钟</strong>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

const RandomPickerTool = ({ students }) => {
  const [pickCount, setPickCount] = useState(1);
  const [pickedStudents, setPickedStudents] = useState([]);
  const [recentPicks, setRecentPicks] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [repeatMode, setRepeatMode] = useState('recent-5');
  const [roundPool, setRoundPool] = useState([]);

  const maxPickCount = Math.min(5, Math.max(1, students.length));
  const activePickCount = Math.min(pickCount, maxPickCount);

  const pickUniqueStudents = (source, count) => {
    const pool = [...source];
    const winners = [];

    while (pool.length > 0 && winners.length < count) {
      const nextIndex = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(nextIndex, 1)[0]);
    }

    return winners;
  };

  const resolveCandidateStudents = (count) => {
    if (repeatMode === 'round-robin') {
      let nextRoundPool = roundPool.filter((studentId) =>
        students.some((student) => student.id === studentId),
      );
      if (nextRoundPool.length < count) {
        nextRoundPool = students.map((student) => student.id);
      }
      const poolStudents = students.filter((student) => nextRoundPool.includes(student.id));
      const winners = pickUniqueStudents(poolStudents, count);
      const remainingIds = nextRoundPool.filter((studentId) => !winners.some((student) => student.id === studentId));

      setRoundPool(remainingIds);
      return winners;
    }

    if (repeatMode === 'recent-5') {
      const recentIds = new Set(
        recentPicks
          .slice(0, 5)
          .flatMap((entry) => entry.students.map((student) => student.id)),
      );
      const filteredStudents = students.filter((student) => !recentIds.has(student.id));
      const candidateStudents = filteredStudents.length >= count ? filteredStudents : students;
      return pickUniqueStudents(candidateStudents, count);
    }

    return pickUniqueStudents(students, count);
  };

  const startRandomSelect = () => {
    if (students.length === 0) {
      return;
    }

    const safeCount = Math.min(activePickCount, students.length);
    setIsRolling(true);
    let count = 0;
    let finalWinners = [];
    const interval = setInterval(() => {
      const rollingWinners = pickUniqueStudents(students, safeCount);
      setPickedStudents(rollingWinners);
      count += 1;

      if (count > 18) {
        clearInterval(interval);
        finalWinners = resolveCandidateStudents(safeCount);
        setPickedStudents(finalWinners);
        setRecentPicks((prev) => {
          const nextEntry = {
            id: `${Date.now()}-${finalWinners.map((student) => student.id).join('-')}`,
            students: finalWinners,
            mode: repeatMode,
            createdAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
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

        <div className="random-mode-tabs">
          <button
            className={`random-mode-tab ${repeatMode === 'recent-5' ? 'active' : ''}`}
            onClick={() => setRepeatMode('recent-5')}
            type="button"
          >
            最近 5 次不重复
          </button>
          <button
            className={`random-mode-tab ${repeatMode === 'round-robin' ? 'active' : ''}`}
            onClick={() => setRepeatMode('round-robin')}
            type="button"
          >
            本轮全员点完再重置
          </button>
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
                <div className="random-history-copy">
                  <div className="random-history-names">
                    {entry.students.map((student) => student.name).join('、')}
                  </div>
                  <span className="random-history-meta">
                    {entry.mode === 'round-robin' ? '轮询模式' : '最近去重'} · {entry.createdAt}
                  </span>
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
