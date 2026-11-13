// Layar awal: pilih Mode Siswa / Mode Guru, lalu daftar atau masuk (Supabase Auth).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen, Mascot, Feedback } from '../components/ui.jsx';
import { supabaseReady } from '../lib/supabase.js';
import { signUpStudent, signInStudent, signUpTeacher, signInTeacher, startDemo, startTeacherDemo } from '../lib/auth.js';

export const AVATARS = ['🤖', '🦊', '🐼', '🐯', '🦉', '🐢', '🐬', '🦁', '🐱', '🐸'];
const BLOCKED = ['anjing', 'babi', 'bodoh', 'goblok', 'tolol', 'bego', 'bangsat', 'kontol', 'memek', 'setan', 'kampret'];

export function validNickname(n) {
  const v = n.trim();
  if (v.length < 2 || v.length > 20) return 'Nama panggilan 2–20 huruf.';
  if (!/^[\p{L}\p{N} ]+$/u.test(v)) return 'Pakai huruf, angka, dan spasi saja.';
  if (BLOCKED.some((w) => v.toLowerCase().includes(w))) return 'Pilih nama panggilan yang sopan, ya.';
  return null;
}

export function Welcome() {
  return (
    <Screen className="welcome">
      <div className="slide">
        <Mascot size={120} />
        <h1>MATH-MISSION</h1>
        <p className="lead">Misi harian untuk menaklukkan Persamaan Linear Satu Variabel.</p>
        <ul className="intro-points">
          <li>🎯 3 misi setiap hari: Pemanasan, Misi Utama, Tantangan Tim</li>
          <li>⚖️ Persamaan itu seperti timbangan: yang di kiri, lakukan juga di kanan</li>
          <li>👥 Belajar bersama tim kelasmu</li>
        </ul>
        <p className="label">Masuk sebagai:</p>
        <div className="mode-grid">
          <Link className="mode-card" to="/siswa">
            <span aria-hidden="true">🎒</span>
            <strong>Mode Siswa</strong>
            <small>Kerjakan misi dan kumpulkan XP</small>
          </Link>
          <Link className="mode-card teacher" to="/guru">
            <span aria-hidden="true">🧑‍🏫</span>
            <strong>Mode Guru</strong>
            <small>Kelola kelas, tim, dan pantau progres</small>
          </Link>
        </div>
        {!supabaseReady && (
          <Feedback kind="info">
            Versi demo: tanpa login. Mode Siswa dan Mode Guru bisa dicoba langsung. Data hanya tersimpan di perangkat ini,
            dan data kelas di Mode Guru adalah contoh.
          </Feedback>
        )}
      </div>
    </Screen>
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
  const [mode, setMode] = useState(supabaseReady ? 'join' : 'demo');
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
        {mode === 'login' && <p className="muted small center">Lupa PIN? Minta gurumu menghapus akunmu, lalu daftar lagi.</p>}
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
      <Tabs value={mode} onChange={setMode} items={[['login', 'Masuk'], ['register', 'Daftar']]} />
      <form className="card form" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <label htmlFor="tname">Nama guru</label>
            <input id="tname" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}
        <label htmlFor="temail">Email</label>
        <input id="temail" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="tpass">Password</label>
        <input id="tpass" className="input" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <Feedback kind="warn">{err}</Feedback>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Menghubungi server…' : mode === 'register' ? 'Daftar akun guru' : 'Masuk'}
        </button>
      </form>
    </Screen>
  );
}
