// Soal Pemanasan prasyarat: operasi bilangan bulat dan PLSV satu langkah (FR-12).

import { rng, randInt, pick } from './rng.js';

const m = (n) => (n < 0 ? `(−${-n})` : String(n));
const s = (n) => (n < 0 ? `−${-n}` : String(n));

const MAKERS = {
  add(r) {
    const a = randInt(r, -12, 12);
    const b = randInt(r, -12, 12);
    return { prompt: `${s(a)} + ${m(b)}`, answer: a + b, hint: 'Bilangan negatif = mundur di garis bilangan.' };
  },
  subNeg(r) {
    const a = randInt(r, -10, 10);
    const b = randInt(r, 1, 9);
    return {
      prompt: `${s(a)} − (−${b})`,
      answer: a + b,
      hint: 'Mengurangi bilangan negatif sama dengan menambah: a − (−b) = a + b.',
    };
  },
  sub(r) {
    const a = randInt(r, -5, 10);
    const b = randInt(r, 2, 15);
    return { prompt: `${s(a)} − ${b}`, answer: a - b, hint: 'Mundur sebanyak bilangan pengurangnya.' };
  },
  mul(r) {
    const a = randInt(r, -9, 9) || 2;
    const b = randInt(r, -9, 9) || -3;
    return {
      prompt: `${s(a)} × ${m(b)}`,
      answer: a * b,
      hint: 'Tanda sama (+ dan +, − dan −) hasilnya positif. Tanda beda hasilnya negatif.',
    };
  },
  div(r) {
    const b = pick(r, [-4, -3, -2, 2, 3, 4, 5]);
    const q = randInt(r, -9, 9) || 3;
    return {
      prompt: `${s(b * q)} : ${m(b)}`,
      answer: q,
      hint: 'Aturan tanda pembagian sama dengan perkalian.',
    };
  },
  eqAdd(r) {
    const x = randInt(r, -6, 12);
    const a = randInt(r, 2, 9);
    return {
      prompt: `x + ${a} = ${s(x + a)}`,
      answer: x,
      ask: 'x = ?',
      hint: `Kurangi kedua ruas dengan ${a}.`,
    };
  },
  eqMul(r) {
    const x = randInt(r, -5, 9) || 4;
    const a = randInt(r, 2, 6);
    return { prompt: `${a}x = ${s(a * x)}`, answer: x, ask: 'x = ?', hint: `Bagi kedua ruas dengan ${a}.` };
  },
};

/**
 * 5 soal cepat. focusSign = true bila siswa sering salah tanda (M1) -> lebih banyak soal tanda.
 */
export function makeWarmup(seed, { focusSign = false } = {}) {
  const r = rng(`warmup-${seed}`);
  const plan = focusSign
    ? ['subNeg', 'add', 'sub', 'subNeg', 'eqAdd']
    : [pick(r, ['add', 'sub']), 'subNeg', pick(r, ['mul', 'div']), 'eqAdd', 'eqMul'];
  return plan.map((k, i) => ({ id: `${seed}-${i}`, kind: k, ...MAKERS[k](r) }));
}
