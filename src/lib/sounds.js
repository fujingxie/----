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
