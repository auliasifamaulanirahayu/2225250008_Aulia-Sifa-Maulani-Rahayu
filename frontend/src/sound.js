// Efek suara pendek dari WebAudio (tanpa file audio) + getar ringan + bacakan soal.
// Volume efek suara terpisah dari musik latar (music.js).

import { state } from './state.js';

let ctx = null;

function tone(freq, dur, { type = 'sine', when = 0, gain = 0.08 } = {}) {
  const vol = state.settings.sfxVolume ?? 0.8;
  if (vol <= 0) return;
  gain *= vol;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    /* audio tidak tersedia */
  }
}

const on = () => state.settings.sound !== false;

export const sfx = {
  good() {
    if (!on()) return;
    tone(660, 0.12);
    tone(880, 0.16, { when: 0.1 });
    navigator.vibrate?.(25);
  },
  soft() {
    // bunyi lembut saat belum tepat (bukan bunyi "salah" yang keras)
    if (!on()) return;
    tone(330, 0.15, { type: 'triangle', gain: 0.05 });
  },
  tap() {
    if (!on()) return;
    tone(520, 0.04, { gain: 0.03 });
  },
  win() {
    if (!on()) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { when: i * 0.12 }));
    navigator.vibrate?.([30, 40, 30]);
  },
};

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Bacakan teks dalam Bahasa Indonesia (FR-21). */
export function speak(text) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const spoken = text
    .replace(/Rp(\d)/g, '$1 rupiah ')
    .replace(/−/g, ' minus ')
    .replace(/°C/g, ' derajat Celsius');
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = 'id-ID';
  u.rate = 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('id'));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
