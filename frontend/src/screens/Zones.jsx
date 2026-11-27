// Learning Zone (ketentuan E) dan Challenge Zone (ketentuan F).
// Learning Zone: 8 materi kecil, SATU bagian per layar (penjelasan + visual → contoh bertahap → ringkasan → latihan).
// Challenge Zone: Easy / Medium / Advanced; pilihan ganda, isian, menentukan langkah, soal cerita (+ Periksa).

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../state.js';
import { LESSONS, CHALLENGE, CHALLENGE_LEVELS, missionLabel } from '../content.js';
import { completeLesson, lessonDone, recordZoneAnswer, solveChallenge } from '../game.js';
import { parseEquation, pretty } from '../engine/equation.js';
import { Screen, ProgressBar, EmptyState, Feedback } from '../components/ui.jsx';
import { BalanceScale } from '../components/BalanceScale.jsx';
import { QuestionCard } from '../components/Question.jsx';

const card = 'rounded-2xl border border-line bg-surface/80 p-4';

function Head({ back, title, sub }) {
  return (
    <header className="simple-head">
      <Link className="icon-btn" to={back} aria-label="Kembali">
        ←
      </Link>
      <div className="min-w-0">
        <h1 className="m-0 truncate">{title}</h1>
        {sub && <p className="m-0 text-sm text-muted">{sub}</p>}
      </div>
    </header>
  );
}

/** Materi terbuka berurutan: materi n butuh materi n−1 tuntas (L7 "Perubahan Tanda" butuh L6 "Kedua Ruas"). */
export function lessonOpen(i) {
  return i === 0 || lessonDone(LESSONS[i - 1].id);
}

// ---------------------------------------------------------------- Learning Zone
export function LearningZone() {
  useAppState();
  const done = LESSONS.filter((l) => lessonDone(l.id)).length;
  return (
    <Screen nav>
      <Head back="/home" title="📚 Learning Zone" sub="Materi PLSV dalam bagian kecil" />
      <div className="xp-row">
        <ProgressBar value={done} max={LESSONS.length} label="Materi tuntas" />
        <small>
          {done}/{LESSONS.length} materi
        </small>
      </div>
      <ol className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {LESSONS.map((l, i) => {
          const open = lessonOpen(i);
          const ok = lessonDone(l.id);
          const inner = (
            <>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden="true">
                {open ? l.emoji : '🔒'}
              </span>
              <span className="min-w-0 flex-1">
                <small className="block text-xs font-bold uppercase tracking-wider text-galaxy-cyan">Materi {i + 1}</small>
                <strong className="block leading-tight">{l.title}</strong>
                <span className="text-xs text-muted">
                  {open ? `Terkait ${missionLabel(l.mission)}` : `Tuntaskan materi ${i} dulu untuk membuka.`}
                </span>
              </span>
              {ok && (
                <span className="text-lg font-bold text-[var(--c-success)]" aria-label="Tuntas">
                  ✓
                </span>
              )}
            </>
          );
          const cls = `flex items-center gap-3 rounded-2xl border p-3 no-underline ${
            open ? 'border-line bg-surface text-ink hover:border-galaxy-cyan' : 'border-line bg-surface/50 text-muted'
          }`;
          return (
            <li key={l.id}>
              {open ? (
                <Link className={cls} to={`/learn/${l.id}`}>
                  {inner}
                </Link>
              ) : (
                <div className={cls} aria-disabled="true">
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Screen>
  );
}

// ---------------------------------------------------------------- tampilan halaman materi
const PART_STYLE = {
  var: ['bg-galaxy-cyan text-galaxy-navy', 'variabel'],
  coef: ['bg-galaxy-purple text-white', 'koefisien'],
  const: ['bg-[var(--c-warn)] text-galaxy-navy', 'konstanta'],
  op: ['bg-surface-2 text-ink', ''],
  eq: ['bg-surface-2 text-ink', ''],
};

function Visual({ v }) {
  if (!v) return null;
  if (v.type === 'balance') {
    let eq = null;
    try {
      eq = parseEquation(v.eq);
    } catch {
      return null;
    }
    return <BalanceScale eq={eq} />;
  }
  if (v.type === 'parts') {
    const legend = [...new Set(v.tokens.map(([, k]) => k))].filter((k) => PART_STYLE[k][1]);
    return (
      <div className={card}>
        <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-2xl" aria-label={v.tokens.map(([t]) => t).join(' ')}>
          {v.tokens.map(([t, k], i) => (
            <span key={i} className={`rounded-lg px-2 py-1 font-bold ${PART_STYLE[k][0]}`}>
              {t}
            </span>
          ))}
        </div>
        <ul className="m-0 mt-3 flex list-none flex-wrap justify-center gap-3 p-0 text-sm">
          {legend.map((k) => (
            <li key={k} className="flex items-center gap-1">
              <span className={`inline-block size-3 rounded ${PART_STYLE[k][0]}`} aria-hidden="true" /> {PART_STYLE[k][1]}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (v.type === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {v.headers.map((h) => (
                <th key={h} className="border-b border-line p-2 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i} className={`border-b border-line p-2 ${i === 0 ? 'font-mono whitespace-nowrap' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

function ExplainPage({ pg }) {
  return (
    <>
      <h2 className="text-xl font-extrabold">{pg.title}</h2>
      <div className={card}>
        {pg.text.map((t) => (
          <p key={t} className="m-0 mb-2 last:mb-0">
            {t}
          </p>
        ))}
      </div>
      <div className="mt-3">
        <Visual v={pg.visual} />
      </div>
    </>
  );
}

function ExamplePage({ pg, shown, onMore }) {
  return (
    <>
      <h2 className="text-xl font-extrabold">{pg.title}</h2>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {pg.lines.slice(0, shown).map((l, i) => (
          <li key={i} className="animate-fade-up rounded-xl border border-line bg-surface p-3">
            <span className="mr-2 font-extrabold text-galaxy-cyan">{i + 1}.</span>
            {l.text}
            {l.eq && <div className="eq-big my-1">{pretty(l.eq)}</div>}
          </li>
        ))}
      </ol>
      {shown < pg.lines.length && (
        <button type="button" className="btn btn-block mt-3" onClick={onMore}>
          Langkah berikutnya ▾
        </button>
      )}
    </>
  );
}

function SummaryPage({ pg }) {
  return (
    <>
      <h2 className="text-xl font-extrabold">📝 Ringkasan</h2>
      <ul className={`${card} m-0 list-none`}>
        {pg.points.map((t) => (
          <li key={t} className="flex gap-2 py-1">
            <span aria-hidden="true" className="text-[var(--c-success)]">
              ✓
            </span>
            {t}
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- satu materi
export function Lesson() {
  useAppState();
  const navigate = useNavigate();
  const { id } = useParams();
  const idx = LESSONS.findIndex((l) => l.id === id);
  const lesson = LESSONS[idx];
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(1);
  const [qi, setQi] = useState(0);
  const [results, setResults] = useState([]);
  const [reward, setReward] = useState(null);

  if (!lesson || !lessonOpen(idx)) {
    return (
      <Screen nav>
        <EmptyState title="Materi masih terkunci" text={lesson ? `Tuntaskan materi ${idx} dulu, ya.` : 'Materi tidak ditemukan.'}>
          <Link className="btn" to="/learn">
            Ke Learning Zone
          </Link>
        </EmptyState>
      </Screen>
    );
  }

  const pg = lesson.pages[page];
  const isQuiz = pg.kind === 'quiz';
  const exampleDone = pg.kind !== 'example' || shown >= pg.lines.length;
  const go = (n) => {
    setPage(n);
    setShown(1);
    setQi(0);
    setResults([]);
    setReward(null);
    window.scrollTo({ top: 0 });
  };

  let content;
  if (pg.kind === 'explain') content = <ExplainPage pg={pg} />;
  else if (pg.kind === 'example') content = <ExamplePage pg={pg} shown={shown} onMore={() => setShown((s) => s + 1)} />;
  else if (pg.kind === 'summary') content = <SummaryPage pg={pg} />;
  else if (qi < pg.questions.length) {
    const q = pg.questions[qi];
    content = (
      <>
        <h2 className="text-xl font-extrabold">
          ✏️ Latihan pemahaman {qi + 1}/{pg.questions.length}
        </h2>
        <QuestionCard
          key={q.id}
          q={q}
          onAttempt={(a) => recordZoneAnswer({ id: q.id, stage: 'lesson', ...a })}
          onDone={async (r) => {
            const all = [...results, r.solved];
            setResults(all);
            if (qi + 1 < pg.questions.length) return setQi(qi + 1);
            setQi(qi + 1);
            if (all.every(Boolean)) setReward(await completeLesson(lesson));
          }}
        />
      </>
    );
  } else {
    const allOk = results.every(Boolean);
    content = (
      <div className={`${card} text-center`}>
        <p className="m-0 text-4xl" aria-hidden="true">
          {allOk ? '🎉' : '💪'}
        </p>
        <h2 className="text-xl font-extrabold">{allOk ? 'Materi tuntas!' : 'Hampir tuntas!'}</h2>
        <p className="text-muted">
          {allOk
            ? reward?.xp
              ? `Kamu mendapat +${reward.xp} XP.`
              : 'Materi ini sudah pernah kamu tuntaskan. Bagus untuk mengulang!'
            : 'Ada latihan yang dilewati. Baca lagi contohnya, lalu coba latihannya sekali lagi.'}
        </p>
        {reward?.badges?.map((b) => (
          <Feedback key={b.code} kind="good">
            Lencana baru: {b.icon} {b.name}
          </Feedback>
        ))}
        <div className="mt-3 flex flex-col gap-2">
          {allOk && idx + 1 < LESSONS.length && (
            <button type="button" className="btn btn-primary btn-block" onClick={() => (navigate(`/learn/${LESSONS[idx + 1].id}`), go(0))}>
              Materi berikutnya ▸
            </button>
          )}
          {!allOk && (
            <button type="button" className="btn btn-primary btn-block" onClick={() => go(page)}>
              Coba latihan lagi
            </button>
          )}
          <Link className="btn btn-block" to="/learn">
            Kembali ke Learning Zone
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Screen>
      <Head back="/learn" title={`${lesson.emoji} ${lesson.title}`} sub={`Materi ${idx + 1} · bagian ${page + 1}/${lesson.pages.length}`} />
      <ProgressBar value={page + (isQuiz && qi >= pg.questions.length ? 1 : 0)} max={lesson.pages.length} label="Progres materi" />
      <main className="mt-3">{content}</main>
      {!isQuiz && (
        <div className="actions mt-4 flex gap-2">
          {page > 0 && (
            <button type="button" className="btn flex-1" onClick={() => go(page - 1)}>
              ◂ Kembali
            </button>
          )}
          <button type="button" className="btn btn-primary flex-[2]" disabled={!exampleDone} onClick={() => go(page + 1)}>
            {lesson.pages[page + 1]?.kind === 'quiz' ? 'Mulai latihan ▸' : 'Lanjut ▸'}
          </button>
        </div>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------- Challenge Zone
export function ChallengeZone() {
  const s = useAppState();
  return (
    <Screen nav>
      <Head back="/home" title="🎯 Challenge Zone" sub="Latihan bertahap dengan umpan balik" />
      <div className="flex flex-col gap-3">
        {CHALLENGE_LEVELS.map((lv) => {
          const qs = CHALLENGE.filter((q) => q.level === lv.key);
          const solved = qs.filter((q) => s.progress[q.id]?.done).length;
          return (
            <Link key={lv.key} to={`/challenge/${lv.key}`} className={`${card} flex items-center gap-3 text-ink no-underline hover:border-galaxy-cyan`}>
              <span className="text-4xl" aria-hidden="true">
                {lv.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-lg">{lv.name}</strong>
                <span className="block text-sm text-muted">{lv.desc}</span>
                <span className="mt-2 block">
                  <ProgressBar value={solved} max={qs.length} label={`Progres ${lv.name}`} />
                </span>
                <small className="text-muted">
                  {solved}/{qs.length} soal benar
                </small>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">
        Jenis soal: pilihan ganda, isian singkat, menentukan langkah, dan soal cerita. Salah itu wajar: baca penjelasannya,
        lalu coba lagi.
      </p>
    </Screen>
  );
}

export function ChallengeRun() {
  const s = useAppState();
  const { level } = useParams();
  const lv = CHALLENGE_LEVELS.find((l) => l.key === level);
  // urutan sesi: yang belum benar dulu, lalu yang sudah benar (untuk berlatih lagi)
  const qs = useMemo(() => {
    const all = CHALLENGE.filter((q) => q.level === level);
    return [...all.filter((q) => !s.progress[q.id]?.done), ...all.filter((q) => s.progress[q.id]?.done)];
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [score, setScore] = useState({ correct: 0, xp: 0, badges: [] });

  if (!lv) {
    return (
      <Screen nav>
        <EmptyState title="Level tidak ditemukan" text="Pilih level di Challenge Zone.">
          <Link className="btn" to="/challenge">
            Ke Challenge Zone
          </Link>
        </EmptyState>
      </Screen>
    );
  }

  if (i >= qs.length) {
    return (
      <Screen>
        <Head back="/challenge" title={`${lv.emoji} ${lv.name}`} />
        <div className={`${card} text-center`}>
          <p className="m-0 text-4xl" aria-hidden="true">
            🏁
          </p>
          <h2 className="text-xl font-extrabold">Sesi selesai!</h2>
          <p>
            Benar {score.correct} dari {qs.length} soal · +{score.xp} XP
          </p>
          {score.badges.map((b) => (
            <Feedback key={b.code} kind="good">
              Lencana baru: {b.icon} {b.name}
            </Feedback>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Link className="btn btn-primary btn-block" to="/challenge">
              Pilih level lain
            </Link>
            <Link className="btn btn-block" to="/learn">
              📚 Ulangi materi di Learning Zone
            </Link>
          </div>
        </div>
      </Screen>
    );
  }

  const q = qs[i];
  return (
    <Screen>
      <Head back="/challenge" title={`${lv.emoji} ${lv.name}`} sub={`Soal ${i + 1}/${qs.length}${s.progress[q.id]?.done ? ' · sudah pernah benar' : ''}`} />
      <ProgressBar value={i} max={qs.length} label="Progres sesi" />
      <main className="mt-3">
        <QuestionCard
          key={q.id}
          q={q}
          onAttempt={(a) => {
            if (!a.correct) recordZoneAnswer({ id: q.id, stage: 'challenge', ...a });
          }}
          onDone={async (r) => {
            if (r.solved) {
              const res = await solveChallenge(q, { firstTry: r.firstTry, attemptNo: r.attempts, answer: r.answer, durationMs: 0 });
              setScore((sc) => ({ correct: sc.correct + 1, xp: sc.xp + res.xp, badges: [...sc.badges, ...res.badges] }));
            }
            setI(i + 1);
            window.scrollTo({ top: 0 });
          }}
        />
      </main>
    </Screen>
  );
}
