let voiceEnabled = true;
let activeUtterance = null;

const pickChineseVoice = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  return (
    voices.find((voice) => voice.lang === 'zh-CN')
    || voices.find((voice) => voice.lang?.startsWith('zh'))
    || null
  );
};

export const stopVoicePlayback = () => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  activeUtterance = null;
  window.speechSynthesis.cancel();
};

export const speakText = (text) => {
  try {
    if (!voiceEnabled || !text || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      return;
    }

    stopVoicePlayback();

    const utterance = new window.SpeechSynthesisUtterance(text);
    const voice = pickChineseVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'zh-CN';
    } else {
      utterance.lang = 'zh-CN';
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore browser speech failures so classroom actions keep working.
  }
};

export const setVoiceEnabled = (enabled) => {
  if (typeof enabled === 'boolean') {
    voiceEnabled = enabled;
  }

  if (!voiceEnabled) {
    stopVoicePlayback();
  }
};
