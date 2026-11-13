// Login & pendaftaran (Supabase Auth).
// - Guru: email + password.
// - Siswa: kode kelas + nama panggilan + PIN 6 angka, TANPA email asli (privasi anak).
//   Di balik layar dibuat alamat sintetis <kode>.<nama>-<hash>@<domain> yang tidak pernah menerima email.

import { supabase, supabaseReady, friendlyError, rpc } from './supabase.js';
import { hashString } from '../engine/rng.js';
import { state, saveProfile, resetAll, notify } from '../state.js';
import { pullRemoteState, flush } from '../store/sync.js';
import { resetDemoCache } from './teacherApi.js';

const DOMAIN = import.meta.env?.VITE_STUDENT_EMAIL_DOMAIN || 'siswa.math-mission.app';

export function studentEmail(classCode, nickname) {
  const nick = nickname.trim().toLowerCase();
  const slug =
    nick
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'siswa';
  const tag = hashString(nick).toString(36).slice(0, 6);
  return `${classCode.toLowerCase()}.${slug}-${tag}@${DOMAIN}`;
}

async function loadProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, display_name, avatar, team_id, classroom_id, classrooms:classroom_id (id, name, code)')
    .eq('id', user.id)
    .single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

async function adoptUser(user) {
  const remote = await loadProfile(user);
  if (state.profile?.id && state.profile.id !== user.id) await resetAll(); // HP dipakai bergantian: pisahkan data
  state.profile = {
    ...(state.profile?.id === user.id ? state.profile : {}),
    id: user.id,
    role: remote.role,
    nickname: remote.display_name,
    avatar: remote.avatar,
    teamId: remote.team_id,
    classroom: remote.classrooms || null,
    onboarded: true,
    demo: false,
  };
  await saveProfile();
  if (remote.role === 'student') await pullRemoteState();
  notify();
  return state.profile;
}

/** Saat aplikasi dibuka: pakai sesi tersimpan (bisa offline). */
export async function initAuth() {
  if (!supabaseReady) return;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) {
    if (state.profile && !state.profile.demo) await resetAll();
    return;
  }
  try {
    await adoptUser(user);
  } catch {
    /* offline: tetap pakai profil yang tersimpan di HP */
  }
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      resetAll().then(notify);
    }
  });
}

export async function signUpStudent({ classCode, nickname, pin, avatar }) {
  const code = classCode.trim().toUpperCase();
  const cls = await rpc('check_class', { p_code: code });
  if (!cls?.length) throw new Error('Kode kelas tidak ditemukan. Cek lagi ke gurumu.');
  const free = await rpc('nickname_available', { p_code: code, p_nick: nickname });
  if (!free) throw new Error('Nama panggilan ini sudah dipakai di kelasmu. Jika itu kamu, pilih "Masuk".');
  const { data, error } = await supabase.auth.signUp({
    email: studentEmail(code, nickname),
    password: pin,
    options: { data: { role: 'student', class_code: code, nickname: nickname.trim(), avatar } },
  });
  if (error) throw new Error(friendlyError(error));
  if (!data.session) {
    throw new Error('Akun dibuat, tetapi konfirmasi email masih aktif di Supabase. Minta guru/admin menonaktifkan "Confirm email".');
  }
  await adoptUser(data.user);
  flush();
}

export async function signInStudent({ classCode, nickname, pin }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: studentEmail(classCode.trim().toUpperCase(), nickname),
    password: pin,
  });
  if (error) {
    throw new Error(/Invalid login/.test(error.message) ? 'Kode kelas, nama panggilan, atau PIN salah.' : friendlyError(error));
  }
  await adoptUser(data.user);
  flush();
}

export async function signUpTeacher({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { role: 'teacher', display_name: name.trim() } },
  });
  if (error) throw new Error(friendlyError(error));
  if (!data.session) throw new Error('Cek email untuk konfirmasi akun, lalu masuk.');
  await adoptUser(data.user);
}

export async function signInTeacher({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(/Invalid login/.test(error.message) ? 'Email atau password salah.' : friendlyError(error));
  const profile = await adoptUser(data.user);
  if (profile.role !== 'teacher') {
    await signOut();
    throw new Error('Akun ini bukan akun guru.');
  }
}

/** Mode demo tanpa server (hanya bila Supabase belum diatur), untuk mencoba aplikasi. */
export async function startDemo({ nickname, avatar }) {
  state.profile = { id: `demo-${Date.now()}`, role: 'student', nickname, avatar, onboarded: true, demo: true, classroom: null };
  await saveProfile();
  notify();
}

/** Mode Guru demo: data kelas CONTOH di browser, tanpa server. */
export async function startTeacherDemo() {
  state.profile = { id: `demo-guru-${Date.now()}`, role: 'teacher', nickname: 'Guru Demo', avatar: '🧑‍🏫', onboarded: true, demo: true };
  await saveProfile();
  notify();
}

export async function signOut() {
  resetDemoCache();
  try {
    await flush();
  } catch {
    /* abaikan */
  }
  if (supabase) await supabase.auth.signOut().catch(() => {});
  await resetAll();
  notify();
}

export async function refreshProfile() {
  if (!supabase || state.profile?.demo) return;
  const { data } = await supabase.auth.getUser();
  if (data?.user) await adoptUser(data.user);
}
