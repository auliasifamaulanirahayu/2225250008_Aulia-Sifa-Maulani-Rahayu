// Layar Mode Siswa: Dashboard, Pemanasan, Mission Map, halaman misi, Hasil, AI Math Tutor.

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppState, saveSettings } from '../state.js';
import { PROBLEMS, WORLDS, LESSONS, worldOf, worldStats, missionLabel, TYPE_LABEL } from '../content.js';
import { ensureDaily, finishWarmup, recordAttempt, unlocked, lastResult, recommendation } from '../game.js';
import { Planet } from '../components/GalaxyArt.jsx';
import { TutorChat } from '../components/TutorChat.jsx';
import { levelInfo, visibleStreak, todayStr } from '../engine/xp.js';
import { missionComplete, UNLOCK_RATIO } from '../engine/mission-picker.js';
import { makeWarmup } from '../engine/warmup.js';
import { pretty } from '../engine/equation.js';
import { Screen, ProgressBar, Speech, Stars, Sheet, EmptyState, Feedback, Mascot, Loading } from '../components/ui.jsx';
import { InputPad } from '../components/Keypad.jsx';
import { parseNumber } from './problem/stages.jsx';
import { isStandalone } from '../pwa.js';
import { pendingCount, onSync } from '../store/sync.js';
import { sfx } from '../sound.js';

const preview = (p) => (p.story?.length ? p.story[0] : pretty(p.equation));

function MissionCard({ icon, title, xp, desc, sub, to, done }) {
  const inner = (
    <>
      <span className="mc-icon" aria-hidden="true">
        {done ? '✅' : icon}
      </span>
      <div className="mc-text">
        <strong>{title}</strong>
        <span className="mc-desc">{desc}</span>
        {sub && <small>{sub}</small>}
      </div>
      <span className="mc-xp">{done ? 'Selesai' : `+${xp} XP`}</span>
    </>
  );
  return to ? (
    <Link className={`mission-card ${done ? 'done' : ''}`} to={to}>
      {inner}
    </Link>
  ) : (
    <div className={`mission-card ${done ? 'done' : ''} disabled`}>{inner}</div>
  );
}

const card = 'rounded-2xl border border-line bg-surface/80 p-4';

/** Status planet sebuah misi untuk peta & dashboard. */
function missionState(n, open, progress) {
  const st = worldStats(n, progress);
  if (!open.includes(n)) return { st, state: 'locked' };
  if (st.complete) return { st, state: 'done' };
  return { st, state: n === Math.max(...open) ? 'active' : 'open' };
}

function recText(rec) {
  const w = worldOf(rec.problem.world);
  const where = `${missionLabel(w.world)} · ${w.title}`;
  if (rec.kind === 'main') return { title: 'Kerjakan Misi Utama hari ini', where };
  if (rec.kind === 'next') return { title: `Lanjutkan ${missionLabel(w.world)}`, where: `${w.title} · ${TYPE_LABEL[rec.problem.type]}` };
  return { title: 'Ulangi soal untuk menambah bintang', where };
}

// ---------------------------------------------------------------- Dashboard (Beranda)
export function Home() {
  const s = useAppState();
  const [daily, setDaily] = useState(s.daily);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    ensureDaily().then(setDaily);
    const refresh = () => pendingCount().then(setPending);
    refresh();
    return onSync(refresh);
  }, []);
  if (!daily) return <Screen nav><Loading /></Screen>;

  const { profile, stats } = s;
  const lvl = levelInfo(stats.xp);
  const streak = visibleStreak(stats, todayStr());
  const main = PROBLEMS.get(daily.main.problemId);
  const teamLeft = daily.team.problemIds.filter((id) => !daily.team.done.includes(id));
  const allDone = missionComplete(daily);
  const open = unlocked();
  const missions = WORLDS.map((w) => ({ w, ...missionState(w.world, open, s.progress) }));
  const doneMissions = missions.filter((m) => m.state === 'done');
  const totalDone = missions.reduce((a, m) => a + m.st.done, 0);
  const totalAll = missions.reduce((a, m) => a + m.st.total, 0);
  const rec = recommendation(daily);
  const rt = rec && recText(rec);

  return (
    <Screen className="home" nav>
      <header className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface text-3xl" aria-hidden="true">
          {profile.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate text-2xl font-extrabold">Hai, {profile.nickname}!</h1>
          <p className="m-0 truncate text-sm text-muted">
            {profile.classroom ? profile.classroom.name : 'Penjelajah galaksi PLSV'}
          </p>
        </div>
        <span className={`streak ${streak ? 'on' : ''}`} title="Streak hari berturut-turut">
          🔥 {streak}
        </span>
      </header>

      {/* Level & XP */}
      <section className={`${card} mt-4`} aria-label="Level dan XP">
        <div className="flex items-baseline justify-between gap-2">
          <strong className="text-lg">
            Level {lvl.level} · <span className="text-galaxy-cyan">{lvl.title}</span>
          </strong>
          <span className="text-sm text-muted" data-xp>{stats.xp} XP</span>
        </div>
        <div className="mt-2">
          <ProgressBar value={lvl.current} max={lvl.needed} label="XP menuju level berikutnya" />
        </div>
        <p className="mt-1 mb-0 text-xs text-muted">
          {lvl.needed - lvl.current} XP lagi menuju level berikutnya
        </p>
      </section>

      {/* Rekomendasi */}
      {rec && (
        <Link
          to={rec.to}
          className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-galaxy-royal to-galaxy-purple p-4 text-white no-underline shadow-[0_0_24px_rgb(118_82_216/30%)]"
        >
          <span className="text-3xl" aria-hidden="true">🚀</span>
          <span className="min-w-0 flex-1">
            <small className="block text-xs font-bold uppercase tracking-wider text-white/80">Rekomendasi untukmu</small>
            <strong className="block">{rt.title}</strong>
            <span className="block truncate text-sm text-white/85">{rt.where}</span>
          </span>
          <span aria-hidden="true" className="text-xl">›</span>
        </Link>
      )}

      {/* Progres pembelajaran */}
      <section className={`${card} mt-3`} aria-labelledby="prog-title">
        <div className="flex items-baseline justify-between">
          <h2 id="prog-title" className="m-0 text-base font-extrabold">Progres belajar</h2>
          <Link to="/map" className="text-sm font-bold">
            Mission Map ›
          </Link>
        </div>
        <ol className="mt-3 mb-0 flex list-none justify-between gap-1 p-0">
          {missions.map(({ w, st, state }) => (
            <li key={w.world} className="flex flex-col items-center gap-1">
              <Planet color={w.color} size={38} state={state} progress={st.done / st.total} label={w.world} />
              <span className="sr-only">
                {missionLabel(w.world)} {w.title}: {state === 'locked' ? 'terkunci' : `${st.done} dari ${st.total} soal`}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 mb-0 text-sm text-muted">
          {totalDone}/{totalAll} soal selesai · {doneMissions.length}/7 misi tuntas
        </p>
      </section>

      {/* Misi tersedia hari ini */}
      <h2 className="section-title">Misi hari ini</h2>
      <MissionCard icon="🔥" title="Pemanasan" xp={10} desc="5 soal cepat bilangan bulat" to="/warmup" done={daily.warmup.done} />
      <MissionCard
        icon="🎯"
        title="Misi Utama"
        xp={30}
        desc={preview(main)}
        sub={`${worldOf(main.world).emoji} ${missionLabel(main.world)} · ${TYPE_LABEL[main.type]}`}
        to={`/play/${main.id}?m=main`}
        done={daily.main.done}
      />
      <MissionCard
        icon="👥"
        title="Tantangan Tim"
        xp={20}
        desc={`${daily.team.done.length}/${daily.team.problemIds.length} soal`}
        sub={profile.demo ? 'Mode demo: poin tidak masuk ke tim' : 'Poinmu masuk ke target tim minggu ini'}
        to={teamLeft.length ? `/play/${teamLeft[0]}?m=team` : null}
        done={!teamLeft.length}
      />
      {allDone && (
        <div className="card center celebrate">
          <p>🎉 Bonus Misi Lengkap +20 XP sudah kamu dapatkan!</p>
          <Link className="btn" to="/map">
            Latihan di Mission Map
          </Link>
        </div>
      )}

      {/* Zona belajar */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Link to="/learn" className={`${card} text-ink no-underline hover:border-galaxy-cyan`}>
          <span className="text-2xl" aria-hidden="true">📚</span>
          <strong className="mt-1 block">Learning Zone</strong>
          <span className="text-sm text-muted">8 materi PLSV</span>
        </Link>
        <Link to="/challenge" className={`${card} text-ink no-underline hover:border-galaxy-cyan`}>
          <span className="text-2xl" aria-hidden="true">🎯</span>
          <strong className="mt-1 block">Challenge Zone</strong>
          <span className="text-sm text-muted">Easy · Medium · Advanced</span>
        </Link>
      </div>

      {/* AI Tutor */}
      <Link to="/tutor" className={`${card} mt-3 flex items-center gap-3 text-ink no-underline hover:border-galaxy-cyan`}>
        <Mascot size={44} />
        <span className="flex-1">
          <strong className="block">AI Math Tutor</strong>
          <span className="text-sm text-muted">Bingung? Tanya tutor, dibimbing langkah demi langkah.</span>
        </span>
        <span aria-hidden="true" className="text-xl text-muted">›</span>
      </Link>

      {/* Misi tuntas */}
      <section className="mt-5" aria-labelledby="done-title">
        <h2 id="done-title" className="section-title">Misi yang sudah tuntas</h2>
        {doneMissions.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {doneMissions.map(({ w }) => (
              <li key={w.world}>
                <Link to={`/world/${w.world}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink no-underline">
                  <span aria-hidden="true">{w.emoji}</span> {missionLabel(w.world)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-muted">Belum ada. Tuntaskan semua soal sebuah misi untuk mendapat lencana planet.</p>
        )}
      </section>

      {!isStandalone() && !s.settings.installDismissed && (
        <div className="card install-card mt-4">
          <div>
            <strong>📲 Pasang di HP-mu</strong>
            <p className="small">Buka dari layar utama dan main tanpa internet.</p>
          </div>
          <Link className="btn btn-small" to="/install">
            Caranya
          </Link>
          <button
            type="button"
            className="icon-btn"
            aria-label="Tutup"
            onClick={() => {
              s.settings.installDismissed = true;
              saveSettings();
            }}
          >
            ✕
          </button>
        </div>
      )}
      {pending > 0 && !profile.demo && <p className="muted small center">☁️ {pending} data menunggu dikirim saat ada internet.</p>}
    </Screen>
  );
}

// ---------------------------------------------------------------- Pemanasan (FR-12)
export function Warmup() {
  const navigate = useNavigate();
  const [daily, setDaily] = useState(null);
  const [i, setI] = useState(0);
  const [fb, setFb] = useState(null);
  const [state] = useState(() => ({ results: [], firstTry: true, attempts: 0, start: Date.now() }));
  useEffect(() => {
    ensureDaily().then(setDaily);
  }, []);
  const items = useMemo(() => {
    if (!daily) return [];
    const seed = daily.warmup.done ? `${daily.day}-${Date.now()}` : daily.day;
    return makeWarmup(seed, { focusSign: daily.warmup.focusSign });
  }, [daily]);
  if (!daily) return <Screen><Loading /></Screen>;
  const item = items[i];

  const submit = async (v, clear) => {
    const n = parseNumber(v);
    if (n === null) return setFb('Tulis jawabanmu berupa bilangan.');
    state.attempts++;
    const correct = n.equals(item.answer);
    await recordAttempt({ problemId: item.id, stage: 'warmup', correct, attemptNo: state.attempts, durationMs: Date.now() - state.start, answer: v });
    if (!correct) {
      state.firstTry = false;
      sfx.soft();
      return setFb(`Hampir! ${item.hint}`);
    }
    sfx.good();
    state.results.push({ firstTry: state.firstTry });
    Object.assign(state, { firstTry: true, attempts: 0, start: Date.now() });
    setFb(null);
    clear();
    if (i + 1 < items.length) setI(i + 1);
    else {
      await finishWarmup(state.results);
      navigate('/result');
    }
  };

  return (
    <Screen className="warmup">
      <header className="simple-head">
        <Link className="icon-btn" to="/home" aria-label="Kembali">
          ←
        </Link>
        <h1>
          Pemanasan {i + 1}/{items.length}
        </h1>
      </header>
      <ProgressBar value={i} max={items.length} label="Progres pemanasan" />
      <div className="warmup-card">
        <div className="eq-big">{item.prompt}</div>
        <p className="muted">{item.ask || '= ?'}</p>
      </div>
      {fb && <Feedback kind="warn">{fb}</Feedback>}
      <InputPad key={i} layout="number" okLabel="Cek" ariaLabel="Jawaban" onSubmit={submit} />
    </Screen>
  );
}

// ---------------------------------------------------------------- Mission Map (FR-04)
function lockReason(n, open, progress) {
  const prev = worldStats(n - 1, progress);
  const need = Math.max(0, Math.ceil(prev.total * UNLOCK_RATIO) - prev.done);
  return open.includes(n - 1)
    ? `Selesaikan ${need} soal lagi di ${missionLabel(n - 1)} untuk membuka misi ini.`
    : `Buka ${missionLabel(n - 1)} dulu.`;
}

export function WorldMap() {
  const s = useAppState();
  const open = unlocked();
  return (
    <Screen className="map" nav>
      <h1 className="text-2xl font-extrabold">🌌 Mission Map</h1>
      <p className="muted">
        7 misi PLSV berurutan. Misi berikutnya terbuka setelah {Math.round(UNLOCK_RATIO * 100)}% soal misi sebelumnya
        selesai.
      </p>
      <ol className="relative m-0 mt-4 list-none p-0">
        {/* jalur orbit putus-putus di belakang planet */}
        <span aria-hidden="true" className="absolute top-8 bottom-8 left-1/2 w-0 -translate-x-1/2 border-l-2 border-dashed border-line" />
        {WORLDS.map((w, i) => {
          const { st, state } = missionState(w.world, open, s.progress);
          const locked = state === 'locked';
          const left = i % 2 === 0;
          const body = (
            <>
              <Planet color={w.color} size={68} state={state} progress={st.done / st.total} label={w.world} />
              <span className={`min-w-0 flex-1 ${left ? 'text-left' : 'text-right'}`}>
                <small className="block text-xs font-bold uppercase tracking-wider text-galaxy-cyan">
                  {missionLabel(w.world)} {state === 'active' && '· sedang dijelajahi'}
                  {state === 'done' && '· tuntas'}
                </small>
                <strong className="block leading-tight">{w.title}</strong>
                {locked ? (
                  <span className="mt-1 block text-xs text-muted">{lockReason(w.world, open, s.progress)}</span>
                ) : (
                  <span className="mt-1 block text-xs text-muted">
                    {st.done}/{st.total} soal · ★ {st.stars}
                  </span>
                )}
              </span>
            </>
          );
          const cls = `relative z-[1] my-3 flex w-[88%] items-center gap-3 rounded-2xl border p-3 no-underline ${
            left ? 'mr-auto' : 'ml-auto flex-row-reverse'
          } ${locked ? 'border-line bg-surface/50 text-muted' : 'border-line bg-surface text-ink hover:border-galaxy-cyan'} ${
            state === 'active' ? 'border-galaxy-cyan shadow-glow' : ''
          }`;
          return (
            <li key={w.world}>
              {locked ? (
                <div className={cls} aria-disabled="true">
                  {body}
                </div>
              ) : (
                <Link className={cls} to={`/world/${w.world}`}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

// ---------------------------------------------------------------- Halaman misi
function ProblemRow({ p, i, pr }) {
  return (
    <li>
      <Link className={`problem-item ${pr?.done ? 'done' : ''}`} to={`/play/${p.id}`}>
        <span className="pi-num">{pr?.done ? '✓' : i + 1}</span>
        <div className="pi-text">
          <small>{TYPE_LABEL[p.type]}</small>
          <span>{p.story?.length ? `${p.emoji || ''} ${p.story[0]}` : pretty(p.equation)}</span>
        </div>
        <Stars n={pr?.bestStars || 0} />
      </Link>
    </li>
  );
}

export function World() {
  const s = useAppState();
  const n = Number(useParams().n);
  const w = worldOf(n);
  const [introOpen, setIntroOpen] = useState(false);
  const open = unlocked();
  const isOpen = w && open.includes(n);
  useEffect(() => {
    if (isOpen && !s.settings.seenIntro[n]) {
      s.settings.seenIntro[n] = true;
      saveSettings();
      setIntroOpen(true);
    }
  }, [n, isOpen, s.settings]);
  if (!isOpen) {
    return (
      <Screen nav>
        <EmptyState title="Misi masih terkunci" text={w ? lockReason(n, open, s.progress) : 'Misi tidak ditemukan.'}>
          <Link className="btn" to="/map">
            Ke Mission Map
          </Link>
        </EmptyState>
      </Screen>
    );
  }
  const st = worldStats(n, s.progress);
  const examples = w.problems.filter((p) => p.type === 'worked' || p.type === 'faded');
  const practice = w.problems.filter((p) => p.type !== 'worked' && p.type !== 'faded');
  const next = w.problems.find((p) => !s.progress[p.id]?.done);
  return (
    <Screen className="world" nav>
      <header className="flex items-center gap-3">
        <Link className="icon-btn" to="/map" aria-label="Kembali ke Mission Map">
          ←
        </Link>
        <Planet color={w.color} size={52} state={st.complete ? 'done' : 'open'} progress={st.done / st.total} label={n} />
        <div className="min-w-0">
          <small className="block text-xs font-bold uppercase tracking-wider text-galaxy-cyan">{missionLabel(n)}</small>
          <h1 className="m-0 text-xl leading-tight font-extrabold">{w.title}</h1>
        </div>
      </header>

      <div className="xp-row mt-3">
        <ProgressBar value={st.done} max={st.total} color={w.color} label={`Progres ${w.title}`} />
        <small>
          {st.done}/{st.total} selesai
        </small>
      </div>
      {st.complete && <Feedback kind="good">Misi tuntas! Lencana {missionLabel(n)} sudah kamu dapatkan.</Feedback>}

      <section className={`${card} mt-3`} aria-labelledby="goal-title">
        <h2 id="goal-title" className="m-0 text-base font-extrabold">🎯 Tujuan pembelajaran</h2>
        <ul className="mt-2 mb-0 pl-5 text-sm">
          {w.goal.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setIntroOpen(true)}>
            📇 Materi singkat
          </button>
          {LESSONS.filter((l) => l.mission === n).map((l) => (
            <Link key={l.id} className="btn btn-ghost btn-small" to="/learn">
              📚 {l.title}
            </Link>
          ))}
        </div>
      </section>

      {next && (
        <Link className="btn btn-primary btn-block mt-3" to={`/play/${next.id}`}>
          {st.done ? 'Lanjutkan misi ▸' : 'Mulai misi ▸'}
        </Link>
      )}

      <h2 className="section-title">Contoh soal</h2>
      <ol className="problem-list">
        {examples.map((p) => (
          <ProblemRow key={p.id} p={p} i={w.problems.indexOf(p)} pr={s.progress[p.id]} />
        ))}
      </ol>
      <h2 className="section-title">Latihan</h2>
      <ol className="problem-list">
        {practice.map((p) => (
          <ProblemRow key={p.id} p={p} i={w.problems.indexOf(p)} pr={s.progress[p.id]} />
        ))}
      </ol>

      {introOpen && (
        <Sheet title={`${w.emoji} Materi singkat`} onClose={() => setIntroOpen(false)}>
          <div className="intro-cards">
            {w.intro.map((c) => (
              <div className="intro-card" key={c.term}>
                <strong>{c.term}</strong>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------- Hasil
export function Result() {
  const s = useAppState();
  const r = lastResult;
  useEffect(() => {
    if (r) sfx.win();
  }, [r]);
  if (!r) return <Navigate to="/home" replace />;
  const lvl = levelInfo(s.stats.xp);
  const msg =
    r.stars === 3 ? 'Sempurna! Tanpa petunjuk dan langsung benar.' : r.stars === 2 ? 'Bagus sekali! Terus berlatih.' : 'Selesai! Setiap percobaan membuatmu makin paham.';
  const mw = r.missionDone ? worldOf(r.world) : null;
  const opened = r.world && unlocked().includes(r.world + 1) && !s.settings.seenIntro[r.world + 1] ? worldOf(r.world + 1) : null;
  return (
    <Screen className="result">
      <div className="result-card">
        <Mascot size={110} />
        <h1>{r.kind === 'warmup' ? 'Pemanasan selesai!' : 'Soal selesai!'}</h1>
        <div className="big-stars">
          <Stars n={r.stars} />
        </div>
        <p className="lead">{msg}</p>
        {mw && (
          <div className="animate-fade-up my-3 rounded-2xl border border-galaxy-cyan bg-surface-2 p-4 text-center shadow-glow">
            <Planet color={mw.color} size={64} state="done" progress={1} label={mw.world} />
            <strong className="mt-2 block text-lg">🏆 {missionLabel(mw.world)} tuntas!</strong>
            <span className="text-sm text-muted">Kamu menjelajahi seluruh planet {mw.title}.</span>
          </div>
        )}
        {opened && (
          <Feedback kind="good">
            🔓 {missionLabel(opened.world)} — {opened.title} sudah terbuka!
          </Feedback>
        )}
        <ul className="xp-lines">
          {r.lines.map((l) => (
            <li key={l.label}>
              <span>{l.label}</span>
              <strong>+{l.xp} XP</strong>
            </li>
          ))}
          <li className="total">
            <span>Total</span>
            <strong>+{r.total} XP</strong>
          </li>
        </ul>
        {r.levelUp && (
          <div className="level-up">
            ⬆️ Naik level! Sekarang Level {lvl.level} — {lvl.title}
          </div>
        )}
        <div className="xp-row">
          <ProgressBar value={lvl.current} max={lvl.needed} />
          <small>
            Level {lvl.level}: {lvl.current}/{lvl.needed} XP
          </small>
        </div>
        {r.badges.length > 0 && (
          <div className="new-badges">
            <h2>Lencana baru!</h2>
            {r.badges.map((b) => (
              <div className="badge on" key={b.code}>
                <span className="badge-icon">{b.icon}</span>
                <strong>{b.name}</strong>
                <small>{b.desc}</small>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="actions stack">
        {opened ? (
          <Link className="btn btn-primary btn-block" to={`/world/${opened.world}`}>
            Jelajahi {missionLabel(opened.world)} ▸
          </Link>
        ) : (
          r.nextId && (
            <Link className="btn btn-primary btn-block" to={`/play/${r.nextId}`}>
              Soal berikutnya ▸
            </Link>
          )
        )}
        <Link className={`btn btn-block ${r.nextId || opened ? '' : 'btn-primary'}`} to="/home">
          🏠 Dashboard
        </Link>
        {r.world && (
          <Link className="btn btn-ghost btn-block" to={`/world/${r.world}`}>
            Kembali ke {missionLabel(r.world)}
          </Link>
        )}
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- AI Math Tutor (umum, dari Dashboard)
export function Tutor() {
  return (
    <Screen nav>
      <header className="simple-head">
        <Link className="icon-btn" to="/home" aria-label="Kembali">
          ←
        </Link>
        <h1>🤖 AI Math Tutor</h1>
      </header>
      <TutorChat />
      <p className="mt-4 text-sm text-muted">
        Sedang mengerjakan soal? Ketuk tombol 🤖 di layar soal agar Kak Orbit tahu soalnya.
      </p>
    </Screen>
  );
}
