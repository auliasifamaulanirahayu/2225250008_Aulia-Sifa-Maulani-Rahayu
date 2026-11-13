// Pemilih 3 misi harian (docs/GAME_DESIGN.md §2). Murni: hasil sama untuk input sama.

import { rng } from './rng.js';

export const UNLOCK_RATIO = 0.7;

/** Dunia n terbuka bila ≥ 70% soal dunia n−1 sudah selesai. */
export function unlockedWorlds(worlds, progress) {
  const open = [];
  for (const w of worlds) {
    if (w.world === 1) {
      open.push(1);
      continue;
    }
    const prev = worlds.find((x) => x.world === w.world - 1);
    if (!prev || !open.includes(prev.world)) break;
    const done = prev.problems.filter((p) => progress[p.id]?.done).length;
    if (done >= Math.ceil(prev.problems.length * UNLOCK_RATIO)) open.push(w.world);
    else break;
  }
  return open;
}

const byOrder = (a, b) => a.order - b.order;

/**
 * @param {{day:string, seed:string, worlds:Array, progress:Object, focusSign?:boolean}} p
 */
export function pickDaily({ day, seed, worlds, progress, focusSign = false }) {
  const r = rng(`${seed}-${day}`);
  const open = unlockedWorlds(worlds, progress);
  const active = Math.max(...open);
  const inWorld = (n) => (worlds.find((w) => w.world === n)?.problems ?? []).slice().sort(byOrder);

  // Misi Utama: soal berikutnya yang belum selesai di dunia aktif (lalu dunia sebelumnya)
  let main = null;
  for (const n of [...open].sort((a, b) => b - a)) {
    main = inWorld(n).find((p) => !progress[p.id]?.done && p.type !== 'worked') ?? inWorld(n).find((p) => !progress[p.id]?.done);
    if (main) break;
  }
  if (!main) {
    const pool = inWorld(active).filter((p) => p.type !== 'worked');
    main = pool[Math.floor(r() * pool.length)];
  }

  // Tantangan Tim: 2 soal latihan dari dunia yang sudah terbuka (bukan contoh)
  const pool = open
    .flatMap(inWorld)
    .filter((p) => p.id !== main.id && p.type !== 'worked' && p.type !== 'faded');
  const team = [];
  while (team.length < 2 && pool.length) {
    const i = Math.floor(r() * pool.length);
    team.push(pool.splice(i, 1)[0].id);
  }

  return {
    day,
    warmup: { done: false, focusSign },
    main: { problemId: main.id, done: false },
    team: { problemIds: team, done: [] },
    bonus: false,
  };
}

export const missionComplete = (daily) =>
  daily.warmup.done && daily.main.done && daily.team.problemIds.every((id) => daily.team.done.includes(id));
