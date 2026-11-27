// Profil siswa: statistik, lencana, riwayat misi; panduan pasang aplikasi; tentang & privasi.
// Pengaturan (musik, suara, tema, logout) ada di screens/Settings.jsx.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppState } from '../state.js';
import { BADGES } from '../engine/badges.js';
import { levelInfo, visibleStreak, todayStr } from '../engine/xp.js';
import { Screen, ConfirmButton, Feedback, toast } from '../components/ui.jsx';
import { signOut } from '../lib/auth.js';
import { rpc } from '../lib/supabase.js';
import { canPrompt, onInstallable, promptInstall, isStandalone, isIos } from '../pwa.js';

export function Profile() {
  const s = useAppState();
  const navigate = useNavigate();
  const { profile, stats, progress } = s;
  const lvl = levelInfo(stats.xp);
  const done = Object.values(progress).filter((p) => p.done && !p.id.startsWith('lz-')).length; // materi bukan soal
  const starsTotal = Object.values(progress).reduce((a, p) => a + (p.bestStars || 0), 0);
  const have = new Set(stats.badges);

  const deleteAccount = async () => {
    try {
      if (!profile.demo) await rpc('delete_me');
      await signOut();
      toast('Akun dan semua datamu sudah dihapus.');
      navigate('/welcome', { replace: true });
    } catch (e) {
      toast(e.message);
    }
  };

  return (
    <Screen className="profile" nav>
      <header className="profile-head">
        <span className="avatar-xl" aria-hidden="true">
          {profile.avatar}
        </span>
        <h1>{profile.nickname}</h1>
        <p>
          Level {lvl.level} · {lvl.title}
        </p>
        <p className="muted small">{profile.demo ? 'Mode demo (tanpa akun)' : `Kelas ${profile.classroom?.name ?? '-'}`}</p>
      </header>
      <section className="stat-grid">
        <div>
          <strong>{stats.xp}</strong>
          <small>XP</small>
        </div>
        <div>
          <strong>{done}</strong>
          <small>Soal selesai</small>
        </div>
        <div>
          <strong>★ {starsTotal}</strong>
          <small>Bintang</small>
        </div>
        <div>
          <strong>🔥 {visibleStreak(stats, todayStr())}</strong>
          <small>Streak</small>
        </div>
        <div>
          <strong>🛡️ {stats.shields || 0}</strong>
          <small>Tameng</small>
        </div>
        <div>
          <strong>{stats.badges.length}</strong>
          <small>Lencana</small>
        </div>
      </section>
      <section className="card">
        <h2>🏅 Lencana</h2>
        <div className="badge-grid">
          {BADGES.map((b) => (
            <div key={b.code} className={`badge ${have.has(b.code) ? 'on' : ''}`}>
              <span className="badge-icon" aria-hidden="true">
                {b.icon}
              </span>
              <strong>{b.name}</strong>
              <small>{b.desc}</small>
              {!have.has(b.code) && <span className="sr-only">(belum didapat)</span>}
            </div>
          ))}
        </div>
      </section>
      <section className="card links">
        <Link to="/settings">⚙️ Pengaturan: musik, suara, tema, avatar, keluar</Link>
        <Link to="/install">📲 Pasang aplikasi di HP</Link>
        <Link to="/about">ℹ️ Tentang & privasi</Link>
      </section>
      <section className="card">
        <ConfirmButton label="Hapus akun & semua data" confirmLabel="Ketuk sekali lagi untuk menghapus" onConfirm={deleteAccount} className="btn btn-danger btn-block" />
      </section>
    </Screen>
  );
}

export function Install() {
  const s = useAppState();
  const [, force] = useState(0);
  useEffect(() => {
    onInstallable(() => force((x) => x + 1));
  }, []);
  const back = s.profile?.role === 'teacher' ? '/teacher' : s.profile ? '/profile' : '/welcome';
  return (
    <Screen className="install">
      <header className="simple-head">
        <Link className="icon-btn" to={back} aria-label="Kembali">
          ←
        </Link>
        <h1>📲 Pasang aplikasi</h1>
      </header>
      {isStandalone() ? (
        <Feedback kind="good">MATH-MISSION sudah terpasang dan sedang kamu pakai. 🎉</Feedback>
      ) : (
        <>
          {canPrompt() && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={async () => {
                if (await promptInstall()) toast('Terima kasih! Cek ikon di layar utama.');
              }}
            >
              Pasang sekarang
            </button>
          )}
          <section className={`card ${isIos() ? 'dim' : ''}`}>
            <h2>Android (Chrome)</h2>
            <ol>
              <li>Buka link MATH-MISSION di <strong>Chrome</strong>.</li>
              <li>
                Ketuk menu <strong>⋮</strong> lalu <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.
              </li>
              <li>Ketuk <strong>Instal</strong>. Ikon muncul di layar HP.</li>
              <li>Buka sekali saat ada internet agar semua soal tersimpan.</li>
            </ol>
          </section>
          <section className={`card ${isIos() ? '' : 'dim'}`}>
            <h2>iPhone (Safari)</h2>
            <ol>
              <li>Buka link di <strong>Safari</strong>.</li>
              <li>
                Ketuk ikon <strong>Bagikan</strong> (kotak dengan panah ke atas).
              </li>
              <li>
                Pilih <strong>Tambahkan ke Layar Utama</strong> lalu <strong>Tambah</strong>.
              </li>
            </ol>
          </section>
          <section className="card">
            <h2>Laptop</h2>
            <p>Buka di Chrome/Edge lalu klik ikon pasang di bilah alamat, atau langsung pakai di browser.</p>
          </section>
        </>
      )}
    </Screen>
  );
}

export function About() {
  const s = useAppState();
  const back = s.profile?.role === 'teacher' ? '/teacher' : s.profile ? '/profile' : '/welcome';
  return (
    <Screen className="about">
      <header className="simple-head">
        <Link className="icon-btn" to={back} aria-label="Kembali">
          ←
        </Link>
        <h1>ℹ️ Tentang & privasi</h1>
      </header>
      <section className="card">
        <h2>MATH-MISSION</h2>
        <p>Game edukasi berbasis Problem Based Learning untuk belajar Persamaan Linear Satu Variabel (SMP kelas VII).</p>
        <p className="muted small">
          Dikembangkan oleh Aulia Sifa Maulani Rahayu, Pendidikan Matematika, Universitas Sultan Ageng Tirtayasa. Versi {__APP_VERSION__}.
        </p>
      </section>
      <section className="card">
        <h2>Privasimu</h2>
        <ul>
          <li>Aplikasi hanya menyimpan nama panggilan, avatar, dan hasil latihanmu.</li>
          <li>Siswa tidak perlu email atau nomor HP.</li>
          <li>Gurumu bisa melihat progresmu untuk membantumu belajar.</li>
          <li>Tidak ada iklan dan tidak ada pelacak.</li>
          <li>
            Jika gurumu menyalakan AI Tutor, pesanmu ke tutor (tanpa namamu) dikirim ke layanan AI Google. Jangan tulis
            nama lengkap, alamat, atau nomor HP di sana.
          </li>
          <li>Kamu bisa menghapus akun dan semua datamu kapan saja dari halaman Profil.</li>
        </ul>
      </section>
    </Screen>
  );
}
