import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { frac, formatNumber } from '../src/engine/fraction.js';
import {
  parseEquation,
  parseExpr,
  linear,
  solveEq,
  formatEq,
  applyOp,
  nextStep,
  isSolved,
  equivalent,
  parseStep,
  pretty,
  evaluate,
} from '../src/engine/equation.js';
import { checkLine, tiltFor } from '../src/engine/checker.js';
import { detectMisconception } from '../src/engine/misconceptions.js';
import { starsFor, levelFromXp, levelInfo, updateStreak, visibleStreak, dayDiff } from '../src/engine/xp.js';
import { pickDaily, unlockedWorlds, missionComplete } from '../src/engine/mission-picker.js';
import { makeWarmup } from '../src/engine/warmup.js';
import { newBadges } from '../src/engine/badges.js';

const contentDir = resolve(__dirname, '../../content/worlds');
const WORLDS = readdirSync(contentDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(contentDir, f), 'utf8')))
  .sort((a, b) => a.world - b.world);
const ALL = WORLDS.flatMap((w) => w.problems);

describe('fraction', () => {
  it('aritmetika tepat', () => {
    expect(frac(1, 3).add(frac(1, 6)).toString()).toBe('1/2');
    expect(frac(2, -4).toString()).toBe('-1/2');
    expect(frac(0, -5).n).toBe(0);
  });
  it('format Indonesia', () => {
    expect(formatNumber(frac(25000))).toBe('25.000');
    expect(formatNumber(frac(-3))).toBe('−3');
    expect(formatNumber(frac(11, 3))).toBe('11/3');
    expect(formatNumber(frac(1200000))).toBe('1.200.000');
  });
});

describe('parser & linear', () => {
  const sol = (s) => solveEq(parseEquation(s)).x.toString();
  it('menyelesaikan berbagai bentuk', () => {
    expect(sol('3x-5=16')).toBe('7');
    expect(sol('16 = 3x − 5')).toBe('7');
    expect(sol('2(x+3)=18')).toBe('6');
    expect(sol('x/4+2=5')).toBe('12');
    expect(sol('-x=4')).toBe('-4');
    expect(sol('3*x + 4.000 = 25.000')).toBe('7000');
    expect(sol('x/2 + x/3 = 10')).toBe('12');
    expect(sol('(x + 4)/3 = 5')).toBe('11');
    expect(sol('2,5x = 5')).toBe('2');
  });
  it('menolak bentuk tidak linear / tidak lengkap', () => {
    expect(() => linear(parseExpr('x*x'))).toThrow();
    expect(() => linear(parseExpr('3/x'))).toThrow();
    expect(() => parseEquation('3x+')).toThrow();
    expect(() => parseEquation('3x = 2 = 1')).toThrow();
    expect(() => parseEquation('(x+1 = 2')).toThrow();
  });
  it('format tampilan rapi', () => {
    expect(pretty('3*x - 5 = 16')).toBe('3x − 5 = 16');
    expect(pretty('2*(x + 3) = 18')).toBe('2(x + 3) = 18');
    expect(pretty('4*10000 + 30*x = 190000')).toBe('4 × 10.000 + 30x = 190.000');
    expect(pretty('-2*x + 5 = 11')).toBe('−2x + 5 = 11');
    expect(pretty('2*x/3 = 8')).toBe('2x/3 = 8');
    expect(pretty('(x - 2)/4 = 3')).toBe('(x − 2)/4 = 3');
  });
  it('substitusi untuk tahap Periksa', () => {
    const eq = parseEquation('3*x - 5 = 16');
    expect(formatEq(eq, { subst: frac(7) })).toBe('3 × 7 − 5 = 16');
    expect(evaluate(eq.left, frac(7)).toString()).toBe('16');
    expect(formatEq(parseEquation('2*(18 + x) = 60'), { subst: frac(12) })).toBe('2(18 + 12) = 60');
  });
});

describe('operasi kedua ruas', () => {
  it('kurang lalu bagi', () => {
    let eq = parseEquation('3x - 5 = 16');
    const a = applyOp(eq, 'add', parseExpr('5'));
    expect(formatEq(a.shown)).toBe('3x − 5 + 5 = 16 + 5');
    expect(formatEq(a.result)).toBe('3x = 21');
    const b = applyOp(a.result, 'div', parseExpr('3'));
    expect(formatEq(b.shown)).toBe('3x : 3 = 21 : 3');
    expect(formatEq(b.result)).toBe('x = 7');
    expect(isSolved(b.result)).toBe(true);
  });
  it('menolak kali dengan x atau nol', () => {
    const eq = parseEquation('2x = 4');
    expect(() => applyOp(eq, 'mul', parseExpr('x'))).toThrow();
    expect(() => applyOp(eq, 'div', parseExpr('0'))).toThrow();
  });
});

describe('seluruh bank soal', () => {
  it('ada 98 soal', () => expect(ALL.length).toBe(98));

  for (const p of ALL) {
    it(`${p.id}: langkah konten konsisten & nextStep menyelesaikan`, () => {
      const eq0 = parseEquation(p.equation);
      const ans = solveEq(eq0).x;
      expect(ans.toString()).toBe(p.solve.answer);
      let prev = eq0;
      for (const raw of p.solve.steps) {
        const st = parseStep(raw);
        const { result } = applyOp(prev, st.op, st.value);
        expect(equivalent(result, st.result)).toBe(true);
        expect(formatEq(result)).toBe(formatEq(st.result));
        prev = st.result;
      }
      expect(isSolved(prev)).toBe(true);
      // mesin JS bisa menyelesaikan sendiri dari awal
      let eq = eq0;
      for (let i = 0; i < 8 && !isSolved(eq); i++) eq = applyOp(eq, nextStep(eq).op, nextStep(eq).value).result;
      expect(isSolved(eq)).toBe(true);
      expect(solveEq(eq).x.equals(ans)).toBe(true);
      // pilihan persamaan: tepat satu benar
      if (p.model?.equation_options) {
        const ok = p.model.equation_options.filter((o) => {
          const s = solveEq(parseEquation(o));
          return s.kind === 'one' && s.x.equals(ans);
        });
        expect(ok.length).toBe(1);
      }
    });
  }
});

describe('pemeriksa & miskonsepsi', () => {
  const eq = (s) => parseEquation(s);
  it('menerima langkah benar yang berbeda dari kunci', () => {
    const orig = eq('5x + 2 = 2x + 14');
    expect(checkLine(orig, '5x = 2x + 12', orig).status).toBe('ok');
    expect(checkLine(orig, '3x + 2 = 14', orig).status).toBe('ok');
    expect(checkLine(orig, 'x = 4', orig).status).toBe('solved');
    expect(checkLine(orig, '4 = x', orig).status).toBe('solved');
    expect(checkLine(orig, '2 + 5x = 14 + 2x', orig).status).toBe('same');
  });
  it('menjabarkan kurung dihitung kemajuan', () => {
    const orig = eq('2(x+3) = 18');
    expect(checkLine(orig, '2x + 6 = 18', orig).status).toBe('ok');
  });
  it('M1: tanda tidak berubah (lembar kerja S01 no. 2)', () => {
    const orig = eq('3x - 5 = 16');
    const r = checkLine(orig, '3x = 16 - 5', orig);
    expect(r.status).toBe('wrong');
    expect(r.misconception.code).toBe('M1');
    expect(checkLine(orig, 'x = 11/3', orig).misconception.code).toBe('M1');
  });
  it('M2: operasi hanya satu ruas', () => {
    const orig = eq('x + 7 = 15');
    expect(checkLine(orig, 'x = 15', orig).misconception.code).toBe('M2');
  });
  it('M4: mengurangkan koefisien', () => {
    const orig = eq('3x = 21');
    expect(checkLine(orig, 'x = 18', orig).misconception.code).toBe('M4');
  });
  it('M3: membagi sebagian suku', () => {
    const orig = eq('2x + 4 = 10');
    expect(checkLine(orig, 'x + 4 = 5', orig).misconception.code).toBe('M3');
  });
  it('M6: distributif tidak lengkap', () => {
    const orig = eq('2(x + 3) = 18');
    expect(checkLine(orig, '2x + 3 = 18', orig).misconception.code).toBe('M6');
  });
  it('M5: menggabungkan suku tidak sejenis', () => {
    const orig = eq('5x + 2 = 14');
    expect(checkLine(orig, '7x = 14', orig).misconception.code).toBe('M5');
  });
  it('pola khusus soal dari konten', () => {
    const p = ALL.find((q) => q.id === 'w6-p05');
    const orig = eq(p.equation);
    const r = detectMisconception(orig, eq('3x = 29000'), p);
    expect(r.code).toBe('M1');
  });
  it('input tidak terbaca', () => {
    const orig = eq('x + 1 = 2');
    expect(checkLine(orig, '3x +', orig).status).toBe('invalid');
    expect(checkLine(orig, 'x*x = 1', orig).status).toBe('invalid');
  });
  it('arah miring timbangan', () => {
    expect(tiltFor(eq('3x = 11'), frac(7))).toBe(-1); // kiri 21 > kanan 11 -> kiri berat
    expect(tiltFor(eq('3x = 21'), frac(7))).toBe(0);
  });
});

describe('xp & streak', () => {
  it('bintang', () => {
    expect(starsFor({ hintsUsed: 0, allFirstTry: true })).toBe(3);
    expect(starsFor({ hintsUsed: 0, allFirstTry: false })).toBe(2);
    expect(starsFor({ hintsUsed: 1, allFirstTry: true })).toBe(2);
    expect(starsFor({ hintsUsed: 2, allFirstTry: true })).toBe(1);
  });
  it('level', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    expect(levelFromXp(150)).toBe(3);
    expect(levelInfo(160)).toMatchObject({ level: 3, current: 10, needed: 150 });
  });
  it('streak, tameng, dan putus', () => {
    let s = { streak: 0, shields: 0 };
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'];
    for (const d of days) s = updateStreak(s, d);
    expect(s.streak).toBe(7);
    expect(s.shields).toBe(1);
    s = updateStreak(s, '2026-11-09'); // bolos 1 hari, tameng dipakai
    expect(s.streak).toBe(8);
    expect(s.shields).toBe(0);
    s = updateStreak(s, '2026-11-12');
    expect(s.streak).toBe(1);
    expect(dayDiff('2026-12-31', '2027-01-01')).toBe(1);
    expect(visibleStreak({ streak: 4, lastStreakDay: '2026-11-10', shields: 0 }, '2026-11-13')).toBe(0);
  });
});

describe('misi harian', () => {
  it('deterministik dan mengikuti progres', () => {
    const a = pickDaily({ day: '2026-11-13', seed: 'abc', worlds: WORLDS, progress: {} });
    const b = pickDaily({ day: '2026-11-13', seed: 'abc', worlds: WORLDS, progress: {} });
    expect(a).toEqual(b);
    expect(a.main.problemId).toBe('w1-p01');
    expect(a.team.problemIds.length).toBe(2);
    expect(a.team.problemIds).not.toContain(a.main.problemId);
  });
  it('membuka dunia setelah 70% soal selesai', () => {
    const progress = {};
    expect(unlockedWorlds(WORLDS, progress)).toEqual([1]);
    WORLDS[0].problems.slice(0, 11).forEach((p) => (progress[p.id] = { done: true }));
    expect(unlockedWorlds(WORLDS, progress)).toEqual([1, 2]);
    const d = pickDaily({ day: '2026-11-14', seed: 'abc', worlds: WORLDS, progress });
    expect(d.main.problemId.startsWith('w2-')).toBe(true);
  });
  it('misi lengkap', () => {
    const d = { warmup: { done: true }, main: { done: true }, team: { problemIds: ['a', 'b'], done: ['b', 'a'] } };
    expect(missionComplete(d)).toBe(true);
  });
  it('pemanasan 5 soal dengan jawaban bulat', () => {
    const w = makeWarmup('2026-11-13');
    expect(w.length).toBe(5);
    w.forEach((q) => expect(Number.isInteger(q.answer)).toBe(true));
    expect(makeWarmup('x', { focusSign: true })[0].kind).toBe('subNeg');
  });
  it('lencana', () => {
    const b = newBadges({ badges: [], counters: { problemsDone: 1 }, maxStreak: 0 });
    expect(b.map((x) => x.code)).toEqual(['misi-pertama']);
  });
});
