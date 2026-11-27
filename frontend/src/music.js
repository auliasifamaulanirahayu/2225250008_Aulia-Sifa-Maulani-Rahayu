// Musik latar bertema luar angkasa, dibangkitkan WebAudio (tanpa file audio: hemat kuota & jalan offline).
// Pad lembut berganti akor tiap 8 detik + gema + sesekali "kilau bintang" bernada tinggi.
// Aturan (ketentuan aplikasi): tidak pernah berbunyi sendiri; hanya jalan bila siswa menyalakannya di Pengaturan.
// Browser baru mengizinkan suara setelah ada sentuhan; bila belum, musik menunggu sentuhan pertama.

const CHORDS = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 293.66], // G
  [164.81, 207.65, 246.94], // E
];
const SPARKLE = [880, 987.77, 1174.66, 1318.51, 1567.98]; // pentatonik tinggi
const MAX_GAIN = 0.12; // volume 100% tetap pelan

let ctx = null;
let master = null;
let bus = null;
let timer = null;
let step = 0;
let playing = false;
let volume = 0.5;

function ensureCtx() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function waitForGesture() {
  const resume = () => {
    ctx?.resume();
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
}

function voice(freq, t0, dur, { type = 'sine', gain = 0.22, detune = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.35); // masuk pelan
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // keluar pelan
  osc.connect(g).connect(bus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.1);
}

function playChord() {
  if (!playing || ctx.state !== 'running') return; // jangan menumpuk akor selama audio masih ditahan browser
  const t0 = ctx.currentTime + 0.05;
  const chord = CHORDS[step % CHORDS.length];
  step++;
  chord.forEach((f, i) => {
    voice(f, t0, 10, { gain: 0.16 });
    voice(f, t0, 10, { type: 'triangle', gain: 0.06, detune: i % 2 ? 7 : -7 });
  });
  voice(chord[0] / 2, t0, 10, { gain: 0.2 }); // bas
  // 1–2 kilau bintang acak
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
    voice(f, t0 + 1.5 + Math.random() * 5, 1.6, { gain: 0.035 });
  }
}

/** Mulai musik (aman dipanggil berulang). */
export function startMusic(vol = volume) {
  volume = vol;
  if (typeof window === 'undefined') return;
  try {
    ensureCtx();
  } catch {
    return; // audio tidak tersedia
  }
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
    if (ctx.state !== 'running') waitForGesture();
  }
  if (playing) return setMusicVolume(vol);
  playing = true;
  master = ctx.createGain();
  master.gain.value = 0.0001;
  // gema sederhana: delay dengan umpan balik, lalu filter lembut
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  bus = ctx.createGain();
  bus.connect(filter);
  bus.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(filter);
  filter.connect(master).connect(ctx.destination);
  master.gain.setTargetAtTime(Math.max(0.0001, volume * MAX_GAIN), ctx.currentTime, 1.2);
  playChord();
  timer = setInterval(playChord, 8000);
}

/** Hentikan musik dengan fade-out. */
export function stopMusic() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  const m = master;
  m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  setTimeout(() => m.disconnect(), 1500);
  master = null;
  bus = null;
}

/** Atur volume musik (0–1). */
export function setMusicVolume(vol) {
  volume = vol;
  if (playing && master) master.gain.setTargetAtTime(Math.max(0.0001, vol * MAX_GAIN), ctx.currentTime, 0.2);
}

export const isMusicPlaying = () => playing;
