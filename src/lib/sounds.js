let audioContext = null;
let soundEnabled = true;
let soundVolume = 0.8;

const getAudioContext = async () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  return audioContext;
};

const playTone = (ctx, { frequency, startAt, duration, gain = 0.05, type = 'sine' }) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(gain, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
};

const patterns = {
  positive: [
    { frequency: 523.25, offset: 0, duration: 0.14, gain: 0.045, type: 'triangle' },
    { frequency: 659.25, offset: 0.08, duration: 0.16, gain: 0.05, type: 'triangle' },
    { frequency: 783.99, offset: 0.18, duration: 0.2, gain: 0.05, type: 'triangle' },
  ],
  negative: [
    { frequency: 330, offset: 0, duration: 0.12, gain: 0.04, type: 'sawtooth' },
    { frequency: 246.94, offset: 0.1, duration: 0.16, gain: 0.035, type: 'sawtooth' },
  ],
  adopt: [
    { frequency: 659.25, offset: 0, duration: 0.14, gain: 0.045, type: 'triangle' },
    { frequency: 783.99, offset: 0.1, duration: 0.14, gain: 0.05, type: 'triangle' },
    { frequency: 1046.5, offset: 0.22, duration: 0.24, gain: 0.06, type: 'triangle' },
  ],
  boat_start: [
    { frequency: 392, offset: 0, duration: 0.12, gain: 0.038, type: 'triangle' },
    { frequency: 523.25, offset: 0.08, duration: 0.14, gain: 0.04, type: 'triangle' },
    { frequency: 659.25, offset: 0.16, duration: 0.2, gain: 0.045, type: 'triangle' },
  ],
  boat_bail: [
    { frequency: 440, offset: 0, duration: 0.08, gain: 0.028, type: 'square' },
    { frequency: 554.37, offset: 0.06, duration: 0.09, gain: 0.024, type: 'square' },
  ],
  boat_warning: [
    { frequency: 466.16, offset: 0, duration: 0.12, gain: 0.03, type: 'sawtooth' },
    { frequency: 415.3, offset: 0.11, duration: 0.12, gain: 0.026, type: 'sawtooth' },
  ],
  boat_sink: [
    { frequency: 329.63, offset: 0, duration: 0.14, gain: 0.03, type: 'triangle' },
    { frequency: 246.94, offset: 0.12, duration: 0.2, gain: 0.032, type: 'triangle' },
    { frequency: 174.61, offset: 0.28, duration: 0.28, gain: 0.036, type: 'sawtooth' },
  ],
};

export const playActionSound = async (kind) => {
  try {
    if (!soundEnabled) {
      return;
    }

    const ctx = await getAudioContext();
    const pattern = patterns[kind];

    if (!ctx || !pattern) {
      return;
    }

    const startAt = ctx.currentTime + 0.01;
    pattern.forEach((note) => {
      playTone(ctx, {
        frequency: note.frequency,
        startAt: startAt + note.offset,
        duration: note.duration,
        gain: note.gain * soundVolume,
        type: note.type,
      });
    });
  } catch {
    // Ignore sound playback failures to avoid interrupting classroom flows.
  }
};

export const setSoundPreferences = ({ enabled, volume }) => {
  if (typeof enabled === 'boolean') {
    soundEnabled = enabled;
  }

  if (typeof volume === 'number' && Number.isFinite(volume)) {
    soundVolume = Math.min(1, Math.max(0, volume));
  }
};

// ─────────────────────────────────────────────
//  Tiger ambient sound system
// ─────────────────────────────────────────────

let tigerAmbientNodes = [];   // active nodes for current loop
let tigerAmbientTimer = null; // setTimeout handle for snore loop

const clearTigerAmbient = () => {
  if (tigerAmbientTimer) {
    clearTimeout(tigerAmbientTimer);
    tigerAmbientTimer = null;
  }
  tigerAmbientNodes.forEach((n) => {
    try { n.stop?.(); } catch { /* already stopped */ }
    try { n.disconnect?.(); } catch { /* ignore */ }
  });
  tigerAmbientNodes = [];
};

/**
 * Synthesise a single snore breath.
 * One "snore" = slow inhale ramp + short exhale click, ~2s total.
 */
const playSnoreBreath = async () => {
  const ctx = await getAudioContext();
  if (!ctx || !soundEnabled) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.connect(ctx.destination);

  // Low sawtooth carrier — nasal quality
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(88, now);
  osc.frequency.linearRampToValueAtTime(72, now + 1.1);   // pitch drops on exhale

  // Mild lowpass to soften harshness
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, now);
  filter.Q.setValueAtTime(1.2, now);

  osc.connect(filter);
  filter.connect(masterGain);

  // Amplitude envelope: inhale (0→peak) → exhale (peak→0)
  const peak = 0.055 * soundVolume;
  masterGain.gain.linearRampToValueAtTime(peak, now + 0.55);     // inhale
  masterGain.gain.linearRampToValueAtTime(peak * 0.6, now + 1.0); // plateau
  masterGain.gain.linearRampToValueAtTime(0, now + 1.5);          // exhale

  osc.start(now);
  osc.stop(now + 1.6);

  tigerAmbientNodes.push(osc, filter, masterGain);
};

/**
 * Loop snore breaths with a gap between each.
 */
const loopSnore = async () => {
  await playSnoreBreath();
  // schedule next breath after current one finishes (1.6s breath + 0.7s pause)
  tigerAmbientTimer = setTimeout(loopSnore, 2300);
};

/**
 * Synthesise a short low growl (alert state entry).
 * Detuned oscillators + WaveShaper distortion, ~0.85s.
 */
const playGrowl = async () => {
  const ctx = await getAudioContext();
  if (!ctx || !soundEnabled) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.12 * soundVolume, now + 0.06);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
  masterGain.connect(ctx.destination);

  // WaveShaper for growl texture
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 180) * x / (Math.PI + 180 * Math.abs(x));
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = '2x';
  shaper.connect(masterGain);

  // Lowpass to keep it bassy
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(500, now);
  filter.frequency.linearRampToValueAtTime(200, now + 0.85);
  filter.connect(shaper);

  // Three detuned partials for thickness
  [110, 116, 148].forEach((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.85, now + 0.85);
    osc.connect(filter);
    osc.start(now);
    osc.stop(now + 0.9);
    tigerAmbientNodes.push(osc);
  });

  tigerAmbientNodes.push(filter, shaper, masterGain);
};

/**
 * Synthesise a full roar (failed state entry).
 * Noise burst + sweeping oscillator, ~1.8s.
 */
const playRoar = async () => {
  const ctx = await getAudioContext();
  if (!ctx || !soundEnabled) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, now);
  masterGain.gain.exponentialRampToValueAtTime(0.18 * soundVolume, now + 0.08);
  masterGain.gain.setValueAtTime(0.18 * soundVolume, now + 0.5);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  masterGain.connect(ctx.destination);

  // Lowpass + highpass bandpass approximation for roar character
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(1800, now);
  lpf.frequency.linearRampToValueAtTime(600, now + 1.8);
  lpf.connect(masterGain);

  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.setValueAtTime(60, now);
  hpf.connect(lpf);

  // Heavy distortion curve
  const curveBig = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    const x = (i * 2) / 512 - 1;
    curveBig[i] = (Math.PI + 400) * x / (Math.PI + 400 * Math.abs(x));
  }
  const shaper = ctx.createWaveShaper();
  shaper.curve = curveBig;
  shaper.oversample = '4x';
  shaper.connect(hpf);

  // Pitch sweep: starts high, drops into chest
  [180, 220, 290, 360].forEach((startFreq, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.38, now + 1.6);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(1 - idx * 0.18, now);
    osc.connect(oscGain);
    oscGain.connect(shaper);
    osc.start(now);
    osc.stop(now + 1.85);
    tigerAmbientNodes.push(osc, oscGain);
  });

  tigerAmbientNodes.push(lpf, hpf, shaper, masterGain);
};

/**
 * Start tiger state sound.
 * @param {'sleep'|'alert'|'failed'} state
 */
export const startTigerAmbient = (state) => {
  clearTigerAmbient();
  if (state === 'sleep') {
    loopSnore();
  } else if (state === 'alert') {
    playGrowl();
  } else if (state === 'failed') {
    playRoar();
  }
};

/** Stop any active tiger ambient sound. */
export const stopTigerAmbient = () => {
  clearTigerAmbient();
};
