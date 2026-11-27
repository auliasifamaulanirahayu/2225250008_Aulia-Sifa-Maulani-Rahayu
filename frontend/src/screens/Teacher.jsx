// Mode Guru (FR-16, FR-19): kelas, tim, tantangan, progres per tahap, miskonsepsi, ekspor CSV.
// Sumber data: Supabase (akun guru sungguhan) atau data contoh (Mode Guru demo), lihat lib/teacherApi.js.

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state.js';
import { teacherApi } from '../lib/teacherApi.js';
import { signOut } from '../lib/auth.js';
import { Screen, Feedback, ConfirmButton, toast, Loading, EmptyState, Sheet } from '../components/ui.jsx';
import { dayDiff, todayStr } from '../engine/xp.js';
import { WORLDS } from '../content.js';
import { METRIC_LABEL } from './Team.jsx';

const STAGE_NAME = { understand: 'Pahami', model: 'Modelkan', solve: 'Selesaikan', check: 'Periksa' };
const MISCONCEPTION = {
  M1: 'Tanda tidak berubah saat pindah ruas',
  M2: 'Operasi hanya di satu ruas',
  M3: 'Membagi hanya sebagian suku',
  M4: 'Mengurangkan koefisien, bukan membagi',
  M5: 'Menggabungkan suku tidak sejenis',
  M6: 'Distributif tidak lengkap',
  M7: 'Variabel dimaknai sebagai benda',
  M8: 'Jawaban tidak ditafsirkan ke konteks',
};

function TeacherHeader({ title, back }) {
  const s = useAppState();
  const navigate = useNavigate();
  return (
    <header className="teacher-head">
      {back ? (
        <Link className="icon-btn" to={back} aria-label="Kembali">
          ←
        </Link>
      ) : (
        <span className="avatar-big" aria-hidden="true">
          🧑‍🏫
        </span>
      )}
      <div className="hh-text">
        <h1>{title}</h1>
        <small>
          Mode Guru · {s.profile?.nickname}
          {s.profile?.demo ? ' · demo' : ''}
        </small>
      </div>
      <Link className="icon-btn" to="/settings" aria-label="Pengaturan">
        ⚙️
      </Link>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={async () => {
          await signOut();
          navigate('/welcome', { replace: true });
        }}
      >
        Keluar
      </button>
    </header>
  );
}

function DemoBanner() {
  const { profile } = useAppState();
  if (!profile?.demo) return null;
  return (
    <Feedback kind="info">
      <strong>Mode Guru demo.</strong> Semua siswa dan angka di halaman ini adalah <strong>data contoh</strong>, bukan data siswa
      sungguhan. Perubahan (tim, tantangan, kelas baru) tersimpan di perangkat ini.
    </Feedback>
  );
}

function streakFrom(days) {
  if (!days?.length) return 0;
  const today = todayStr();
  if (dayDiff(days[0], today) > 1) return 0;
  let n = 1;
  for (let i = 1; i < days.length && dayDiff(days[i], days[i - 1]) === 1; i++) n++;
  return n;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = Object.keys(rows[0] || { kosong: '' });
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

function tryDownload(filename, csv) {
  try {
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch {
    /* beberapa tampilan pratinjau tidak mengizinkan unduhan */
  }
}

// ---------------------------------------------------------------- daftar kelas
export function TeacherHome() {
  const [classes, setClasses] = useState(null);
  const [name, setName] = useState('');
  const [research, setResearch] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    try {
      setClasses(await teacherApi().listClasses());
      setErr(null);
    } catch (e) {
      setErr(e.message);
      setClasses([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr('Isi nama kelas, mis. VII B.');
    try {
      const c = await teacherApi().createClass(name.trim(), research);
      toast(`Kelas ${c.name} dibuat. Kode kelas: ${c.code}`);
      setName('');
      setErr(null);
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  return (
    <Screen className="teacher wide">
      <TeacherHeader title="Kelas saya" />
      <DemoBanner />
      <form className="card form inline-form" onSubmit={create}>
        <h2>Buat kelas baru</h2>
        <label htmlFor="cname">Nama kelas</label>
        <input id="cname" className="input" maxLength={60} placeholder="mis. VII B" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="toggle">
          <span>Mode penelitian (izinkan ekspor data anonim)</span>
          <input id="cresearch" type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} />
        </label>
        {err && <Feedback kind="warn">{err}</Feedback>}
        <button type="submit" className="btn btn-primary">
          + Buat kelas
        </button>
      </form>
      {!classes ? (
        <Loading />
      ) : classes.length === 0 ? (
        <EmptyState title="Belum ada kelas" text="Buat kelas, lalu bagikan kode kelas kepada siswa." />
      ) : (
        <div className="class-grid">
          {classes.map((c) => (
            <Link key={c.id} className="card class-card" to={`/teacher/class/${c.id}`}>
              <strong>{c.name}</strong>
              <span className="class-code">{c.code}</span>
              <small>
                {c.students} siswa {c.research_mode ? '· 🔬 penelitian' : ''}
              </small>
            </Link>
          ))}
        </div>
      )}
      <section className="card links">
        <Link to="/install">📲 Pasang aplikasi</Link>
        <Link to="/about">ℹ️ Tentang & privasi</Link>
      </section>
    </Screen>
  );
}

// ---------------------------------------------------------------- detail kelas
/** Percakapan AI Tutor siswa (dibaca guru untuk mengetahui kesulitan siswa). */
function TutorChats({ students, api }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const byId = Object.fromEntries(students.map((st) => [st.id, st]));
  const show = async () => {
    try {
      setRows(await api.tutorChats(students.map((st) => st.id)));
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  };
  const sessions = [];
  if (rows) {
    const map = new Map();
    for (const r of [...rows].sort((a, b) => a.id - b.id)) {
      if (!map.has(r.session_id)) map.set(r.session_id, []);
      map.get(r.session_id).push(r);
    }
    sessions.push(...[...map.values()].reverse());
  }
  return (
    <section className="card">
      <h2>🤖 Percakapan AI Tutor</h2>
      <p className="muted small">Lihat bagian yang membuat siswa bingung. Siswa diberi tahu bahwa gurunya bisa membaca percakapan ini.</p>
      {!rows ? (
        <button type="button" className="btn" onClick={show}>
          Tampilkan percakapan terbaru
        </button>
      ) : sessions.length === 0 ? (
        <p className="muted">Belum ada percakapan.</p>
      ) : (
        sessions.slice(0, 20).map((msgs) => {
          const st = byId[msgs[0].student_id];
          return (
            <details key={msgs[0].session_id} className="mt-2 rounded-xl border border-line p-2">
              <summary className="cursor-pointer">
                {st?.avatar} <strong>{st?.nickname || 'Siswa'}</strong> · {new Date(msgs[0].created_at).toLocaleString('id-ID')} ·{' '}
                {msgs.filter((m) => m.role === 'student').length} pertanyaan
                {msgs.some((m) => m.mode === 'full') ? ' · minta pembahasan lengkap' : ''}
              </summary>
              <ul className="m-0 mt-2 list-none p-0">
                {msgs.map((m) => (
                  <li key={m.id} className="py-1 text-sm whitespace-pre-line">
                    <strong>{m.role === 'student' ? 'Siswa' : 'Tutor'}:</strong> {m.content}
                  </li>
                ))}
              </ul>
            </details>
          );
        })
      )}
      {err && <Feedback kind="warn">{err}</Feedback>}
    </section>
  );
}

export function TeacherClass() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { profile } = useAppState();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [teamSize, setTeamSize] = useState(4);
  const [metric, setMetric] = useState('check_count');
  const [target, setTarget] = useState(25);
  const [newTeam, setNewTeam] = useState('');
  const [csv, setCsv] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await teacherApi().loadClass(id));
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, okMsg) => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
      load();
    } catch (e) {
      toast(e.message);
    }
  };

  if (!data) {
    return (
      <Screen className="teacher wide">
        <TeacherHeader title="Kelas" back="/teacher" />
        {err ? <Feedback kind="warn">{err}</Feedback> : <Loading />}
      </Screen>
    );
  }

  const { cls, teams, challenge, progress: prog, board } = data;
  const api = teacherApi();
  const exportCsv = () =>
    act(async () => {
      const rows = await api.exportRows(id);
      const text = toCsv(rows);
      setCsv({ rows, text, name: `math-mission-${cls.code}-${todayStr()}.csv` });
      tryDownload(`math-mission-${cls.code}-${todayStr()}.csv`, text);
    });

  const totalProblems = WORLDS.reduce((s, w) => s + w.problems.length, 0);
  const rates = prog.stage_error_rate || {};
  const mis = Object.entries(prog.misconceptions || {}).sort((a, b) => b[1] - a[1]);

  return (
    <Screen className="teacher wide">
      <TeacherHeader title={cls.name} back="/teacher" />
      <DemoBanner />
      <section className="card code-card">
        <div>
          <p className="label">Kode kelas untuk siswa</p>
          <span className="class-code big">{cls.code}</span>
          <p className="muted small">
            {profile?.demo
              ? 'Di versi dengan server, siswa memilih Mode Siswa → Daftar → mengisi kode ini.'
              : 'Siswa memilih Mode Siswa → Daftar → isi kode ini, nama panggilan, dan PIN.'}
          </p>
        </div>
        <label className="toggle">
          <span>🔬 Mode penelitian</span>
          <input id="research" type="checkbox" checked={cls.research_mode} onChange={(e) => act(() => api.setResearch(id, e.target.checked))} />
        </label>
        <label className="toggle">
          <span>🤖 AI Tutor (Gemini)</span>
          <input
            id="ai-tutor"
            type="checkbox"
            checked={!!cls.ai_tutor}
            onChange={(e) => act(() => api.setAiTutor(id, e.target.checked), e.target.checked ? 'AI Tutor dinyalakan untuk kelas ini.' : 'AI Tutor dimatikan. Siswa memakai tutor bawaan.')}
          />
        </label>
        <p className="muted small">
          Nyalakan setelah ada izin sekolah/orang tua. Pesan siswa (tanpa nama) dikirim ke layanan AI Google. Bila mati,
          siswa tetap dibantu tutor bawaan tanpa AI.
        </p>
      </section>

      <section className="stat-grid">
        <div>
          <strong>{prog.totals.students}</strong>
          <small>Siswa</small>
        </div>
        <div>
          <strong>{prog.totals.active_week}</strong>
          <small>Aktif minggu ini</small>
        </div>
        <div>
          <strong>{prog.totals.attempts}</strong>
          <small>Percobaan tercatat</small>
        </div>
      </section>

      <div className="teacher-grid">
        <section className="card">
          <h2>Tingkat kesalahan per tahap</h2>
          <p className="muted small">Tahap dengan bar terpanjang paling perlu dijelaskan ulang.</p>
          {Object.keys(STAGE_NAME).map((k) => {
            const r = rates[k] ?? 0;
            return (
              <div className="bar-row" key={k}>
                <span>{STAGE_NAME[k]}</span>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${Math.round(r * 100)}%` }} />
                </div>
                <strong>{Math.round(r * 100)}%</strong>
              </div>
            );
          })}
        </section>
        <section className="card">
          <h2>Miskonsepsi terbanyak</h2>
          {mis.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Miskonsepsi</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {mis.map(([code, n]) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{MISCONCEPTION[code] || '-'}</td>
                    <td className="num">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Belum ada data.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Siswa</h2>
        {prog.students.length === 0 ? (
          <p className="muted">Belum ada siswa. Bagikan kode kelas {cls.code}.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Tim</th>
                  <th>Soal</th>
                  <th>★</th>
                  <th>Streak</th>
                  <th>XP minggu</th>
                  <th>Tahap terlemah</th>
                  <th>Miskonsepsi</th>
                  {cls.research_mode && <th>Kode penelitian</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {prog.students.map((st) => (
                  <tr key={st.id}>
                    <td>
                      {st.avatar} {st.nickname}
                    </td>
                    <td>
                      <select
                        id={`team-${st.id}`}
                        className="input small"
                        aria-label={`Tim ${st.nickname}`}
                        value={st.team_id ?? ''}
                        onChange={(e) => act(() => api.assignTeam(st.id, e.target.value ? Number(e.target.value) : null))}
                      >
                        <option value="">—</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">
                      {st.problems_done}/{totalProblems}
                    </td>
                    <td className="num">{st.stars}</td>
                    <td className="num">{streakFrom(st.main_days)}</td>
                    <td className="num">{st.week_xp}</td>
                    <td>{STAGE_NAME[st.weak_stage] || '-'}</td>
                    <td title={MISCONCEPTION[st.top_misconception] || ''}>{st.top_misconception || '-'}</td>
                    {cls.research_mode && (
                      <td>
                        <input
                          id={`rc-${st.id}`}
                          className="input small"
                          defaultValue={st.research_code || ''}
                          placeholder="S01"
                          aria-label={`Kode penelitian ${st.nickname}`}
                          onBlur={(e) => e.target.value !== (st.research_code || '') && act(() => api.setResearchCode(st.id, e.target.value), 'Kode penelitian disimpan.')}
                        />
                      </td>
                    )}
                    <td>
                      <ConfirmButton label="Hapus" confirmLabel="Yakin?" className="btn btn-ghost btn-small" onConfirm={() => act(() => api.deleteStudent(st.id), 'Siswa dan datanya dihapus.')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="teacher-grid">
        <section className="card">
          <h2>Tim</h2>
          <div className="inline-form">
            <label htmlFor="tsize">Bagi otomatis siswa yang belum punya tim, ukuran</label>
            <select id="tsize" className="input small" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))}>
              {[3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <button type="button" className="btn" onClick={() => act(() => api.autoTeams(id, teamSize), 'Tim dibagi.')}>
              Bagi tim otomatis
            </button>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTeam.trim()) return;
              act(async () => {
                await api.addTeam(id, newTeam.trim());
                setNewTeam('');
              }, 'Tim ditambahkan.');
            }}
          >
            <input id="newteam" className="input" placeholder="Nama tim baru" maxLength={40} value={newTeam} onChange={(e) => setNewTeam(e.target.value)} />
            <button type="submit" className="btn btn-ghost">
              + Tambah tim
            </button>
          </form>
          <ul className="team-list">
            {teams.map((t) => (
              <li key={t.id}>
                <span className="team-dot" style={{ background: t.color }} aria-hidden="true" /> {t.name} ({prog.students.filter((s) => s.team_id === t.id).length} siswa)
              </li>
            ))}
            {!teams.length && <li className="muted">Belum ada tim. Ketuk "Bagi tim otomatis".</li>}
          </ul>
        </section>

        <section className="card">
          <h2>Tantangan Tim minggu ini</h2>
          {challenge && (
            <p className="muted small">
              Saat ini: {challenge.target} {METRIC_LABEL[challenge.metric]} (minggu mulai {challenge.week_start})
            </p>
          )}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => api.setChallenge(id, metric, Number(target)), 'Tantangan disimpan.');
            }}
          >
            <label htmlFor="target">Target</label>
            <input id="target" className="input small" type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} />
            <select id="metric" className="input" aria-label="Jenis target" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.entries(METRIC_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button type="submit" className="btn">
              Simpan
            </button>
          </form>
          {board && (
            <>
              <h3>Peringkat tim</h3>
              <ol className="leaderboard">
                {board.teams.map((t, i) => (
                  <li key={t.team_id}>
                    <span className="rank">{i + 1}</span>
                    <span className="team-dot" style={{ background: t.color }} aria-hidden="true" />
                    <span className="lb-name">
                      {t.team} {t.challenge_done ? '🎯' : ''}
                    </span>
                    <strong className="num">{t.avg_xp} XP</strong>
                  </li>
                ))}
                {!board.teams.length && <li className="muted">Belum ada tim.</li>}
              </ol>
            </>
          )}
        </section>
      </div>

      <TutorChats students={prog.students} api={api} />

      <section className="card">
        <h2>Data penelitian</h2>
        {cls.research_mode ? (
          <>
            <p>Unduh semua percobaan siswa (anonim: tanpa nama panggilan) dalam format CSV.</p>
            <button type="button" className="btn btn-primary" onClick={exportCsv}>
              ⬇️ Ekspor CSV
            </button>
          </>
        ) : (
          <p className="muted">Aktifkan Mode penelitian di atas setelah ada persetujuan orang tua/wali.</p>
        )}
      </section>

      <section className="card danger-zone">
        <h2>Hapus kelas</h2>
        <p className="muted small">Semua akun siswa dan data di kelas ini akan dihapus permanen.</p>
        <ConfirmButton
          label="Hapus kelas"
          confirmLabel="Ketuk sekali lagi untuk menghapus"
          className="btn btn-danger"
          onConfirm={() =>
            act(async () => {
              await api.deleteClass(id);
              navigate('/teacher', { replace: true });
            }, 'Kelas dihapus.')
          }
        />
      </section>

      {csv && (
        <Sheet title="Isi file CSV" onClose={() => setCsv(null)}>
          <p className="small">
            {csv.rows.length} baris · {csv.name}. Jika file tidak terunduh otomatis, salin teks di bawah ke Excel/Spreadsheet.
          </p>
          <div className="table-wrap">
            <table className="table small">
              <thead>
                <tr>
                  {Object.keys(csv.rows[0] || {}).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.rows.slice(0, 8).map((r, i) => (
                  <tr key={i}>
                    {Object.values(r).map((v, j) => (
                      <td key={j}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="label" htmlFor="csvtext">
            Teks CSV lengkap
          </label>
          <textarea id="csvtext" className="input csv-text" readOnly value={csv.text} rows={6} onFocus={(e) => e.target.select()} />
        </Sheet>
      )}
    </Screen>
  );
}
