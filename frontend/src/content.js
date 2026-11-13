// Memuat bank soal dari content/worlds/*.json (sumber tunggal, ikut dibundel & di-precache).

const modules = import.meta.glob('../../content/worlds/world-*.json', { eager: true, import: 'default' });

export const WORLDS = Object.values(modules).sort((a, b) => a.world - b.world);
for (const w of WORLDS) w.problems.sort((a, b) => a.order - b.order);

export const PROBLEMS = new Map(WORLDS.flatMap((w) => w.problems.map((p) => [p.id, p])));

export const worldOf = (n) => WORLDS.find((w) => w.world === n);

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
  return { done, total: w.problems.length, stars, maxStars: w.problems.length * 3 };
}
