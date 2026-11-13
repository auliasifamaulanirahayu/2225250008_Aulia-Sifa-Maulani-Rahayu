// Antrian percobaan (outbox) dan sinkronisasi ke Supabase saat online (FR-17).
// Aplikasi tidak pernah menunggu server: semua tersimpan di HP dulu.

import * as db from './db.js';
import { supabase } from '../lib/supabase.js';
import { state, saveTeamCache, saveStats, saveProgress } from '../state.js';

const BATCH = 50;
let syncing = false;
const listeners = new Set();

export const onSync = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const enqueue = (attempt) => db.put('outbox', attempt);
export const pendingCount = () => db.count('outbox');

const canSync = () =>
  supabase &&
  state.profile?.role === 'student' &&
  !state.profile.demo &&
  (typeof navigator === 'undefined' || navigator.onLine !== false);

function dailyRows(days, uid) {
  return days.flatMap((d) => [
    { student_id: uid, day: d.day, mission_type: 'warmup', problem_ids: [], completed: !!d.warmup?.done },
    { student_id: uid, day: d.day, mission_type: 'main', problem_ids: [d.main.problemId], completed: !!d.main.done },
    {
      student_id: uid,
      day: d.day,
      mission_type: 'team',
      problem_ids: d.team.problemIds,
      completed: d.team.problemIds.every((id) => d.team.done.includes(id)),
    },
  ]);
}

export async function flush() {
  if (syncing || !canSync()) return null;
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  syncing = true;
  try {
    for (;;) {
      const items = (await db.getAll('outbox')).slice(0, BATCH);
      if (!items.length) break;
      const { error } = await supabase.from('attempts').upsert(items, { onConflict: 'client_id', ignoreDuplicates: true });
      if (error) throw error;
      for (const it of items) await db.del('outbox', it.client_id);
      if (items.length < BATCH) break;
    }
    const days = (await db.getAll('daily')).sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-7);
    if (days.length) await supabase.from('daily_logs').upsert(dailyRows(days, uid), { onConflict: 'student_id,day,mission_type' });
    if (state.stats.badges.length) {
      await supabase
        .from('student_badges')
        .upsert(state.stats.badges.map((b) => ({ student_id: uid, badge_code: b })), { onConflict: 'student_id,badge_code', ignoreDuplicates: true });
    }
    await supabase.from('student_state').upsert({ student_id: uid, stats: state.stats, progress: state.progress, updated_at: new Date().toISOString() });
    const { data: team } = await supabase.rpc('team_overview');
    if (team) {
      state.teamCache = { ...(state.teamCache || {}), team, syncedAt: new Date().toISOString() };
      await saveTeamCache();
      if (team.challenge?.done && !(state.stats.counters.teamChallengeDone >= 1)) {
        state.stats.counters.teamChallengeDone = 1;
        await saveStats();
      }
    }
    listeners.forEach((fn) => fn());
    return true;
  } catch {
    return null; // coba lagi nanti
  } finally {
    syncing = false;
  }
}

/** Gabungkan cadangan progres di server dengan yang ada di HP (ambil yang terbaik). */
export async function pullRemoteState() {
  if (!supabase) return;
  const { data } = await supabase.from('student_state').select('stats, progress').maybeSingle();
  if (!data) return;
  for (const [id, rec] of Object.entries(data.progress || {})) {
    const local = state.progress[id];
    if (!local || (rec.bestStars || 0) > (local.bestStars || 0) || (rec.done && !local.done)) {
      await saveProgress({ ...local, ...rec, bestStars: Math.max(rec.bestStars || 0, local?.bestStars || 0), done: !!(rec.done || local?.done) });
    }
  }
  const rs = data.stats || {};
  if ((rs.xp || 0) > (state.stats.xp || 0)) {
    const counters = { ...state.stats.counters };
    for (const [k, v] of Object.entries(rs.counters || {})) counters[k] = Math.max(v, counters[k] || 0);
    state.stats = {
      ...state.stats,
      ...rs,
      counters,
      badges: [...new Set([...(state.stats.badges || []), ...(rs.badges || [])])],
    };
    await saveStats();
  }
}

export function startAutoSync() {
  window.addEventListener('online', () => flush());
  setInterval(() => flush(), 5 * 60 * 1000);
  flush();
}
