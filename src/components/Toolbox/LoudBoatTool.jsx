import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Expand, Mic, Pause, Play, RotateCcw } from 'lucide-react';
import { notify } from '../../lib/notify';
import { playActionSound } from '../../lib/sounds';

const LOUD_BOAT_DEFAULTS = {
  threshold: 56,
  leakRate: 18,
  drainPower: 28,
  sinkAfterSeconds: 7,
};

const LOUD_BOAT_SETTINGS_STORAGE_KEY = 'class-pets:loud-boat-settings';

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

const formatQuietFishTimer = (totalSeconds) => {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const LoudBoatTool = () => {
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


export default LoudBoatTool;
