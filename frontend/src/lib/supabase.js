// Klien Supabase. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di frontend/.env (lihat .env.example).

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && key);

// Tautan "lupa password" dari email membawa token di hash (#access_token=…&type=recovery).
// Ditangkap SEBELUM klien dibuat, karena klien langsung membersihkan hash dan HashRouter juga memakai hash.
export const recoveryLink = typeof location !== 'undefined' && /type=recovery/.test(location.hash);

export const supabase = supabaseReady
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'math-mission-auth' },
    })
  : null;

const MESSAGES = {
  CLASS_NOT_FOUND: 'Kode kelas tidak ditemukan. Cek lagi ke gurumu.',
  FORBIDDEN: 'Kamu tidak punya akses ke data ini.',
  NOT_TEACHER: 'Fitur ini hanya untuk akun guru.',
  RESEARCH_MODE_OFF: 'Mode penelitian belum aktif untuk kelas ini.',
  'Invalid login credentials': 'Data masuk salah. Cek lagi isianmu.',
  'User already registered': 'Akun ini sudah terdaftar. Silakan masuk.',
  'Failed to fetch': 'Tidak ada internet atau server belum bisa dihubungi.',
};

/** Ubah error Supabase menjadi kalimat sederhana. */
export function friendlyError(err) {
  const raw = err?.message || String(err || '');
  for (const [k, v] of Object.entries(MESSAGES)) if (raw.includes(k)) return v;
  if (/network|fetch|timeout/i.test(raw)) return MESSAGES['Failed to fetch'];
  if (/password/i.test(raw) && /6/.test(raw)) return 'PIN/password minimal 6 karakter.';
  if (/rate limit/i.test(raw)) return 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.';
  return raw || 'Terjadi kesalahan. Coba lagi.';
}

/** Panggil RPC dan lempar error yang ramah. */
export async function rpc(name, params) {
  if (!supabase) throw new Error('Supabase belum diatur.');
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(friendlyError(error));
  return data;
}
