// Percakapan AI Math Tutor "Kak Orbit". Dipakai di #/tutor (umum) dan di layar soal (lembar bawah).
// Aturan: satu petunjuk dalam satu waktu; pembahasan lengkap hanya setelah siswa mencoba DAN memintanya
// (CLAUDE.md aturan 6) — di Misi Utama hal itu membuat soal selesai tanpa bintang/XP penuh (onFullSolution).

import { useEffect, useRef, useState } from 'react';
import { askTutor, aiStatus } from '../lib/tutor.js';
import { fallbackReply, leaksAnswer, FALLBACK_REASON } from '../engine/tutorFallback.js';
import { pretty } from '../engine/equation.js';
import { Mascot, ConfirmButton } from './ui.jsx';

const CHIPS_PROBLEM = ['Aku bingung memahami soal', 'Bagaimana membuat persamaannya?', 'Langkah berikutnya apa?', 'Aku bingung soal tanda'];
const CHIPS_GENERAL = ['Apa itu PLSV?', 'Aku bingung soal cerita', 'Kenapa tandanya berubah?', 'Bagaimana memeriksa jawaban?'];

/** Teks soal untuk konteks tutor (tanpa kunci jawaban). */
export function problemText(p) {
  if (p.story?.length) return [...p.story, p.question].filter(Boolean).join(' ');
  return `Selesaikan persamaan: ${pretty(p.equation)}`;
}

function Bubble({ m }) {
  const me = m.role === 'student';
  return (
    <li className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[0.95rem] whitespace-pre-line ${
          me ? 'rounded-br-sm bg-btn text-white' : 'rounded-bl-sm border border-line bg-surface text-ink'
        }`}
      >
        {m.content}
        {m.source === 'fallback' && <small className="mt-1 block text-xs text-muted">Tutor bawaan</small>}
      </div>
    </li>
  );
}

/**
 * @param {{problem?:object, stage?:string, hints?:string[], attempted?:boolean, onFullSolution?:Function}} props
 */
export function TutorChat({ problem = null, stage = '', hints = [], attempted = false, onFullSolution }) {
  const mission = problem?.world || 1;
  const greeting = problem
    ? 'Hai! Aku Kak Orbit. Bagian mana dari soal ini yang membuatmu bingung?'
    : 'Hai! Aku Kak Orbit, tutor PLSV-mu. Ceritakan apa yang membuatmu bingung.';
  const [msgs, setMsgs] = useState([{ role: 'tutor', content: greeting, intro: true }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [fullUsed, setFullUsed] = useState(false);
  const session = useRef(null);
  const turn = useRef(0);
  const listEnd = useRef(null);
  const status = aiStatus();

  useEffect(() => {
    listEnd.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [msgs, busy]);

  async function send(message, mode = 'guide') {
    const msg = message.trim();
    if (!msg || busy) return;
    const history = msgs.filter((m) => !m.intro).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((xs) => [...xs, { role: 'student', content: msg }]);
    setText('');
    setBusy(true);
    const r = await askTutor({
      sessionId: session.current,
      message: msg,
      history,
      problem: problem ? { id: problem.id, text: problemText(problem), stage } : null,
      attempted,
      mode,
      mission,
    });
    if (r.session_id) session.current = r.session_id;
    let reply = r.reply;
    let source = 'ai';
    if (r.fallback || !reply) {
      const fb = fallbackReply({ message: msg, problem, hints, turn: turn.current, mode, attempted, mission });
      turn.current = fb.turn;
      reply = fb.text;
      source = 'fallback';
      // alasan sudah tampil di kepala percakapan bila AI memang tidak aktif; catatan hanya bila AI gagal di tengah jalan
      setNote(r.reason === status ? null : FALLBACK_REASON[r.reason] || FALLBACK_REASON.error);
    } else if (mode === 'guide' && problem && leaksAnswer(reply, problem.solve.answer)) {
      // pengaman: mode bimbingan tidak boleh menyebut jawaban akhir
      const fb = fallbackReply({ message: 'langkah berikutnya', problem, hints, turn: turn.current, mission });
      turn.current = fb.turn;
      reply = fb.text;
      source = 'fallback';
      setNote('Tutor hampir menyebut jawaban akhir, jadi diganti dengan petunjuk. Coba dulu, ya!');
    } else {
      setNote(null);
    }
    setMsgs((xs) => [...xs, { role: 'tutor', content: reply, source }]);
    setBusy(false);
  }

  const canFull = problem && problem.type !== 'worked' && attempted && !fullUsed;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Mascot size={36} />
        <span>
          {status === 'ready' ? 'Kak Orbit (AI) membimbing satu langkah demi satu langkah.' : FALLBACK_REASON[status]}
        </span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
        {msgs.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}
        {busy && (
          <li className="text-sm text-muted" aria-label="Tutor sedang mengetik">
            Kak Orbit sedang berpikir…
          </li>
        )}
        <li ref={listEnd} aria-hidden="true" />
      </ol>

      {note && <p className="m-0 rounded-xl bg-info-soft px-3 py-2 text-sm">{note}</p>}

      <div className="flex flex-wrap gap-2">
        {(problem ? CHIPS_PROBLEM : CHIPS_GENERAL).map((c) => (
          <button
            key={c}
            type="button"
            disabled={busy}
            onClick={() => send(c)}
            className="min-h-10 cursor-pointer rounded-full border border-line bg-surface-2 px-3 text-sm text-ink"
          >
            {c}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="tutor-input" className="sr-only">
          Pesan untuk tutor
        </label>
        <input
          id="tutor-input"
          className="input min-w-0 flex-1"
          maxLength={600}
          autoComplete="off"
          placeholder="Tulis pertanyaanmu…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          Kirim
        </button>
      </form>

      {canFull && (
        <ConfirmButton
          label="📖 Minta pembahasan lengkap"
          confirmLabel="Yakin? Soal ini tetap selesai, tapi tanpa bintang penuh."
          className="btn btn-ghost btn-block"
          onConfirm={() => {
            setFullUsed(true);
            onFullSolution?.();
            send('Aku sudah mencoba. Tolong beri pembahasan lengkap.', 'full');
          }}
        />
      )}

      <p className="m-0 text-xs text-muted">
        {status === 'ready'
          ? 'Jangan tulis nama lengkap, alamat, atau nomor HP. Pesanmu dikirim ke layanan AI Google dan bisa dibaca gurumu.'
          : 'Tutor bawaan bekerja tanpa internet dan tidak mengirim pesanmu ke mana pun.'}
      </p>
    </div>
  );
}
