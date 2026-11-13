// Layar soal: satu tahap per layar (FR-05) — Pahami → Modelkan → Selesaikan → Periksa (→ Tafsirkan) → Jelaskan.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PROBLEMS, worldOf, TYPE_LABEL } from '../../content.js';
import { parseEquation, nextStep, explainStep } from '../../engine/equation.js';
import { Fraction } from '../../engine/fraction.js';
import { recordAttempt, finishProblem, xpForStage } from '../../game.js';
import { Screen, Sheet, EmptyState } from '../../components/ui.jsx';
import { sfx } from '../../sound.js';
import { STAGES } from './stages.jsx';

const STAGE_LABEL = {
  worked: 'Contoh',
  understand: 'Pahami',
  model: 'Modelkan',
  solve: 'Selesaikan',
  check: 'Periksa',
  interpret: 'Tafsirkan',
  explain: 'Jelaskan',
};

export function stagesFor(p) {
  switch (p.type) {
    case 'worked':
      return ['worked', 'explain'];
    case 'translate':
      return ['model', 'solve', 'check', 'explain'];
    case 'story':
      return ['understand', 'model', 'solve', 'check', 'explain'];
    case 'literacy':
      return ['understand', 'model', 'solve', 'check', 'interpret', 'explain'];
    case 'faded':
      return p.story ? ['understand', 'model', 'solve', 'check', 'explain'] : ['solve', 'check', 'explain'];
    default:
      return ['solve', 'check', 'explain'];
  }
}

function hintsFor(name, p, eq) {
  switch (name) {
    case 'understand':
      return [
        'Diketahui = informasi berupa angka yang tertulis di cerita.',
        'Yang ditanya biasanya ada di kalimat yang dimulai dengan "Berapa".',
        'Baca satu kalimat, cari angkanya, lalu ulangi untuk kalimat berikutnya.',
      ];
    case 'model':
      return [p.hints[0], p.hints[1], 'Cek: ganti x dengan bilangan yang masuk akal. Apakah persamaan cocok dengan cerita?'];
    case 'solve': {
      let dyn = 'x sudah sendirian. Ketuk Lanjut.';
      try {
        const s = nextStep(eq);
        if (s) dyn = `Coba ini: ${explainStep(s)}`;
      } catch {
        /* abaikan */
      }
      return ['Tujuan kita: membuat x sendirian di satu ruas.', dyn, p.hints[2]];
    }
    case 'check':
      return [
        'Ganti setiap x dengan jawabanmu, lalu hitung.',
        'Kerjakan perkalian dan pembagian dulu, baru penjumlahan dan pengurangan.',
        'Jika ruas kiri dan kanan hasilnya sama, jawabanmu benar.',
      ];
    case 'interpret':
      return ['Pakai jawaban yang sudah kamu temukan.', 'Bandingkan atau hitung selisih angkanya.', 'Pikirkan artinya di kehidupan nyata.'];
    default:
      return [
        'Ingat langkah yang kamu lakukan di tahap Selesaikan.',
        'Langkah yang benar selalu dilakukan pada KEDUA ruas.',
        'Pindah ruas = mengubah tanda, karena kita menambah atau mengurangi kedua ruas.',
      ];
  }
}

export default function Problem() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const p = PROBLEMS.get(id);
  if (!p) {
    return (
      <Screen>
        <EmptyState title="Soal tidak ditemukan" text="Kembali ke peta untuk memilih soal lain.">
          <Link className="btn" to="/map">
            Ke Peta
          </Link>
        </EmptyState>
      </Screen>
    );
  }
  return <ProblemRunner key={id} p={p} mission={sp.get('m')} />;
}

function ProblemRunner({ p, mission }) {
  const navigate = useNavigate();
  const world = worldOf(p.world);
  const stages = useMemo(() => stagesFor(p), [p]);
  const given = useMemo(() => new Set(p.given_stages || []), [p]);
  const original = useMemo(() => parseEquation(p.equation), [p]);
  const answer = useMemo(() => Fraction.from(p.solve.answer), [p]);
  const run = useRef({ problem: p, hintsUsed: 0, stages: {}, misconceptions: new Set(), startedAt: Date.now() });
  const cur = useRef({ attempts: 0, firstTry: true, start: Date.now() });
  const currentEq = useRef(original);
  const busy = useRef(false);
  const [idx, setIdx] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const name = stages[idx];
  const isGiven = given.has(name);

  useEffect(() => {
    cur.current = { attempts: 0, firstTry: true, start: Date.now() };
    busy.current = false;
    setHintLevel(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idx]);

  async function fail({ answer: ans = '', misconception = null } = {}) {
    cur.current.attempts++;
    cur.current.firstTry = false;
    if (misconception) run.current.misconceptions.add(misconception);
    sfx.soft();
    await recordAttempt({
      problemId: p.id,
      world: p.world,
      stage: name,
      correct: false,
      misconception,
      hintsUsed: run.current.hintsUsed,
      attemptNo: cur.current.attempts,
      durationMs: Date.now() - cur.current.start,
      answer: ans,
    });
  }

  async function complete({ answer: ans = '' } = {}) {
    if (busy.current) return; // cegah ketukan ganda
    busy.current = true;
    const noXp = isGiven || name === 'worked';
    const xp = noXp ? 0 : xpForStage(p.id, name);
    cur.current.attempts++;
    run.current.stages[name] = { firstTry: cur.current.firstTry, attempts: cur.current.attempts, xp, given: noXp };
    if (!noXp) {
      await recordAttempt({
        problemId: p.id,
        world: p.world,
        stage: name,
        correct: true,
        hintsUsed: run.current.hintsUsed,
        attemptNo: cur.current.attempts,
        durationMs: Date.now() - cur.current.start,
        answer: ans,
        xp,
      });
    }
    sfx.good();
    if (idx + 1 >= stages.length) {
      await finishProblem(run.current);
      navigate('/result');
    } else setIdx((i) => i + 1);
  }

  const ctx = {
    p,
    original,
    answer,
    isStory: !!p.understand,
    complete,
    fail,
    currentEq,
    cur,
    hintsUsed: () => run.current.hintsUsed,
  };
  const Stage = STAGES[name];
  const hints = hintsFor(name, p, currentEq.current);
  const openHint = () => {
    if (hintLevel === 0) {
      setHintLevel(1);
      run.current.hintsUsed++;
    }
    setHintOpen(true);
  };

  return (
    <Screen className="problem">
      <header className="problem-head" style={{ '--world': world.color }}>
        <Link className="icon-btn" to={mission ? '/home' : `/world/${p.world}`} aria-label="Kembali">
          ←
        </Link>
        <div className="ph-title">
          <small>{mission === 'main' ? 'Misi Utama' : mission === 'team' ? 'Tantangan Tim' : world.title}</small>
          <strong>{TYPE_LABEL[p.type]}</strong>
        </div>
        {name !== 'worked' && !isGiven ? (
          <button type="button" className="icon-btn hint-btn" aria-label="Petunjuk" onClick={openHint}>
            💡
          </button>
        ) : (
          <span className="icon-btn" aria-hidden="true" />
        )}
      </header>
      <ol className="stage-dots" aria-label="Tahap soal">
        {stages.map((s, i) => (
          <li key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''} aria-current={i === idx ? 'step' : undefined}>
            <span className="dot">{i < idx ? '✓' : i + 1}</span>
            <span className="dot-label">{STAGE_LABEL[s]}</span>
          </li>
        ))}
      </ol>
      <main className="stage-body">
        <Stage key={idx} ctx={ctx} isGiven={isGiven} />
      </main>
      {hintOpen && (
        <Sheet title="💡 Petunjuk" onClose={() => setHintOpen(false)}>
          <div className="hint-list">
            {hints.slice(0, hintLevel).map((t, i) => (
              <div className="hint" key={i}>
                <strong>Petunjuk {i + 1}</strong>
                <p>{t}</p>
              </div>
            ))}
            {hintLevel < hints.length ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setHintLevel((l) => l + 1);
                  run.current.hintsUsed++;
                }}
              >
                Petunjuk berikutnya ({hintLevel + 1}/3)
              </button>
            ) : (
              <p className="muted">Itu petunjuk terakhir. Kamu pasti bisa!</p>
            )}
          </div>
        </Sheet>
      )}
    </Screen>
  );
}
