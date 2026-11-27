// Komponen tiap tahap soal: Contoh, Pahami, Modelkan, Selesaikan, Periksa, Tafsirkan, Jelaskan.

import { useEffect, useMemo, useState } from 'react';
import {
  parseExpr,
  linear,
  formatEq,
  format,
  applyOp,
  explainStep,
  isSolved,
  evaluate,
  measure,
  hasGroup,
  parseStep,
  pretty,
} from '../../engine/equation.js';
import { formatNumber } from '../../engine/fraction.js';
import { checkLine, tiltFor } from '../../engine/checker.js';
import { FEEDBACK } from '../../engine/misconceptions.js';
import { shuffle } from '../../engine/rng.js';
import { BalanceScale } from '../../components/BalanceScale.jsx';
import { InputPad } from '../../components/Keypad.jsx';
import { Feedback, Speech, Choices } from '../../components/ui.jsx';
import { recordAttempt } from '../../game.js';
import { speak, canSpeak } from '../../sound.js';

/** Isian angka siswa ("7.000", "−2", "11/3") -> Fraction, atau null. */
export function parseNumber(str) {
  try {
    const l = linear(parseExpr(str));
    return l.a.isZero() ? l.b : null;
  } catch {
    return null;
  }
}

const Actions = ({ children }) => <div className="actions">{children}</div>;
const Primary = ({ children, onClick, disabled }) => (
  <button type="button" className="btn btn-primary btn-block" onClick={onClick} disabled={disabled}>
    {children}
  </button>
);

// ---------------------------------------------------------------- cerita
export function DataTable({ table }) {
  if (!table) return null;
  return (
    <figure className="data-table">
      {table.title && <figcaption>{table.title}</figcaption>}
      <table>
        <thead>
          <tr>
            {table.headers.map((x) => (
              <th scope="col" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function StoryCard({ p, revealAll = false, onAllRevealed }) {
  const lines = p.story || [];
  const [shown, setShown] = useState(revealAll ? lines.length : 1);
  const done = shown >= lines.length;
  useEffect(() => {
    if (done) onAllRevealed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <section className="story-card">
      <div className="story-top">
        <span className="story-emoji" aria-hidden="true">
          {p.emoji || '📘'}
        </span>
        {canSpeak() && (
          <button
            type="button"
            className="icon-btn speak-btn"
            aria-label="Bacakan cerita"
            onClick={() => speak([...lines.slice(0, shown), done ? p.question : ''].join(' '))}
          >
            🔊
          </button>
        )}
      </div>
      <div className="story-lines">
        {lines.slice(0, shown).map((l, i) => (
          <p key={i} className={`story-line ${i === shown - 1 && !revealAll ? 'fresh' : ''}`}>
            {l}
          </p>
        ))}
        {done && <DataTable table={p.table} />}
        {done && p.question && <p className="story-question">{p.question}</p>}
      </div>
      {!done && (
        <button type="button" className="btn btn-ghost" onClick={() => setShown((s) => s + 1)}>
          Lanjut baca ▸
        </button>
      )}
    </section>
  );
}

export function MiniStory({ p, open = false }) {
  return (
    <details className="story-mini" open={open}>
      <summary>{p.emoji || '📖'} Lihat cerita</summary>
      {(p.story || []).map((l, i) => (
        <p key={i}>{l}</p>
      ))}
      <DataTable table={p.table} />
      {p.question && <p className="story-question">{p.question}</p>}
    </details>
  );
}

const EqLines = ({ lines }) => (
  <ol className="eq-lines" aria-live="polite">
    {lines.map((l, i) => (
      <li key={i} className={l.kind}>
        {l.kind === 'given' && <small className="tag">Contoh langkah</small>}
        {l.note && <small className="eq-note">{l.note}</small>}
        {l.shown && <div className="eq-shown">{formatEq(l.shown)}</div>}
        <div className="eq-main">{formatEq(l.eq)}</div>
      </li>
    ))}
  </ol>
);

// ---------------------------------------------------------------- Contoh lengkap (worked example, FR-07)
export function WorkedStage({ ctx }) {
  const { p, original, answer, isStory, complete } = ctx;
  const steps = useMemo(() => p.solve.steps.map(parseStep), [p]);
  const [shown, setShown] = useState(0);
  const lines = [{ eq: original, kind: 'start' }];
  let eq = original;
  for (const st of steps.slice(0, shown)) {
    const r = applyOp(eq, st.op, st.value);
    lines.push({ eq: st.result, shown: r.shown, note: explainStep(st), kind: 'step' });
    eq = st.result;
  }
  const finished = shown >= steps.length;
  return (
    <>
      {isStory ? (
        <>
          <StoryCard p={p} revealAll />
          <div className="card worked-model">
            <p>
              <strong>Diketahui: </strong>
              {p.understand.known_options.filter((o) => o.correct).map((o) => o.text).join('; ')}
            </p>
            <p>
              <strong>Ditanya: </strong>
              {p.understand.asked_options.find((o) => o.correct).text}
            </p>
            <p>
              <strong>Misalkan: </strong>x = {p.model.variable.meaning}
            </p>
            <p>
              <strong>Model: </strong>
              {pretty(p.model.equation)}
            </p>
          </div>
        </>
      ) : (
        <Speech>Perhatikan contoh ini langkah demi langkah. Setiap langkah dilakukan pada kedua ruas.</Speech>
      )}
      <h3>Langkah penyelesaian</h3>
      {p.ui?.balance && <BalanceScale eq={eq} />}
      <EqLines lines={lines} />
      {finished && (
        <>
          <Feedback kind="good">Periksa: {formatEq(original, { subst: answer })} ✔ Seimbang!</Feedback>
          {isStory && <p className="answer-sentence">{p.check.answer_sentence}</p>}
        </>
      )}
      <Actions>
        <Primary onClick={() => (finished ? complete() : setShown((s) => s + 1))}>
          {finished ? 'Paham, lanjut ▸' : 'Langkah berikutnya ▸'}
        </Primary>
      </Actions>
    </>
  );
}

// ---------------------------------------------------------------- Pahami
export function UnderstandStage({ ctx, isGiven }) {
  const { p, complete, fail } = ctx;
  const known = useMemo(() => shuffle(p.understand.known_options.map((o) => o.text), `${p.id}-k`), [p]);
  const asked = useMemo(() => shuffle(p.understand.asked_options.map((o) => o.text), `${p.id}-a`), [p]);
  const correctK = useMemo(() => new Set(p.understand.known_options.filter((o) => o.correct).map((o) => o.text)), [p]);
  const correctA = p.understand.asked_options.find((o) => o.correct).text;
  const [ready, setReady] = useState(isGiven);
  const [selK, setSelK] = useState(() => new Set(isGiven ? correctK : []));
  const [selA, setSelA] = useState(isGiven ? correctA : null);
  const [fb, setFb] = useState(null);

  const check = () => {
    if (isGiven) return complete();
    const wrong = [...selK].filter((t) => !correctK.has(t));
    const missed = [...correctK].filter((t) => !selK.has(t));
    if (!wrong.length && !missed.length && selA === correctA) return complete({ answer: [...selK].join(' | ') });
    let msg;
    if (wrong.length) msg = `"${wrong[0]}" tidak tertulis di cerita. Baca lagi kalimatnya.`;
    else if (missed.length) msg = `Masih ada ${missed.length} informasi yang belum kamu pilih.`;
    else if (!selA) msg = 'Pilih juga apa yang ditanyakan.';
    else msg = 'Yang ditanya ada di kalimat "Berapa …". Coba cari lagi.';
    setFb(msg);
    fail({ answer: `${[...selK].join(' | ')} / ${selA}` });
  };

  return (
    <>
      {isGiven && <Feedback kind="info">Contoh: bagian ini sudah diisi. Pelajari, lalu ketuk Lanjut.</Feedback>}
      <StoryCard p={p} revealAll={isGiven} onAllRevealed={() => setReady(true)} />
      {ready && (
        <div className="understand-q">
          <h3>Ketuk yang DIKETAHUI</h3>
          <p className="muted">Bisa lebih dari satu.</p>
          <Choices options={known} multi value={selK} onChange={(v) => (setSelK(v), setFb(null))} disabled={isGiven} />
          <h3>Apa yang DITANYA?</h3>
          <Choices options={asked} value={selA} onChange={(v) => (setSelA(v), setFb(null))} disabled={isGiven} />
          {fb && <Feedback kind="warn">{fb}</Feedback>}
          <Actions>
            <Primary onClick={check}>{isGiven ? 'Lanjut' : 'Cek'}</Primary>
          </Actions>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Modelkan
const QUANTITY = /harga|umur|banyak|jarak|lama|keliling|lebar|tinggi|iuran|kursi|kemenangan|jam|minggu|gb|kg/i;

export function ModelStage({ ctx, isGiven }) {
  const { p, complete, fail } = ctx;
  const m = p.model;
  const varOpts = useMemo(() => (m.variable ? shuffle(m.variable_options, `${p.id}-v`) : []), [p]);
  const eqOpts = useMemo(() => shuffle(m.equation_options, `${p.id}-e`), [p]);
  const [selVar, setSelVar] = useState(isGiven ? m.variable?.meaning : null);
  const [selEq, setSelEq] = useState(isGiven ? m.equation : null);
  const [fb, setFb] = useState(null);

  const check = () => {
    if (isGiven) return complete();
    if (m.variable && selVar !== m.variable.meaning) {
      if (!selVar) return setFb('Pilih dulu arti x.');
      const isThing = !QUANTITY.test(selVar);
      setFb(isThing ? FEEDBACK.M7 : `x sebaiknya hal yang DITANYA: "${p.question}"`);
      return fail({ answer: selVar, misconception: isThing ? 'M7' : null });
    }
    if (selEq !== m.equation) {
      if (!selEq) return setFb('Pilih persamaannya.');
      setFb('Persamaan ini belum cocok. Cocokkan setiap angka dan tanda dengan kalimatnya.');
      return fail({ answer: selEq });
    }
    complete({ answer: `${selVar ?? ''} / ${selEq}` });
  };

  return (
    <>
      {p.type === 'translate' ? (
        <section className="story-card translate">
          <p className="story-line">{p.story[0]}</p>
        </section>
      ) : (
        <>
          {isGiven && <Feedback kind="info">Contoh: perhatikan cara memisalkan x dan menyusun persamaan.</Feedback>}
          <MiniStory p={p} />
          {!isGiven && p.understand && (
            <div className="context-chips">
              {p.understand.known_options
                .filter((o) => o.correct)
                .map((o) => (
                  <span className="chip" key={o.text}>
                    {o.text}
                  </span>
                ))}
            </div>
          )}
        </>
      )}
      {m.variable && (
        <>
          <h3>Misalkan x adalah …</h3>
          <Choices options={varOpts} value={selVar} onChange={(v) => (setSelVar(v), setFb(null))} disabled={isGiven} />
        </>
      )}
      <h3>{p.type === 'translate' ? 'Pilih bentuk matematikanya' : 'Pilih persamaan yang cocok'}</h3>
      <Choices options={eqOpts} value={selEq} onChange={(v) => (setSelEq(v), setFb(null))} label={pretty} className="eq-choices" disabled={isGiven} />
      {fb && <Feedback kind="warn">{fb}</Feedback>}
      <Actions>
        <Primary onClick={check}>{isGiven ? 'Lanjut' : 'Cek'}</Primary>
      </Actions>
    </>
  );
}

// ---------------------------------------------------------------- Selesaikan
const OPS = [
  ['add', '+ Tambah', 'ditambah'],
  ['sub', '− Kurangi', 'dikurangi'],
  ['mul', '× Kali', 'dikali'],
  ['div', ': Bagi', 'dibagi'],
];

export function SolveStage({ ctx, isGiven }) {
  const { p, original, answer, isStory, complete, fail, currentEq, cur, hintsUsed } = ctx;
  const init = useMemo(() => {
    let e = original;
    const ls = [{ eq: e, kind: 'start' }];
    // isGiven: tahap ini contoh (mis. Mission 03–04 fokus memahami & memodelkan), semua langkah sudah diisi.
    const givenN = isGiven ? p.solve.steps.length : p.type === 'faded' && !isStory ? p.given_steps || 0 : 0;
    for (const raw of p.solve.steps.slice(0, givenN)) {
      const st = parseStep(raw);
      const r = applyOp(e, st.op, st.value);
      ls.push({ eq: st.result, shown: r.shown, note: explainStep(st), kind: 'given' });
      e = st.result;
    }
    return { eq: e, lines: ls };
  }, [p, original, isStory]);
  const balanceOnly = !!p.ui?.op_only || p.type === 'balance';
  const [eq, setEq] = useState(init.eq);
  const [lines, setLines] = useState(init.lines);
  const [undo, setUndo] = useState([]);
  const [mode, setMode] = useState(balanceOnly ? 'op' : 'write');
  const [wrongEq, setWrongEq] = useState(null);
  const [fb, setFb] = useState(null);
  const [op, setOp] = useState(null);
  const [solved, setSolved] = useState(() => isSolved(init.eq));

  useEffect(() => {
    currentEq.current = eq;
  }, [eq, currentEq]);

  function push(newEq, extra = {}) {
    setUndo((u) => [...u, { eq, len: lines.length }]);
    setLines((ls) => [...ls, { eq: newEq, kind: 'step', ...extra }]);
    setEq(newEq);
    currentEq.current = newEq;
    if (isSolved(newEq)) {
      setSolved(true);
      setWrongEq(null);
      setFb({ kind: 'good', text: `Hebat! ${formatEq(newEq)}. Sekarang kita periksa jawabannya.` });
      return true;
    }
    return false;
  }

  function applyChosen(opName, value, raw = '') {
    let r;
    try {
      r = applyOp(eq, opName, value);
    } catch (err) {
      return setFb({ kind: 'warn', text: err.message });
    }
    const before = measure(eq);
    setOp(null);
    if (push(r.result, { shown: r.shown, note: explainStep({ op: opName, value }) })) return;
    if (measure(r.result) >= before) {
      cur.current.firstTry = false;
      cur.current.attempts++;
      setFb({ kind: 'info', text: 'Timbangan tetap seimbang, tapi x belum lebih sendirian. Coba operasi lain atau ketuk Batal langkah.' });
      recordAttempt({ problemId: p.id, world: p.world, stage: 'solve', correct: false, hintsUsed: hintsUsed(), attemptNo: cur.current.attempts, durationMs: Date.now() - cur.current.start, answer: `${opName} ${raw}` });
    } else setFb({ kind: 'good', text: 'Seimbang! Lanjutkan.' });
  }

  function onWrite(v, clear) {
    const r = checkLine(eq, v, original, p);
    if (r.status === 'invalid') return setFb({ kind: 'warn', text: r.message });
    if (r.status === 'wrong') {
      setWrongEq(r.eq);
      setFb({ kind: 'warn', text: r.misconception.feedback });
      return fail({ answer: v, misconception: r.misconception.code });
    }
    setWrongEq(null);
    if (r.status === 'same') return setFb({ kind: 'info', text: 'Benar, tapi belum lebih sederhana. Coba langkah berikutnya.' });
    clear();
    if (!push(r.eq)) setFb({ kind: 'good', text: 'Benar! Kedua ruas tetap seimbang.' });
  }

  function undoLast() {
    const u = undo.at(-1);
    if (!u) return;
    setUndo((xs) => xs.slice(0, -1));
    setLines((ls) => ls.slice(0, u.len));
    setEq(u.eq);
    currentEq.current = u.eq;
    setFb(null);
  }

  const opInfo = OPS.find((o) => o[0] === op);
  const showGroupOp = hasGroup(eq.left) || hasGroup(eq.right);

  return (
    <>
      {isStory && <MiniStory p={p} />}
      <div className="solve-tools">
        <h3>Buat x sendirian</h3>
        {!balanceOnly && !solved && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setMode((m) => (m === 'op' ? 'write' : 'op'));
              setWrongEq(null);
              setOp(null);
            }}
          >
            {mode === 'op' ? '✏️ Tulis sendiri' : '⚖️ Pakai timbangan'}
          </button>
        )}
      </div>
      {isGiven && <Feedback kind="info">Contoh: langkah penyelesaian sudah diisi. Pelajari, lalu lanjut ke Periksa.</Feedback>}
      <EqLines lines={lines} />
      {wrongEq ? (
        <BalanceScale eq={wrongEq} tilt={tiltFor(wrongEq, answer) || -1} />
      ) : (
        (mode === 'op' || solved) && <BalanceScale eq={eq} />
      )}
      {fb && <Feedback kind={fb.kind}>{fb.text}</Feedback>}
      {solved ? (
        <Actions>
          <Primary onClick={() => complete({ answer: formatEq(eq) })}>Lanjut ke Periksa ▸</Primary>
        </Actions>
      ) : mode === 'op' ? (
        <div className="solve-controls">
          <p className="muted">Pilih operasi. Operasi selalu dilakukan pada KEDUA ruas.</p>
          <div className="op-row">
            {OPS.map(([key, label]) => (
              <button key={key} type="button" className={`op-btn ${op === key ? 'on' : ''}`} onClick={() => setOp(key)}>
                {label}
              </button>
            ))}
            {showGroupOp && (
              <button type="button" className="op-btn" onClick={() => applyChosen('expand', null)}>
                ( ) Jabarkan
              </button>
            )}
          </div>
          {opInfo && (
            <>
              <p className="op-prompt">Kedua ruas {opInfo[2]} …</p>
              <InputPad
                key={op}
                layout={p.ui?.term_keypad ? 'term' : 'number'}
                placeholder={p.ui?.term_keypad ? 'bilangan atau suku x, mis. 2x' : 'bilangan'}
                okLabel="Terapkan"
                ariaLabel={`Kedua ruas ${opInfo[2]}`}
                onSubmit={(v) => {
                  if (!v.trim()) return setFb({ kind: 'warn', text: 'Isi dulu bilangannya.' });
                  let value;
                  try {
                    value = parseExpr(v);
                  } catch (err) {
                    return setFb({ kind: 'warn', text: err.message });
                  }
                  applyChosen(op, value, v);
                }}
              />
            </>
          )}
          {undo.length > 0 && (
            <button type="button" className="btn btn-ghost btn-small" onClick={undoLast}>
              ↶ Batal langkah
            </button>
          )}
        </div>
      ) : (
        <div className="solve-controls">
          <p className="muted">Tulis persamaan baru setelah satu langkah.</p>
          <InputPad layout="full" placeholder="Tulis langkah berikutnya, mis. 3x = 21" okLabel="Cek" ariaLabel="Langkah berikutnya" onSubmit={onWrite} />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Periksa (substitusi)
export function CheckStage({ ctx }) {
  const { p, original, answer, isStory, complete, fail } = ctx;
  const sides = [
    ['kiri', original.left],
    ['kanan', original.right],
  ];
  const values = useMemo(() => sides.map(([, s]) => evaluate(s, answer)), [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const toAsk = useMemo(() => [0, 1].filter((i) => !linear(sides[i][1]).a.isZero()), [p]); // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState(0);
  const [fb, setFb] = useState(null);
  const [sense, setSense] = useState(null);
  const [typed, setTyped] = useState('');
  const balanced = step >= toAsk.length;
  const unit = p.check?.unit;
  const [before, after = ''] = (p.check?.answer_template || '').split('{jawaban}');

  return (
    <>
      <Speech mood="think">Periksa dengan substitusi: ganti x dengan {formatNumber(answer)} pada persamaan awal.</Speech>
      <div className="eq-big">{formatEq(original)}</div>
      {!balanced ? (
        <>
          <p>Ruas {sides[toAsk[step]][0]}:</p>
          <div className="eq-big subst">{format(sides[toAsk[step]][1], { subst: answer })} = ?</div>
          <InputPad
            key={step}
            layout="number"
            okLabel="Cek"
            ariaLabel={`Hasil ruas ${sides[toAsk[step]][0]}`}
            onSubmit={(v) => {
              const n = parseNumber(v);
              if (n === null) return setFb('Tulis hasilnya berupa bilangan.');
              if (!n.equals(values[toAsk[step]])) {
                setFb('Hitung lagi. Kerjakan perkalian dulu, baru penjumlahan atau pengurangan.');
                return fail({ answer: v });
              }
              setFb(null);
              setStep((s) => s + 1);
            }}
          />
        </>
      ) : (
        <>
          <Feedback kind="good">
            Ruas kiri = {formatNumber(values[0])}, ruas kanan = {formatNumber(values[1])}. Seimbang! Jawabanmu benar.
          </Feedback>
          <BalanceScale eq={original} caption={false} />
          {!isStory ? (
            <Actions>
              <Primary onClick={() => complete({ answer: formatNumber(answer) })}>Lanjut ▸</Primary>
            </Actions>
          ) : (
            <>
              <h3>Masuk akal?</h3>
              <p>{p.check.sense_question}</p>
              <Choices options={['Ya', 'Tidak']} value={sense} onChange={setSense} />
              {sense === 'Ya' && <Feedback kind="good">Tepat! Selalu tanyakan: apakah jawabanku masuk akal?</Feedback>}
              {sense === 'Tidak' && (
                <Feedback kind="info">Jawabannya sudah seimbang dan sesuai cerita, jadi masuk akal. Biasakan selalu mengecek kewajaran jawaban.</Feedback>
              )}
              {sense && (
                <>
                  <h3>Tulis jawabanmu</h3>
                  <p className="answer-sentence">
                    {before}
                    {unit === 'rp' ? 'Rp' : ''}
                    <span className="blank">{typed || '…'}</span>
                    {unit === 'rp' ? '' : ` ${unit}`}
                    {after}
                  </p>
                  <InputPad
                    layout="number"
                    okLabel="Selesai"
                    ariaLabel="Jawaban akhir"
                    onChange={setTyped}
                    onSubmit={(v) => {
                      const n = parseNumber(v);
                      if (n === null || !n.equals(answer)) {
                        setFb(n === null ? 'Isi bilangannya dulu.' : 'Lihat lagi nilai x yang kamu temukan.');
                        return fail({ answer: v, misconception: n === null ? 'M8' : null });
                      }
                      complete({ answer: v });
                    }}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
      {fb && <Feedback kind="warn">{fb}</Feedback>}
    </>
  );
}

// ---------------------------------------------------------------- Tafsirkan (literasi)
export function InterpretStage({ ctx }) {
  const { p, complete, fail } = ctx;
  const it = p.interpret;
  const opts = useMemo(() => shuffle(it.options, `${p.id}-i`), [p, it]);
  const [sel, setSel] = useState(null);
  const [fb, setFb] = useState(null);
  return (
    <>
      <MiniStory p={p} open />
      <p className="answer-sentence">{p.check.answer_sentence}</p>
      <h3>Tafsirkan</h3>
      <p>{it.question}</p>
      <Choices options={opts} value={sel} onChange={setSel} />
      {fb && <Feedback kind="warn">{fb}</Feedback>}
      <Actions>
        <Primary
          onClick={() => {
            if (!sel) return setFb('Pilih satu jawaban.');
            if (sel === it.options[it.answer]) return complete({ answer: sel });
            setFb('Belum tepat. Hitung lagi memakai jawabanmu dan data di cerita.');
            fail({ answer: sel });
          }}
        >
          Cek
        </Primary>
      </Actions>
    </>
  );
}

// ---------------------------------------------------------------- Jelaskan ke temanmu (FR-11)
export function ExplainStage({ ctx }) {
  const { p, complete, fail } = ctx;
  const opts = useMemo(() => shuffle(p.explain_options, `${p.id}-x`), [p]);
  const correct = useMemo(() => new Set(opts.filter((o) => o.correct).map((o) => o.text)), [opts]);
  const [sel, setSel] = useState(() => new Set());
  const [fb, setFb] = useState(null);
  const path = [pretty(p.equation), ...p.solve.steps.map((s) => pretty(s.result))].join('  →  ');

  const check = () => {
    const wrong = [...sel].filter((t) => !correct.has(t));
    const missed = [...correct].filter((t) => !sel.has(t));
    if (!wrong.length && !missed.length) return complete({ answer: [...sel].join(' | ') });
    let msg;
    let code = null;
    if (wrong.length) {
      msg = `"${wrong[0]}" belum tepat.`;
      if (/tanpa berubah tanda/.test(wrong[0])) {
        msg += ` ${FEEDBACK.M1}`;
        code = 'M1';
      } else if (/Hanya satu ruas/.test(wrong[0])) msg += ` ${FEEDBACK.M2}`;
      else if (/dikurangi/.test(wrong[0])) msg += ` ${FEEDBACK.M4}`;
    } else msg = 'Masih ada kalimat benar yang belum kamu pilih.';
    setFb(msg);
    fail({ answer: [...sel].join(' | '), misconception: code });
  };

  return (
    <>
      <Speech>Jelaskan ke temanmu! Pilih SEMUA kalimat yang benar tentang cara menyelesaikan soal ini.</Speech>
      <div className="card path">{path}</div>
      <Choices options={opts.map((o) => o.text)} multi value={sel} onChange={(v) => (setSel(v), setFb(null))} />
      {fb && <Feedback kind="warn">{fb}</Feedback>}
      <Actions>
        <Primary onClick={check}>Cek</Primary>
      </Actions>
    </>
  );
}

export const STAGES = {
  worked: WorkedStage,
  understand: UnderstandStage,
  model: ModelStage,
  solve: SolveStage,
  check: CheckStage,
  interpret: InterpretStage,
  explain: ExplainStage,
};
