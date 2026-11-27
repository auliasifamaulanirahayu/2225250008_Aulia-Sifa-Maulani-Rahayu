// Poin, bintang, level, dan streak (docs/GAME_DESIGN.md §4).

export const STAGE_XP = { understand: 2, model: 3, solve: 3, check: 5, interpret: 5, explain: 5 };
export const MISSION_XP = { warmup: 10, main: 30, mainNoHint: 10, team: 20, full: 20 };
export const MAX_SHIELDS = 2;
// Learning Zone & Challenge Zone. HARUS sama dengan clamp_attempt di supabase/migrations/0003_zones.sql.
// XP hanya diberikan sekali: materi pertama kali tuntas, soal tantangan pertama kali benar.
export const ZONE_XP = { lesson: 10, challengeFirstTry: 3, challengeRetry: 1 };

/** XP satu soal Challenge Zone (0 bila sudah pernah benar). */
export function challengeXp({ firstTry, alreadySolved }) {
  if (alreadySolved) return 0;
  return firstTry ? ZONE_XP.challengeFirstTry : ZONE_XP.challengeRetry;
}

/** XP satu tahap; pengulangan soal yang sudah selesai mendapat setengahnya. */
export function stageXp(stage, { replay = false } = {}) {
  const xp = STAGE_XP[stage] ?? 0;
  return replay ? Math.floor(xp / 2) : xp;
}

/** ★★★ tanpa petunjuk & benar di percobaan pertama, ★★ petunjuk ≤ 1, ★ selesai. */
export function starsFor({ hintsUsed, allFirstTry }) {
  if (hintsUsed === 0 && allFirstTry) return 3;
  if (hintsUsed <= 1) return 2;
  return 1;
}

/** XP total yang dibutuhkan untuk mencapai level L: 50·1 + 50·2 + … + 50·(L−1). */
export const xpForLevel = (level) => 25 * level * (level - 1);

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function titleFor(level) {
  if (level >= 15) return 'Agen Master Ruas';
  if (level >= 10) return 'Agen Ahli';
  if (level >= 5) return 'Agen Penyelidik';
  return 'Agen Pemula';
}

export function levelInfo(xp) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  return { level, title: titleFor(level), current: xp - base, needed: xpForLevel(level + 1) - base };
}

// ------------------------------------------------------------------ tanggal & streak
export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dayDiff(a, b) {
  const toUtc = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}

/**
 * Perbarui streak saat Misi Utama hari `today` selesai.
 * Tameng melindungi streak bila absen tepat 1 hari. Streak putus tidak menghapus XP.
 */
export function updateStreak(stats, today) {
  const s = { ...stats };
  const last = s.lastStreakDay;
  if (last === today) return s;
  const gap = last ? dayDiff(last, today) : null;
  if (gap === 1) s.streak = (s.streak || 0) + 1;
  else if (gap === 2 && (s.shields || 0) > 0) {
    s.shields -= 1;
    s.streak = (s.streak || 0) + 1;
  } else s.streak = 1;
  s.lastStreakDay = today;
  s.maxStreak = Math.max(s.maxStreak || 0, s.streak);
  if (s.streak % 7 === 0) s.shields = Math.min(MAX_SHIELDS, (s.shields || 0) + 1);
  return s;
}

/** Streak yang ditampilkan: 0 bila sudah lewat lebih dari 1 hari (atau 2 hari dengan tameng). */
export function visibleStreak(stats, today) {
  if (!stats.lastStreakDay) return 0;
  const gap = dayDiff(stats.lastStreakDay, today);
  if (gap <= 1) return stats.streak || 0;
  if (gap === 2 && (stats.shields || 0) > 0) return stats.streak || 0;
  return 0;
}
