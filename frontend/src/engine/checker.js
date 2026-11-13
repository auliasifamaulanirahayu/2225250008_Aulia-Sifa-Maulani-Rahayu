// Memeriksa satu baris langkah siswa terhadap persamaan sebelumnya.

import {
  parseEquation,
  linear,
  solveEq,
  sameSolution,
  isSolved,
  formatEq,
  measure,
  ParseError,
  NonLinearError,
} from './equation.js';
import { detectMisconception } from './misconceptions.js';

/**
 * @returns {{status:'invalid'|'wrong'|'same'|'ok'|'solved', eq?, message?, misconception?}}
 *  - invalid : tidak bisa dibaca
 *  - wrong   : tidak setara (timbangan miring)
 *  - same    : setara tetapi tidak ada kemajuan
 *  - ok      : setara dan lebih sederhana / berbeda
 *  - solved  : setara dan sudah berbentuk x = bilangan
 */
export function checkLine(prevEq, input, originalEq, problem = null) {
  let eq;
  try {
    eq = parseEquation(input);
    linear(eq.left);
    linear(eq.right);
  } catch (e) {
    if (e instanceof ParseError || e instanceof NonLinearError) return { status: 'invalid', message: e.message };
    return { status: 'invalid', message: 'Tulisan belum bisa dibaca. Contoh: 3x = 21' };
  }
  if (!sameSolution(solveEq(originalEq), solveEq(eq))) {
    return { status: 'wrong', eq, misconception: detectMisconception(prevEq, eq, problem) };
  }
  if (isSolved(eq)) return { status: 'solved', eq };
  if (formatEq(eq) === formatEq(prevEq)) return { status: 'same', eq };
  return { status: measure(eq) < measure(prevEq) ? 'ok' : 'same', eq };
}

/** Arah miring timbangan untuk persamaan eq bila x diganti nilai sebenarnya: -1 kiri berat, 1 kanan berat. */
export function tiltFor(eq, trueX) {
  try {
    const l = linear(eq.left);
    const r = linear(eq.right);
    const lv = l.a.mul(trueX).add(l.b);
    const rv = r.a.mul(trueX).add(r.b);
    return Math.sign(rv.sub(lv).toNumber());
  } catch {
    return 0;
  }
}
