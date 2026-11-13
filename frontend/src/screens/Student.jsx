// Layar Mode Siswa: Beranda (misi harian), Pemanasan, Peta Dunia, Dunia, Hasil.

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppState, saveSettings } from '../state.js';
import { PROBLEMS, WORLDS, worldOf, worldStats, TYPE_LABEL } from '../content.js';
import { ensureDaily, finishWarmup, recordAttempt, unlocked, lastResult } from '../game.js';
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

// ---------------------------------------------------------------- Beranda
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
  const greeting = allDone
    ? 'Semua misi hari ini selesai. Keren! Kamu boleh berlatih lagi di Peta Dunia.'
    : !daily.warmup.done
      ? 'Ayo mulai dengan Pemanasan, supaya otak siap!'
      : !daily.main.done
        ? 'Misi Utama menunggumu. Kerjakan pelan-pelan, satu tahap demi satu tahap.'
        : 'Tinggal Tantangan Tim. Poinmu membantu timmu!';

  return (
    <Screen className="home" nav>
      <header className="home-head">
        <span className="avatar-big" aria-hidden="true">
          {profile.avatar}
        </span>
        <div className="hh-text">
          <h1>Hai, {profile.nickname}!</h1>
          <small>
            Level {lvl.level} · {lvl.title}
            {profile.classroom ? ` · ${profile.classroom.name}` : ''}
          </small>
        </div>
        <span className={`streak ${streak ? 'on' : ''}`} title="Streak hari berturut-turut">
          🔥 {streak}
        </span>
      </header>
      <div className="xp-row">
        <ProgressBar value={lvl.current} max={lvl.needed} label="XP menuju level berikutnya" />
        <small>
          {lvl.current}/{lvl.needed} XP
        </small>
      </div>
      <Speech>{greeting}</Speech>
      <h2 className="section-title">Misi hari ini</h2>
      <MissionCard icon="🔥" title="Pemanasan" xp={10} desc="5 soal cepat bilangan bulat" to="/warmup" done={daily.warmup.done} />
      <MissionCard
        icon="🎯"
        title="Misi Utama"
        xp={30}
        desc={preview(main)}
        sub={`${worldOf(main.world).emoji} ${worldOf(main.world).title} · ${TYPE_LABEL[main.type]}`}
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
            Latihan di Peta Dunia
          </Link>
        </div>
      )}
      {!isStandalone() && !s.settings.installDismissed && (
        <div className="card install-card">
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

// ---------------------------------------------------------------- Peta Dunia (FR-04)
export function WorldMap() {
  const s = useAppState();
  const open = unlocked();
  return (
    <Screen className="map" nav>
      <h1>🗺️ Peta Dunia</h1>
      <p className="muted">Kota Ruas punya 7 dunia. Dunia baru terbuka setelah 70% soal dunia sebelumnya selesai.</p>
      <div className="world-path">
        {WORLDS.map((w) => {
          const st = worldStats(w.world, s.progress);
          const locked = !open.includes(w.world);
          let lockText = null;
          if (locked) {
            const prev = worldStats(w.world - 1, s.progress);
            const need = Math.max(0, Math.ceil(prev.total * UNLOCK_RATIO) - prev.done);
            lockText = open.includes(w.world - 1) ? `Selesaikan ${need} soal lagi di Dunia ${w.world - 1} untuk membuka.` : 'Masih terkunci.';
          }
          const inner = (
            <>
              <span className="wc-emoji" aria-hidden="true">
                {locked ? '🔒' : w.emoji}
              </span>
              <div className="wc-text">
                <small>Dunia {w.world}</small>
                <strong>{w.title}</strong>
                <span className="wc-topic">{w.topic}</span>
                {locked ? (
                  <small className="muted">{lockText}</small>
                ) : (
                  <div className="wc-progress">
                    <ProgressBar value={st.done} max={st.total} color={w.color} label={`Progres ${w.title}`} />
                    <small>
                      {st.done}/{st.total} · ★ {st.stars}
                    </small>
                  </div>
                )}
              </div>
            </>
          );
          return locked ? (
            <div key={w.world} className="world-card locked" style={{ '--world': w.color }}>
              {inner}
            </div>
          ) : (
            <Link key={w.world} className="world-card" to={`/world/${w.world}`} style={{ '--world': w.color }}>
              {inner}
            </Link>
          );
        })}
      </div>
    </Screen>
  );
}

export function World() {
  const s = useAppState();
  const n = Number(useParams().n);
  const w = worldOf(n);
  const [introOpen, setIntroOpen] = useState(false);
  const isOpen = w && unlocked().includes(n);
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
        <EmptyState title="Dunia masih terkunci" text="Selesaikan soal di dunia sebelumnya dulu, ya.">
          <Link className="btn" to="/map">
            Ke Peta
          </Link>
        </EmptyState>
      </Screen>
    );
  }
  const st = worldStats(n, s.progress);
  return (
    <Screen className="world" nav>
      <header className="world-head" style={{ '--world': w.color }}>
        <Link className="icon-btn" to="/map" aria-label="Kembali ke peta">
          ←
        </Link>
        <div>
          <small>Dunia {n}</small>
          <h1>
            {w.emoji} {w.title}
          </h1>
          <p>{w.topic}</p>
        </div>
      </header>
      <div className="xp-row">
        <ProgressBar value={st.done} max={st.total} color={w.color} />
        <small>
          {st.done}/{st.total} selesai
        </small>
      </div>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setIntroOpen(true)}>
        📇 Kartu istilah
      </button>
      <ol className="problem-list">
        {w.problems.map((p, i) => {
          const pr = s.progress[p.id];
          return (
            <li key={p.id}>
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
        })}
      </ol>
      {introOpen && (
        <Sheet title={`${w.emoji} Kartu istilah`} onClose={() => setIntroOpen(false)}>
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
  return (
    <Screen className="result">
      <div className="result-card">
        <Mascot size={110} />
        <h1>{r.kind === 'warmup' ? 'Pemanasan selesai!' : 'Soal selesai!'}</h1>
        <div className="big-stars">
          <Stars n={r.stars} />
        </div>
        <p className="lead">{msg}</p>
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
        {r.nextId && (
          <Link className="btn btn-primary btn-block" to={`/play/${r.nextId}`}>
            Soal berikutnya ▸
          </Link>
        )}
        <Link className={`btn btn-block ${r.nextId ? '' : 'btn-primary'}`} to="/home">
          🎯 Misi hari ini
        </Link>
        {r.world && (
          <Link className="btn btn-ghost btn-block" to={`/world/${r.world}`}>
            Kembali ke Dunia {r.world}
          </Link>
        )}
      </div>
    </Screen>
  );
}
