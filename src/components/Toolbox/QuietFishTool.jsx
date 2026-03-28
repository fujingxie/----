import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock3, Expand, Gift, Mic, Pause, Play, RotateCcw } from 'lucide-react';
import { notify } from '../../lib/notify';

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

const QuietFishTool = () => {
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


export default QuietFishTool;
