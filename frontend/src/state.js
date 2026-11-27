// Keadaan aplikasi di memori + penyimpanan ke IndexedDB. Komponen React berlangganan lewat useAppState().

import { useSyncExternalStore } from 'react';
import * as db from './store/db.js';

export const DEFAULT_STATS = {
  xp: 0,
  streak: 0,
  maxStreak: 0,
  lastStreakDay: null,
  shields: 0,
  badges: [],
  counters: {},
  recentM1: 0,
};

export const DEFAULT_SETTINGS = {
  sound: true, // efek suara
  sfxVolume: 0.8,
  music: false, // musik latar: bawaan MATI, tidak pernah berbunyi sendiri
  musicVolume: 0.5,
  musicInProblems: false, // musik di layar soal (bawaan mati: prinsip koherensi)
  theme: 'galaxy', // 'galaxy' | 'light'
  fontScale: 1,
  contrast: false,
  seenIntro: {},
  installDismissed: false,
};

export const state = {
  // {id, role:'student'|'teacher', nickname, avatar, teamId, classroom:{id,name,code}, onboarded, demo}
  profile: null,
  stats: { ...DEFAULT_STATS },
  settings: { ...DEFAULT_SETTINGS },
  progress: {}, // id -> {id, done, bestStars, plays, lastPlayed}
  daily: null,
  teamCache: null,
  passwordRecovery: false, // true bila dibuka dari tautan reset password
};

// ---------------------------------------------------------------- langganan perubahan
let version = 0;
const listeners = new Set();
export function notify() {
  version++;
  listeners.forEach((fn) => fn());
}
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
/** Hook: render ulang komponen setiap kali notify() dipanggil. */
export function useAppState() {
  useSyncExternalStore(subscribe, () => version);
  return state;
}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      /* konteks tidak aman (http di jaringan lokal) */
    }
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function loadState() {
  state.profile = (await db.get('kv', 'profile')) ?? null;
  state.stats = { ...DEFAULT_STATS, ...((await db.get('kv', 'stats')) ?? {}) };
  state.settings = { ...DEFAULT_SETTINGS, ...((await db.get('kv', 'settings')) ?? {}) };
  state.teamCache = (await db.get('kv', 'teamCache')) ?? null;
  state.progress = {};
  for (const p of await db.getAll('progress')) state.progress[p.id] = p;
  applySettings();
}

export const saveProfile = () => db.put('kv', state.profile, 'profile');
export const saveStats = () => db.put('kv', state.stats, 'stats');
export const saveTeamCache = () => db.put('kv', state.teamCache, 'teamCache');
export const saveProgress = (rec) => {
  state.progress[rec.id] = rec;
  return db.put('progress', rec);
};
export async function saveSettings() {
  applySettings();
  await db.put('kv', state.settings, 'settings');
  notify();
}

export function applySettings() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--font-scale', String(state.settings.fontScale || 1));
  root.classList.toggle('high-contrast', !!state.settings.contrast);
  if (state.settings.theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.settings.theme === 'light' ? '#F5F7FF' : '#080B2A');
}

/** Hapus semua data lokal (dipakai saat keluar akun atau ganti pengguna). Pengaturan tampilan dipertahankan. */
export async function resetAll() {
  const keepSettings = { ...state.settings, seenIntro: {} };
  await db.clearAll();
  state.profile = null;
  state.stats = { ...DEFAULT_STATS };
  state.progress = {};
  state.daily = null;
  state.teamCache = null;
  state.settings = keepSettings;
  await db.put('kv', state.settings, 'settings');
  applySettings();
}
