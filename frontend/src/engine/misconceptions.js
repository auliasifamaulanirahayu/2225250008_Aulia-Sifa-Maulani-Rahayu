// Deteksi miskonsepsi PLSV (docs/LEARNING_DESIGN.md §6).
// Caranya: dari persamaan sebelumnya, bangun "langkah salah" yang khas, lalu cek apakah
// persamaan siswa punya penyelesaian yang sama dengan salah satu langkah salah itu.

import { Fraction, ONE, ZERO } from './fraction.js';
import { L, linear, flatten, termLinear, parseEquation, solveEq, sameSolution } from './equation.js';

export const FEEDBACK = {
  M1: 'Hampir! Saat suku pindah ruas, tandanya berubah. Kita mengurangi (atau menambah) bilangan yang sama di kedua ruas.',
  M2: 'Ruas yang satunya juga harus diberi operasi yang sama agar timbangan tetap seimbang.',
  M3: 'Saat membagi, semua suku di ruas itu ikut dibagi, bukan hanya suku x.',
  M4: 'Angka di depan x artinya dikali x. Lawan dari kali adalah bagi, bukan kurang.',
  M5: 'Suku x dan suku angka tidak sejenis, jadi tidak bisa dijumlahkan menjadi satu.',
  M6: 'Angka di depan kurung dikalikan ke SEMUA suku di dalam kurung.',
  M7: 'x mewakili sebuah bilangan (harga, umur, banyak), bukan nama benda atau orangnya.',
  M8: 'Tafsirkan jawabannya ke cerita, lengkap dengan satuannya.',
  GENERAL: 'Langkah ini membuat timbangan tidak seimbang. Cek lagi operasi di kedua ruas.',
};

const linOfSide = (terms) => terms.reduce((acc, t) => L.add(acc, termLinear(t)), L.make(ZERO, ZERO));

function solOf(left, right) {
  const d = L.sub(left, right);
  if (d.a.isZero()) return { kind: d.b.isZero() ? 'all' : 'none' };
  return { kind: 'one', x: d.b.neg().div(d.a) };
}

/** Daftar kandidat langkah salah {code, sol} dari persamaan sebelumnya. */
export function candidates(prevEq) {
  const out = [];
  const sides = [
    [prevEq.left, prevEq.right],
    [prevEq.right, prevEq.left],
  ];
  for (const [S, O] of sides) {
    const terms = flatten(S);
    const sLin = linear(S);
    const oLin = linear(O);
    const put = (code, s, o) => out.push({ code, sol: solOf(s, o), sideFirst: S === prevEq.left, s, o });

    for (const t of terms) {
      const tl = termLinear(t);
      if (tl.a.isZero() && tl.b.isZero()) continue;
      if (terms.length > 1 || !tl.b.isZero()) {
        put('M1', L.sub(sLin, tl), L.add(oLin, tl));
        put('M2', L.sub(sLin, tl), oLin);
      }
      const isVarTerm = !tl.a.isZero() && tl.b.isZero();
      if (isVarTerm && !tl.a.isOne() && !tl.a.equals(ONE.neg())) {
        const bareX = L.make(ONE, ZERO);
        // M4: mengurangkan koefisien alih-alih membagi
        put('M4', L.add(L.sub(sLin, tl), bareX), L.sub(oLin, L.make(ZERO, tl.a)));
        // M3: hanya suku x yang dibagi (ruas lain dibagi)
        if (terms.length > 1) put('M3', L.add(L.sub(sLin, tl), bareX), L.scale(oLin, ONE.div(tl.a)));
      }
      // M6: distributif tidak lengkap, mis. 2(x + 3) -> 2x + 3
      const n = t.node;
      if (n.t === 'mul' && (n.a.t === 'grp' || n.b.t === 'grp')) {
        const [k, g] = n.a.t === 'grp' ? [n.b, n.a] : [n.a, n.b];
        const kl = linear(k);
        if (kl.a.isZero()) {
          const inner = flatten(g.a);
          if (inner.length > 1) {
            const first = L.scale(termLinear(inner[0]), kl.b);
            const rest = linOfSide(inner.slice(1));
            let wrongTerm = L.add(first, rest);
            if (t.sign < 0) wrongTerm = L.neg(wrongTerm);
            put('M6', L.add(L.sub(sLin, tl), wrongTerm), oLin);
          }
        }
      }
    }
    // M5: menggabungkan suku x dan suku angka
    const varT = terms.map(termLinear).find((l) => !l.a.isZero() && l.b.isZero());
    const conT = terms.map(termLinear).find((l) => l.a.isZero() && !l.b.isZero());
    if (varT && conT) {
      const merged = L.make(varT.a.add(conT.b), ZERO);
      put('M5', L.add(L.sub(L.sub(sLin, varT), conT), merged), oLin);
    }
  }
  return out;
}

const ORDER = ['M1', 'M2', 'M4', 'M3', 'M6', 'M5'];

/**
 * @param prevEq persamaan sebelum langkah siswa
 * @param studentEq persamaan yang ditulis siswa (sudah diketahui TIDAK setara)
 * @param problem objek soal (opsional) untuk pola khusus soal
 * @returns {code, feedback}
 */
export function detectMisconception(prevEq, studentEq, problem = null) {
  let stu;
  try {
    stu = solveEq(studentEq);
  } catch {
    return { code: null, feedback: FEEDBACK.GENERAL };
  }
  const correct = solveEq(prevEq);

  // pola khusus dari konten
  for (const m of problem?.misconceptions ?? []) {
    try {
      if (m.wrong_step && sameSolution(solveEq(parseEquation(m.wrong_step)), stu)) {
        return { code: m.code, feedback: m.feedback || FEEDBACK[m.code] };
      }
      if (m.wrong_answer && stu.kind === 'one' && stu.x.equals(Fraction.from(m.wrong_answer))) {
        return { code: m.code, feedback: m.feedback || FEEDBACK[m.code] };
      }
    } catch {
      /* abaikan pola yang tidak valid */
    }
  }

  const cands = candidates(prevEq).filter((c) => !sameSolution(c.sol, correct));
  for (const code of ORDER) {
    if (cands.some((c) => c.code === code && sameSolution(c.sol, stu))) {
      return { code, feedback: FEEDBACK[code] };
    }
  }
  return { code: null, feedback: FEEDBACK.GENERAL };
}
