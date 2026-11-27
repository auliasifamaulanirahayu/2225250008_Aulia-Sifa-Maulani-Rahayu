// Layar awal: pilih Mode Siswa / Mode Guru, lalu daftar atau masuk (Supabase Auth).

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Screen, Feedback } from '../components/ui.jsx';
import { GalaxyArt } from '../components/GalaxyArt.jsx';
import { supabaseReady } from '../lib/supabase.js';
import { signUpStudent, signInStudent, signUpTeacher, signInTeacher, startDemo, startTeacherDemo, requestPasswordReset, updatePassword } from '../lib/auth.js';
import { useAppState } from '../state.js';

export const AVATARS = ['🤖', '🦊', '🐼', '🐯', '🦉', '🐢', '🐬', '🦁', '🐱', '🐸'];
const BLOCKED = ['anjing', 'babi', 'bodoh', 'goblok', 'tolol', 'bego', 'bangsat', 'kontol', 'memek', 'setan', 'kampret'];

export function validNickname(n) {
  const v = n.trim();
  if (v.length < 2 || v.length > 20) return 'Nama panggilan 2–20 huruf.';
  if (!/^[\p{L}\p{N} ]+$/u.test(v)) return 'Pakai huruf, angka, dan spasi saja.';
  if (BLOCKED.some((w) => v.toLowerCase().includes(w))) return 'Pilih nama panggilan yang sopan, ya.';
  return null;
}

const FEATURES = [
  { icon: '🪐', title: 'Mission Map', text: '7 misi PLSV berurutan, dari mengenal PLSV sampai tantangan.' },
  { icon: '⚖️', title: 'Timbangan Seimbang', text: 'Lakukan hal yang sama pada kedua ruas, persamaan tetap seimbang.' },
  { icon: '📚', title: 'Learning Zone', text: 'Materi singkat bertahap dengan contoh dan ringkasan.', soon: true },
  { icon: '🎯', title: 'Challenge Zone', text: 'Latihan Easy, Medium, dan Advanced dengan umpan balik.', soon: true },
  { icon: '🤖', title: 'AI Math Tutor', text: 'Dibimbing satu petunjuk demi satu petunjuk, bukan diberi jawaban.' },
  { icon: '👥', title: 'Belajar Bersama', text: 'Kumpulkan XP bersama tim kelasmu.' },
];

const STEPS = ['Pahami soal', 'Buat model', 'Selesaikan', 'Periksa'];

export function Welcome() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-[calc(16px+env(safe-area-inset-top,0px))] pb-12 text-ink">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="favicon.svg" alt="" width="36" height="36" className="rounded-xl shadow-glow" />
          <span className="text-lg font-extrabold tracking-wide">MATH-MISSION</span>
        </div>
        <Link
          to="/siswa?tab=login"
          className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink no-underline hover:border-galaxy-cyan"
        >
          Login
        </Link>
      </header>

      <section className="mt-6 grid items-center gap-6 md:mt-12 md:grid-cols-2">
        <div className="animate-fade-up order-2 md:order-1">
          <p className="m-0 text-sm font-bold uppercase tracking-[0.18em] text-galaxy-cyan">Petualangan PLSV kelas VII</p>
          <h1 className="mt-2 mb-3 text-[2rem] leading-tight font-extrabold md:text-5xl">
            Jelajahi galaksi,{' '}
            <span className="bg-gradient-to-r from-galaxy-cyan to-[#b79bff] bg-clip-text text-transparent">temukan nilai x.</span>
          </h1>
          <p className="m-0 max-w-md text-base text-muted md:text-lg">
            Selesaikan misi Persamaan Linear Satu Variabel. Pahami soalnya, susun persamaannya, hitung, lalu periksa
            jawabanmu.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/siswa"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-btn px-6 text-base font-extrabold text-white no-underline shadow-[0_0_24px_rgb(82_217_255/28%)] transition hover:brightness-110"
            >
              🚀 Mulai Misi
            </Link>
            <Link
              to="/siswa?tab=login"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface/60 px-6 text-base font-bold text-ink no-underline transition hover:border-galaxy-cyan"
            >
              Login
            </Link>
          </div>
          <ol className="mt-6 flex list-none flex-wrap gap-2 p-0" aria-label="Langkah setiap misi">
            {STEPS.map((t, i) => (
              <li key={t} className="rounded-full bg-surface-2/70 px-3 py-1 text-sm text-muted">
                <span className="font-extrabold text-galaxy-cyan">{i + 1}</span> {t}
              </li>
            ))}
          </ol>
        </div>
        <div className="order-1 md:order-2">
          <GalaxyArt className="mx-auto block w-full max-w-[360px] md:max-w-[460px]" />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="fitur">
        <h2 id="fitur" className="mb-4 text-xl font-extrabold md:text-2xl">
          Yang menunggumu di MATH-MISSION
        </h2>
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line bg-surface/70 p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-surface-2 text-2xl">
                  {f.icon}
                </span>
                <strong className="text-base">{f.title}</strong>
                {f.soon && (
                  <span className="ml-auto rounded-full border border-galaxy-purple px-2 py-0.5 text-xs font-bold text-[#c9b8ff]">
                    Segera
                  </span>
                )}
              </div>
              <p className="mt-2 mb-0 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="Pilih mode">
        <Link to="/siswa" className="rounded-2xl border border-line bg-surface/70 p-4 text-ink no-underline hover:border-galaxy-cyan">
          <span className="text-2xl" aria-hidden="true">🎒</span>
          <strong className="mt-1 block">Mode Siswa</strong>
          <span className="text-sm text-muted">Daftar dengan kode kelas dari gurumu. Tidak perlu email.</span>
        </Link>
        <Link to="/guru" className="rounded-2xl border border-line bg-surface/70 p-4 text-ink no-underline hover:border-galaxy-purple">
          <span className="text-2xl" aria-hidden="true">🧑‍🏫</span>
          <strong className="mt-1 block">Mode Guru</strong>
          <span className="text-sm text-muted">Kelola kelas, tim, dan pantau progres siswa.</span>
        </Link>
      </section>

      {!supabaseReady && (
        <div className="mt-6">
          <Feedback kind="info">
            Versi demo: tanpa login. Mode Siswa dan Mode Guru bisa dicoba langsung. Data hanya tersimpan di perangkat ini,
            dan data kelas di Mode Guru adalah contoh.
          </Feedback>
        </div>
      )}
    </div>
  );
}

function AvatarPicker({ value, onChange }) {
  return (
    <div className="avatar-row" role="radiogroup" aria-label="Pilih avatar">
      {AVATARS.map((a) => (
        <button key={a} type="button" className={`avatar-btn ${a === value ? 'on' : ''}`} aria-pressed={a === value} onClick={() => onChange(a)}>
          {a}
        </button>
      ))}
    </div>
  );
}

function Tabs({ value, onChange, items }) {
  return (
    <div className="tabs" role="tablist">
      {items.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function StudentAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(supabaseReady ? (params.get('tab') === 'login' ? 'login' : 'join') : 'demo');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const nickErr = validNickname(nick);
    if (nickErr) return setErr(nickErr);
    if (mode === 'demo') {
      await startDemo({ nickname: nick.trim(), avatar });
      return navigate('/home', { replace: true });
    }
    const classCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(classCode)) return setErr('Kode kelas terdiri dari 6 huruf/angka.');
    if (!/^\d{6}$/.test(pin)) return setErr('PIN harus 6 angka.');
    if (mode === 'join' && pin !== pin2) return setErr('PIN dan ulangi PIN belum sama.');
    setBusy(true);
    try {
      if (mode === 'join') await signUpStudent({ classCode, nickname: nick, pin, avatar });
      else await signInStudent({ classCode, nickname: nick, pin });
      navigate('/home', { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="auth">
      <header className="simple-head">
        <Link className="icon-btn" to="/welcome" aria-label="Kembali">
          ←
        </Link>
        <h1>🎒 Mode Siswa</h1>
      </header>
      {supabaseReady ? (
        <Tabs value={mode} onChange={setMode} items={[['join', 'Daftar'], ['login', 'Masuk']]} />
      ) : (
        <Feedback kind="info">Mode demo: progres hanya tersimpan di HP ini dan tidak ada fitur tim.</Feedback>
      )}
      <form className="card form" onSubmit={submit}>
        {mode === 'join' && <p>Minta <strong>kode kelas</strong> ke gurumu. Kamu tidak perlu email.</p>}
        {mode !== 'demo' && (
          <>
            <label htmlFor="code">Kode kelas</label>
            <input id="code" className="input code-input" maxLength={6} autoComplete="off" autoCapitalize="characters" placeholder="K7B3QZ" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </>
        )}
        <label htmlFor="nick">Nama panggilan</label>
        <input id="nick" className="input" maxLength={20} autoComplete="off" placeholder="mis. Raka" value={nick} onChange={(e) => setNick(e.target.value)} />
        {mode !== 'login' && <p className="muted small">Jangan pakai nama lengkap. Nama panggilan saja.</p>}
        {mode !== 'login' && (
          <>
            <p className="label">Pilih avatar</p>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </>
        )}
        {mode !== 'demo' && (
          <>
            <label htmlFor="pin">{mode === 'join' ? 'Buat PIN (6 angka, ingat baik-baik)' : 'PIN (6 angka)'}</label>
            <input id="pin" className="input" type="password" inputMode="numeric" maxLength={6} autoComplete={mode === 'join' ? 'new-password' : 'current-password'} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          </>
        )}
        {mode === 'join' && (
          <>
            <label htmlFor="pin2">Ulangi PIN</label>
            <input id="pin2" className="input" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
          </>
        )}
        {err && <Feedback kind="warn">{err}</Feedback>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Menghubungi server…' : mode === 'join' ? 'Daftar & mulai misi' : mode === 'login' ? 'Masuk' : 'Mulai demo'}
        </button>
        {mode === 'login' && <p className="muted small center">Lupa PIN? Minta gurumu mengatur ulang akunmu, lalu daftar lagi.</p>}
      </form>
    </Screen>
  );
}

export function TeacherAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!supabaseReady) {
    return (
      <Screen className="auth">
        <header className="simple-head">
          <Link className="icon-btn" to="/welcome" aria-label="Kembali">
            ←
          </Link>
          <h1>🧑‍🏫 Mode Guru</h1>
        </header>
        <div className="card form">
          <h2>Mode Guru demo</h2>
          <p>Coba dashboard guru dengan kelas contoh: kode kelas, tim, tantangan, kesalahan per tahap, miskonsepsi, dan ekspor CSV.</p>
          <p className="muted small">Semua data siswa di mode ini adalah contoh dan hanya tersimpan di perangkat ini.</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={async () => {
              await startTeacherDemo();
              navigate('/teacher', { replace: true });
            }}
          >
            Masuk Mode Guru demo
          </button>
        </div>
      </Screen>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (mode === 'register' && name.trim().length < 2) return setErr('Isi nama guru.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Email belum benar.');
    if (mode === 'forgot') {
      setBusy(true);
      try {
        await requestPasswordReset(email);
        setSent(true);
      } catch (ex) {
        setErr(ex.message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (password.length < 8) return setErr('Password minimal 8 karakter.');
    setBusy(true);
    try {
      if (mode === 'register') await signUpTeacher({ name, email, password });
      else await signInTeacher({ email, password });
      navigate('/teacher', { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="auth">
      <header className="simple-head">
        <Link className="icon-btn" to="/welcome" aria-label="Kembali">
          ←
        </Link>
        <h1>🧑‍🏫 Mode Guru</h1>
      </header>
      {mode !== 'forgot' && <Tabs value={mode} onChange={(m) => (setMode(m), setErr(null))} items={[['login', 'Masuk'], ['register', 'Daftar']]} />}
      <form className="card form" onSubmit={submit}>
        {mode === 'forgot' && (
          <>
            <h2>Lupa password</h2>
            <p>Masukkan email akun guru. Kami kirim tautan untuk membuat password baru.</p>
          </>
        )}
        {mode === 'register' && (
          <>
            <label htmlFor="tname">Nama guru</label>
            <input id="tname" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}
        <label htmlFor="temail">Email</label>
        <input id="temail" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'forgot' && (
          <>
            <label htmlFor="tpass">Password</label>
            <input id="tpass" className="input" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        {err && <Feedback kind="warn">{err}</Feedback>}
        {sent && mode === 'forgot' && (
          <Feedback kind="good">Tautan sudah dikirim jika email itu terdaftar. Cek kotak masuk atau folder spam.</Feedback>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Menghubungi server…' : mode === 'register' ? 'Daftar akun guru' : mode === 'forgot' ? 'Kirim tautan reset' : 'Masuk'}
        </button>
        {mode === 'login' && (
          <button type="button" className="btn btn-ghost btn-small btn-block" onClick={() => (setMode('forgot'), setErr(null), setSent(false))}>
            Lupa password?
          </button>
        )}
        {mode === 'forgot' && (
          <button type="button" className="btn btn-ghost btn-small btn-block" onClick={() => (setMode('login'), setErr(null))}>
            ← Kembali ke Masuk
          </button>
        )}
      </form>
    </Screen>
  );
}

/** Dibuka dari tautan email "lupa password" (guru). Supabase sudah memasukkan pengguna lewat token tautan. */
export function ResetPassword() {
  const navigate = useNavigate();
  const { profile, passwordRecovery } = useAppState();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!passwordRecovery || !profile) {
    return (
      <Screen className="auth">
        <div className="card form">
          <h2>Tautan tidak berlaku</h2>
          <p>Buka lagi tautan terbaru dari email, atau minta tautan baru lewat "Lupa password?".</p>
          <Link className="btn btn-primary btn-block" to="/guru">
            Ke halaman Mode Guru
          </Link>
        </div>
      </Screen>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (pw.length < 8) return setErr('Password minimal 8 karakter.');
    if (pw !== pw2) return setErr('Password dan ulangi password belum sama.');
    setBusy(true);
    try {
      await updatePassword(pw);
      navigate(profile.role === 'teacher' ? '/teacher' : '/home', { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen className="auth">
      <header className="simple-head">
        <h1>🔑 Buat password baru</h1>
      </header>
      <form className="card form" onSubmit={submit}>
        <label htmlFor="npw">Password baru (minimal 8 karakter)</label>
        <input id="npw" className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <label htmlFor="npw2">Ulangi password baru</label>
        <input id="npw2" className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {err && <Feedback kind="warn">{err}</Feedback>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan password'}
        </button>
      </form>
    </Screen>
  );
}
