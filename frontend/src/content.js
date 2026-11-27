// Memuat bank soal dari content/worlds/*.json (sumber tunggal, ikut dibundel & di-precache).

const modules = import.meta.glob('../../content/worlds/world-*.json', { eager: true, import: 'default' });

export const WORLDS = Object.values(modules).sort((a, b) => a.world - b.world);
for (const w of WORLDS) w.problems.sort((a, b) => a.order - b.order);

// Learning Zone & Challenge Zone (content/zones/*.json, dihasilkan build_worlds.py)
import learning from '../../content/zones/learning.json';
import challenge from '../../content/zones/challenge.json';
export const LESSONS = learning.lessons;
export const CHALLENGE = challenge.questions;
export const CHALLENGE_LEVELS = [
  { key: 'easy', name: 'Easy Mission', emoji: '🌱', desc: 'Satu langkah, bilangan kecil, cerita pendek.' },
  { key: 'medium', name: 'Medium Mission', emoji: '🚀', desc: 'Dua langkah, x di kedua ruas, mencari kesalahan.' },
  { key: 'advanced', name: 'Advanced Mission', emoji: '🌌', desc: 'Kurung, pecahan, negatif, dan masalah sehari-hari.' },
];

export const PROBLEMS = new Map(WORLDS.flatMap((w) => w.problems.map((p) => [p.id, p])));

export const worldOf = (n) => WORLDS.find((w) => w.world === n);

/** Label misi untuk tampilan, mis. "Mission 03". Di data, nomor misi tetap bernama `world`. */
export const missionLabel = (n) => `Mission ${String(n).padStart(2, '0')}`;

export const TYPE_LABEL = {
  worked: 'Contoh',
  faded: 'Contoh bertahap',
  solve: 'Latihan',
  balance: 'Timbangan',
  translate: 'Terjemahkan',
  story: 'Soal cerita',
  literacy: 'Literasi',
};

export function worldStats(world, progress) {
  const w = worldOf(world);
  const done = w.problems.filter((p) => progress[p.id]?.done).length;
  const stars = w.problems.reduce((s, p) => s + (progress[p.id]?.bestStars || 0), 0);
  return { done, total: w.problems.length, stars, maxStars: w.problems.length * 3, complete: done === w.problems.length };
}
