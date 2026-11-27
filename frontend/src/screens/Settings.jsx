// Pengaturan (ketentuan J): profil, musik, efek suara, tema, informasi aplikasi, logout.
// Dipakai siswa dan guru. Semua pengaturan disimpan di HP (IndexedDB), jadi berlaku juga saat offline.

import { useNavigate, Link } from 'react-router-dom';
import { useAppState, saveSettings } from '../state.js';
import { Screen, toast } from '../components/ui.jsx';
import { signOut, updateAvatar } from '../lib/auth.js';
import { AVATARS } from './Auth.jsx';
import { sfx } from '../sound.js';

const section = 'mt-3 rounded-2xl border border-line bg-surface/80 p-4';
const heading = 'm-0 mb-2 text-base font-extrabold';

function Switch({ id, label, hint, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block font-bold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border border-line transition ${checked ? 'bg-btn' : 'bg-surface-2'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : ''}`}
        />
      </button>
    </div>
  );
}

function Volume({ id, label, value, disabled, onChange, onRelease }) {
  return (
    <div className={`py-2 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex justify-between text-sm">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        <span className="text-muted">{Math.round(value * 100)}%</span>
      </div>
      <input
        id={id}
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        className="mt-1 h-8 w-full cursor-pointer accent-[var(--c-accent)]"
      />
    </div>
  );
}

function Choice({ on, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`min-h-11 flex-1 cursor-pointer rounded-xl border px-3 font-bold ${
        on ? 'border-galaxy-cyan bg-surface-2 text-ink' : 'border-line bg-transparent text-muted'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default function SettingsScreen() {
  const s = useAppState();
  const navigate = useNavigate();
  const { settings, profile } = s;
  const teacher = profile?.role === 'teacher';
  const set = (patch) => {
    Object.assign(settings, patch);
    saveSettings();
  };

  const pickAvatar = async (a) => {
    try {
      await updateAvatar(a);
    } catch (e) {
      toast(`Avatar tersimpan di HP ini. ${e.message}`);
    }
  };
  const logout = async () => {
    await signOut();
    navigate('/welcome', { replace: true });
  };

  return (
    <Screen nav={!teacher} className="settings">
      <header className="simple-head">
        <Link className="icon-btn" to={teacher ? '/teacher' : '/profile'} aria-label="Kembali">
          ←
        </Link>
        <h1>⚙️ Pengaturan</h1>
      </header>

      {/* Profil */}
      <section className={section} aria-labelledby="set-profile">
        <h2 id="set-profile" className={heading}>
          👤 Profil
        </h2>
        <p className="m-0 text-sm text-muted">
          {teacher ? 'Akun guru' : 'Nama panggilan'}: <strong className="text-ink">{profile.nickname}</strong>
          {profile.classroom ? ` · ${profile.classroom.name}` : ''}
        </p>
        {!teacher && (
          <>
            <p className="label">Avatar</p>
            <div className="avatar-row" role="radiogroup" aria-label="Pilih avatar">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={a === profile.avatar}
                  className={`avatar-btn ${a === profile.avatar ? 'on' : ''}`}
                  onClick={() => pickAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Musik */}
      <section className={section} aria-labelledby="set-music">
        <h2 id="set-music" className={heading}>
          🎵 Musik latar
        </h2>
        <Switch
          id="music"
          label="Musik luar angkasa"
          hint="Mulai berbunyi setelah kamu menyentuh layar."
          checked={!!settings.music}
          onChange={(v) => set({ music: v })}
        />
        <Volume
          id="music-vol"
          label="Volume musik"
          value={settings.musicVolume ?? 0.5}
          disabled={!settings.music}
          onChange={(v) => set({ musicVolume: v })}
        />
        <Switch
          id="music-problems"
          label="Musik saat mengerjakan soal"
          hint="Disarankan mati agar lebih fokus."
          checked={!!settings.musicInProblems}
          onChange={(v) => set({ musicInProblems: v })}
        />
      </section>

      {/* Efek suara */}
      <section className={section} aria-labelledby="set-sfx">
        <h2 id="set-sfx" className={heading}>
          🔔 Efek suara
        </h2>
        <Switch id="sfx" label="Efek suara" hint="Bunyi saat benar, hampir, dan selesai." checked={settings.sound !== false} onChange={(v) => set({ sound: v })} />
        <Volume
          id="sfx-vol"
          label="Volume efek suara"
          value={settings.sfxVolume ?? 0.8}
          disabled={settings.sound === false}
          onChange={(v) => set({ sfxVolume: v })}
          onRelease={() => sfx.good()}
        />
      </section>

      {/* Tema & tampilan */}
      <section className={section} aria-labelledby="set-theme">
        <h2 id="set-theme" className={heading}>
          🎨 Tema & tampilan
        </h2>
        <div className="flex gap-2" role="group" aria-label="Tema">
          <Choice on={settings.theme !== 'light'} onClick={() => set({ theme: 'galaxy' })}>
            🌌 Galaxy
          </Choice>
          <Choice on={settings.theme === 'light'} onClick={() => set({ theme: 'light' })}>
            ☀️ Terang
          </Choice>
        </div>
        <p className="label">Ukuran huruf</p>
        <div className="flex gap-2" role="group" aria-label="Ukuran huruf">
          {[
            [1, 'Normal'],
            [1.15, 'Besar'],
            [1.3, 'Sangat besar'],
          ].map(([v, l]) => (
            <Choice key={v} on={settings.fontScale === v} onClick={() => set({ fontScale: v })}>
              {l}
            </Choice>
          ))}
        </div>
        <Switch id="contrast" label="Kontras tinggi" hint="Teks hitam di latar putih." checked={!!settings.contrast} onChange={(v) => set({ contrast: v })} />
      </section>

      {/* Informasi aplikasi */}
      <section className={section} aria-labelledby="set-info">
        <h2 id="set-info" className={heading}>
          ℹ️ Informasi aplikasi
        </h2>
        <p className="m-0 text-sm text-muted">MATH-MISSION versi {__APP_VERSION__} · Belajar PLSV untuk SMP kelas VII.</p>
        <div className="mt-2 flex flex-col">
          <Link to="/about" className="py-2 font-bold">
            Tentang & privasi ›
          </Link>
          <Link to="/install" className="py-2 font-bold">
            Pasang aplikasi di HP ›
          </Link>
        </div>
      </section>

      {/* Akun */}
      <section className={section} aria-labelledby="set-account">
        <h2 id="set-account" className={heading}>
          🔐 Akun
        </h2>
        <button type="button" className="btn btn-block" onClick={logout}>
          Keluar dari akun
        </button>
        <p className="mb-0 text-sm text-muted">
          Saat keluar, data di HP ini dihapus.{' '}
          {profile.demo ? 'Mode demo tidak punya cadangan di server.' : 'Progres tersimpan di server dan kembali saat masuk lagi.'}
        </p>
      </section>
    </Screen>
  );
}
