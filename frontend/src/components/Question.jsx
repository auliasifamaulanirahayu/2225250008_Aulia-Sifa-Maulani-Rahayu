// Satu soal Learning Zone / Challenge Zone per layar: pilihan ganda (mc), isian singkat (short),
// menentukan langkah (step), dan soal cerita + Periksa (story; aturan pedagogis 4).
// Umpan balik salah menjelaskan MENGAPA, maks. 2 kalimat, tanpa menyalahkan, dan tidak memberi jawaban akhir (aturan 5–6).

import { useMemo, useRef, useState } from 'react';
import { pretty } from '../engine/equation.js';
import { Fraction } from '../engine/fraction.js';
import { shuffle } from '../engine/rng.js';
import { parseNumber } from '../screens/problem/stages.jsx';
import { InputPad } from './Keypad.jsx';
import { Feedback } from './ui.jsx';
import { sfx } from '../sound.js';

const hampir = (t) => (/^hampir/i.test(t) ? t : `Hampir! ${t}`);
const label = (o) => (o.eq ? pretty(o.eq) : o.text);
const fmtNum = (s) => String(s).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.').replace(/-/g, '−');

function OptionList({ options, seed, picked, done, onPick, eqStyle }) {
  const order = useMemo(() => shuffle(options, seed), [options, seed]);
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Pilihan jawaban">
      {order.map((o) => {
        const key = label(o);
        const state = picked.has(key) ? (o.correct ? 'good' : 'bad') : '';
        return (
          <button
            key={key}
            type="button"
            disabled={done || state === 'bad'}
            onClick={() => onPick(o)}
            className={`min-h-12 w-full cursor-pointer rounded-xl border px-4 py-2 text-left text-base ${eqStyle ? 'font-mono' : ''} ${
              state === 'good'
                ? 'border-[var(--c-success)] bg-[var(--c-success-soft)] text-ink'
                : state === 'bad'
                  ? 'border-line bg-surface/40 text-muted line-through'
                  : 'border-line bg-surface text-ink hover:border-galaxy-cyan'
            }`}
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {{q:object, onAttempt?:Function, onDone:Function, allowSkip?:boolean}} props
 * onAttempt({correct, answer, attemptNo, durationMs}) dipanggil setiap jawaban dicek.
 * onDone({solved, firstTry, attempts, answer}) dipanggil saat siswa menekan Lanjut / Lewati.
 */
export function QuestionCard({ q, onAttempt, onDone, allowSkip = true }) {
  const [attempts, setAttempts] = useState(0);
  const [fb, setFb] = useState(null);
  const [solved, setSolved] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [stepIdx, setStepIdx] = useState(0);
  const [lines, setLines] = useState(() => (q.type === 'step' ? [q.eq] : []));
  const [phase, setPhase] = useState('answer'); // story: answer → check
  const firstTry = useRef(true);
  const start = useRef(Date.now());
  const lastAnswer = useRef('');

  function attempt(correct, answer) {
    const n = attempts + 1;
    setAttempts(n);
    lastAnswer.current = String(answer);
    if (!correct) firstTry.current = false;
    onAttempt?.({ correct, answer: String(answer), attemptNo: n, durationMs: Date.now() - start.current });
    if (correct) sfx.good();
    else sfx.soft();
    return n;
  }

  function finish(text) {
    setSolved(true);
    setFb({ kind: 'good', text: text || q.explain || 'Benar! Langkahmu tepat.' });
  }

  function wrongNumber(n, firstText) {
    setFb({ kind: 'warn', text: n >= 2 && q.hint ? hampir(q.hint) : hampir(firstText) });
  }

  // ------------------------------------------------ jenis soal
  let body = null;
  if (q.type === 'mc') {
    body = (
      <OptionList
        options={q.options}
        seed={q.id}
        picked={picked}
        done={solved}
        eqStyle={q.options.some((o) => o.eq)}
        onPick={(o) => {
          setPicked((s) => new Set(s).add(label(o)));
          attempt(o.correct, label(o));
          if (o.correct) finish();
          else setFb({ kind: 'warn', text: hampir(o.why) });
        }}
      />
    );
  } else if (q.type === 'short') {
    const key = Fraction.from(q.answer);
    body = !solved && (
      <InputPad
        layout="number"
        okLabel="Cek"
        ariaLabel="Jawaban"
        onSubmit={(v) => {
          const n = parseNumber(v);
          if (n === null) return setFb({ kind: 'warn', text: 'Tulis jawabanmu berupa bilangan.' });
          const ok = n.equals(key);
          const k = attempt(ok, v);
          if (ok) finish();
          else wrongNumber(k, q.eq ? 'Coba periksa lagi langkahmu pada kedua ruas.' : 'Coba baca lagi pertanyaannya dengan teliti.');
        }}
      />
    );
  } else if (q.type === 'step') {
    const st = q.steps[stepIdx];
    body = (
      <>
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {lines.map((l, i) => (
            <li key={i} className="eq-big my-0">
              {pretty(l)}
            </li>
          ))}
        </ol>
        {!solved && (
          <>
            <p className="label">Langkah berikutnya yang benar:</p>
            <OptionList
              key={stepIdx}
              options={st.options}
              seed={`${q.id}-${stepIdx}`}
              picked={picked}
              done={solved}
              eqStyle
              onPick={(o) => {
                attempt(o.correct, o.eq);
                if (!o.correct) {
                  setPicked((s) => new Set(s).add(label(o)));
                  return setFb({ kind: 'warn', text: hampir(o.why) });
                }
                setPicked(new Set());
                setLines((ls) => [...ls, o.eq]);
                if (stepIdx + 1 < q.steps.length) {
                  setStepIdx(stepIdx + 1);
                  setFb({ kind: 'good', text: 'Benar! Kedua ruas tetap seimbang. Lanjut ke langkah berikutnya.' });
                } else finish(`Hebat! x = ${fmtNum(q.answer)}. Setiap langkah dilakukan pada kedua ruas.`);
              }}
            />
          </>
        )}
      </>
    );
  } else if (q.type === 'story') {
    const key = Fraction.from(q.answer);
    const leftKey = Fraction.from(q.check.left_value);
    body = (
      <>
        {phase === 'check' && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="m-0 font-bold">Periksa dengan substitusi</p>
            <p className="m-0 text-sm text-muted">Persamaan cerita ini:</p>
            <div className="eq-big my-1">{pretty(q.eq)}</div>
            <p className="m-0">Ganti x dengan {fmtNum(q.answer)}. Berapa nilai ruas kiri?</p>
          </div>
        )}
        {!solved && (
          <InputPad
            key={phase}
            layout="number"
            okLabel="Cek"
            ariaLabel={phase === 'answer' ? 'Jawaban soal cerita' : 'Nilai ruas kiri'}
            onSubmit={(v) => {
              const n = parseNumber(v);
              if (n === null) return setFb({ kind: 'warn', text: 'Tulis bilangannya saja, tanpa satuan.' });
              if (phase === 'answer') {
                const ok = n.equals(key);
                const k = attempt(ok, v);
                if (ok) {
                  setPhase('check');
                  setFb({ kind: 'good', text: 'Jawabanmu tepat! Sekarang periksa dengan substitusi.' });
                } else wrongNumber(k, 'Misalkan yang ditanya dengan x, lalu susun persamaannya dulu.');
              } else {
                const ok = n.equals(leftKey);
                onAttempt?.({ correct: ok, answer: `periksa:${v}`, attemptNo: attempts + 1, durationMs: Date.now() - start.current });
                if (ok) {
                  sfx.good();
                  finish(`Ruas kiri = ruas kanan = ${fmtNum(q.check.right_value)}. Seimbang! ${q.answer_sentence}`);
                } else {
                  sfx.soft();
                  setFb({ kind: 'warn', text: 'Hampir! Kerjakan perkalian dulu, baru penjumlahan atau pengurangan.' });
                }
              }
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {q.type === 'story' ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          {q.story.map((s) => (
            <p key={s} className="m-0 mb-1">
              {s}
            </p>
          ))}
          <p className="m-0 mt-2 font-bold text-primary">{q.question}</p>
        </div>
      ) : (
        <>
          <p className="m-0 text-lg font-bold">{q.prompt}</p>
          {q.eq && q.type !== 'step' && <div className="eq-big">{pretty(q.eq)}</div>}
        </>
      )}
      {body}
      {fb && <Feedback kind={fb.kind}>{fb.text}</Feedback>}
      <div className="flex flex-col gap-2">
        {solved && (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => onDone({ solved: true, firstTry: firstTry.current, attempts, answer: lastAnswer.current })}
          >
            Lanjut ▸
          </button>
        )}
        {!solved && allowSkip && attempts >= 2 && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onDone({ solved: false, firstTry: false, attempts })}>
            Lewati dulu
          </button>
        )}
      </div>
    </div>
  );
}
