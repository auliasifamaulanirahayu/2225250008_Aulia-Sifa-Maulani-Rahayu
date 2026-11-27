// Logika permainan: misi harian, pencatatan percobaan, XP, bintang, lencana.

import * as db from './store/db.js';
import { enqueue, flush } from './store/sync.js';
import { state, saveStats, saveProgress, uuid, notify } from './state.js';
import { WORLDS, PROBLEMS } from './content.js';
import { pickDaily, missionComplete, unlockedWorlds } from './engine/mission-picker.js';
import { stageXp, starsFor, MISSION_XP, levelFromXp, todayStr, updateStreak } from './engine/xp.js';
import { newBadges } from './engine/badges.js';

export let lastResult = null;

export const unlocked = () => unlockedWorlds(WORLDS, state.progress);

/** Misi hari ini; dibuat sekali per hari dan disimpan. */
export async function ensureDaily() {
  const day = todayStr();
  if (state.daily?.day === day) return state.daily;
  let d = await db.get('daily', day);
  if (!d) {
    d = pickDaily({
      day,
      seed: state.profile?.id || 'tamu',
      worlds: WORLDS,
      progress: state.progress,
      focusSign: (state.stats.recentM1 || 0) >= 2,
    });
    await db.put('daily', d);
  }
  state.daily = d;
  return d;
}

const saveDaily = () => db.put('daily', state.daily);

/** Catat satu percobaan tahap ke outbox (dikirim saat online). */
export async function recordAttempt(a) {
  await enqueue({
    client_id: uuid(),
    problem_id: a.problemId,
    world: a.world ?? 0,
    stage: a.stage,
    correct: !!a.correct,
    misconception_code: a.misconception ?? null,
    hints_used: a.hintsUsed ?? 0,
    attempt_no: a.attemptNo ?? 1,
    duration_ms: Math.max(0, Math.round(a.durationMs ?? 0)),
    answer_raw: String(a.answer ?? '').slice(0, 200),
    xp: a.correct ? a.xp ?? 0 : 0,
    stars: a.stars ?? null,
    client_time: new Date().toISOString(),
  });
}

/** XP satu tahap (setengah bila soal sudah pernah selesai). */
export function xpForStage(problemId, stage) {
  return stageXp(stage, { replay: !!state.progress[problemId]?.done });
}

function addXp(amount) {
  const before = levelFromXp(state.stats.xp);
  state.stats.xp += amount;
  return levelFromXp(state.stats.xp) > before;
}

function bump(key, by = 1) {
  state.stats.counters[key] = (state.stats.counters[key] || 0) + by;
}

/**
 * Dipanggil setelah semua tahap soal selesai.
 * @param run {problem, hintsUsed, stages:{[name]:{firstTry, attempts, xp, given}}, misconceptions:Set, startedAt}
 */
export async function finishProblem(run) {
  const p = run.problem;
  const daily = await ensureDaily();
  const prev = state.progress[p.id];
  const stageList = Object.entries(run.stages);
  const played = stageList.filter(([, s]) => !s.given);
  const allFirstTry = played.every(([, s]) => s.firstTry);
  const stars = starsFor({ hintsUsed: run.hintsUsed, allFirstTry });
  const stageXpTotal = stageList.reduce((sum, [, s]) => sum + (s.xp || 0), 0);
  const lines = [{ label: 'Tahap soal', xp: stageXpTotal }];
  let bonus = 0;

  // misi harian
  if (daily.main.problemId === p.id && !daily.main.done) {
    daily.main.done = true;
    bonus += MISSION_XP.main;
    lines.push({ label: 'Misi Utama selesai', xp: MISSION_XP.main });
    if (run.hintsUsed === 0) {
      bonus += MISSION_XP.mainNoHint;
      lines.push({ label: 'Tanpa petunjuk', xp: MISSION_XP.mainNoHint });
    }
    state.stats = updateStreak(state.stats, daily.day);
  }
  if (daily.team.problemIds.includes(p.id) && !daily.team.done.includes(p.id)) {
    daily.team.done.push(p.id);
    if (daily.team.problemIds.every((id) => daily.team.done.includes(id))) {
      bonus += MISSION_XP.team;
      lines.push({ label: 'Tantangan Tim selesai', xp: MISSION_XP.team });
    }
  }
  if (missionComplete(daily) && !daily.bonus) {
    daily.bonus = true;
    bonus += MISSION_XP.full;
    lines.push({ label: 'Bonus Misi Lengkap', xp: MISSION_XP.full });
  }

  // penghitung lencana
  bump('problemsDone');
  if (run.stages.check && !run.stages.check.given) bump('checkDone');
  if (run.stages.explain) bump('explainDone');
  if (run.stages.understand && !run.stages.understand.given && run.stages.understand.firstTry) bump('understandFirstTry');
  if (p.type === 'balance' && run.stages.solve?.firstTry) bump('world2Clean'); // nama penghitung lama dipertahankan
  if (run.misconceptions.has('M1')) {
    state.stats.counters.signCleanStreak = 0;
    state.stats.recentM1 = (state.stats.recentM1 || 0) + 1;
  } else {
    bump('signCleanStreak');
    state.stats.recentM1 = Math.max(0, (state.stats.recentM1 || 0) - 1);
  }
  if (played.some(([, s]) => s.attempts >= 3)) bump('persevere');

  // reward misi tuntas: semua soal di misi ini selesai untuk pertama kali
  const world = WORLDS.find((w) => w.world === p.world);
  const missionDone = !prev?.done && world.problems.every((q) => q.id === p.id || state.progress[q.id]?.done);
  if (missionDone) bump(`mission${p.world}Done`);

  const levelUp = addXp(stageXpTotal + bonus);
  const badges = newBadges(state.stats);
  state.stats.badges = [...state.stats.badges, ...badges.map((b) => b.code)];

  await saveProgress({
    id: p.id,
    done: true,
    bestStars: Math.max(prev?.bestStars || 0, stars),
    plays: (prev?.plays || 0) + 1,
    lastPlayed: new Date().toISOString(),
  });
  await saveStats();
  await saveDaily();
  await recordAttempt({
    problemId: p.id,
    world: p.world,
    stage: 'complete',
    correct: true,
    hintsUsed: run.hintsUsed,
    durationMs: Date.now() - run.startedAt,
    stars,
  });
  if (bonus) await recordAttempt({ problemId: p.id, world: p.world, stage: 'bonus', correct: true, xp: bonus });
  flush();

  lastResult = {
    kind: 'problem',
    problemId: p.id,
    world: p.world,
    stars,
    lines,
    total: stageXpTotal + bonus,
    levelUp,
    badges,
    missionDone,
    nextId: nextProblemId(p),
  };
  notify();
  return lastResult;
}

export async function finishWarmup(items) {
  const daily = await ensureDaily();
  const lines = [];
  let bonus = 0;
  if (!daily.warmup.done) {
    daily.warmup.done = true;
    bonus += MISSION_XP.warmup;
    lines.push({ label: 'Pemanasan selesai', xp: MISSION_XP.warmup });
    if (missionComplete(daily) && !daily.bonus) {
      daily.bonus = true;
      bonus += MISSION_XP.full;
      lines.push({ label: 'Bonus Misi Lengkap', xp: MISSION_XP.full });
    }
  } else {
    lines.push({ label: 'Latihan tambahan', xp: 0 });
  }
  const levelUp = addXp(bonus);
  const badges = newBadges(state.stats);
  state.stats.badges = [...state.stats.badges, ...badges.map((b) => b.code)];
  await saveStats();
  await saveDaily();
  if (bonus) await recordAttempt({ problemId: `warmup-${daily.day}`, stage: 'bonus', correct: true, xp: bonus });
  flush();
  const firstTry = items.filter((i) => i.firstTry).length;
  lastResult = { kind: 'warmup', stars: firstTry >= 5 ? 3 : firstTry >= 3 ? 2 : 1, lines, total: bonus, levelUp, badges };
  notify();
  return lastResult;
}

export function nextProblemId(p) {
  const w = WORLDS.find((x) => x.world === p.world);
  const idx = w.problems.findIndex((q) => q.id === p.id);
  const after = w.problems.slice(idx + 1).find((q) => !state.progress[q.id]?.done);
  return after?.id ?? w.problems[idx + 1]?.id ?? null;
}

export const problemById = (id) => PROBLEMS.get(id);

/**
 * Rekomendasi aktivitas berikutnya untuk Dashboard.
 * Urutan: Misi Utama hari ini → soal berikutnya di misi aktif → ulangi soal berbintang rendah.
 */
export function recommendation(daily) {
  const open = unlocked();
  if (daily && !daily.main.done) {
    const p = PROBLEMS.get(daily.main.problemId);
    if (p) return { kind: 'main', problem: p, to: `/play/${p.id}?m=main` };
  }
  for (const n of [...open].sort((a, b) => b - a)) {
    const w = WORLDS.find((x) => x.world === n);
    const p = w.problems.find((q) => !state.progress[q.id]?.done);
    if (p) return { kind: 'next', problem: p, to: `/play/${p.id}` };
  }
  const weak = [...PROBLEMS.values()].find((q) => q.type !== 'worked' && (state.progress[q.id]?.bestStars || 0) < 3);
  return weak ? { kind: 'review', problem: weak, to: `/play/${weak.id}` } : null;
}
