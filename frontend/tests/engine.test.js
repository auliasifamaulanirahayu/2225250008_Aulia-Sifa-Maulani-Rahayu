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
import { fallbackReply, leaksAnswer, fullSolution } from '../src/engine/tutorFallback.js';
import { challengeXp, ZONE_XP } from '../src/engine/xp.js';
import { equivalent as eqEquivalent } from '../src/engine/equation.js';

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

describe('Mission Map', () => {
  it('7 misi sesuai ketentuan, masing-masing punya tujuan & materi', () => {
    expect(WORLDS.map((w) => w.world)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(WORLDS[5].title).toBe('Memahami Perubahan Tanda');
    for (const w of WORLDS) {
      expect(w.goal.length).toBeGreaterThan(0);
      expect(w.intro.length).toBeGreaterThan(0);
    }
  });
  it('setiap misi dimulai contoh lengkap lalu contoh bertahap (aturan 3)', () => {
    for (const w of WORLDS) {
      const first = [...w.problems].sort((a, b) => a.order - b.order).slice(0, 2);
      expect(first.map((p) => p.type)).toEqual(['worked', 'faded']);
    }
  });
  it('"pindah ruas" tidak disebut sebelum Mission 06 (aturan 2)', () => {
    const early = JSON.stringify(WORLDS.filter((w) => w.world < 6));
    expect(early.toLowerCase()).not.toContain('pindah');
  });
  it('setiap soal punya penanda alat bantu', () => {
    for (const p of ALL) expect(p.ui).toEqual(expect.objectContaining({ balance: expect.any(Boolean), op_only: expect.any(Boolean) }));
  });
  it('lencana misi tuntas', () => {
    const got = newBadges({ counters: { mission3Done: 1 }, badges: [], maxStreak: 0 });
    expect(got.map((b) => b.code)).toContain('mission-3');
  });
});

describe('seluruh bank soal', () => {
  it('ada 101 soal', () => expect(ALL.length).toBe(101));

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
    const p = ALL.find((q) => q.id === 'w4-p00'); // Dina, lembar kerja S01 no. 4
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

describe('AI Tutor: tutor bawaan & pengaman', () => {
  const dina = () => ALL.find((q) => q.id === 'w4-p00'); // 3x + 4.000 = 25.000 -> 7.000
  it('petunjuk bertingkat untuk soal, satu per giliran', () => {
    const hints = ['A', 'B', 'C'];
    const p = ALL.find((q) => q.id === 'w5-p03');
    const r1 = fallbackReply({ message: 'Langkah berikutnya apa?', problem: p, hints, turn: 0 });
    expect(r1.text).toContain('A');
    const r2 = fallbackReply({ message: 'Langkah berikutnya apa?', problem: p, hints, turn: r1.turn });
    expect(r2.text).toContain('B');
    const r3 = fallbackReply({ message: 'bingung', problem: p, hints, turn: 9 });
    expect(r3.text).toContain('C');
  });
  it('tidak memberi jawaban sebelum siswa mencoba', () => {
    const p = dina();
    const r = fallbackReply({ message: 'jawabannya berapa?', problem: p, hints: ['h'], attempted: false });
    expect(r.text).toContain('Coba kerjakan dulu');
    expect(leaksAnswer(r.text, p.solve.answer)).toBe(false);
    const full = fallbackReply({ message: 'x', problem: p, mode: 'full', attempted: false });
    expect(full.text).not.toContain('Langkah 1');
  });
  it('pembahasan lengkap setelah mencoba & meminta', () => {
    const p = dina();
    const r = fallbackReply({ message: 'tolong', problem: p, mode: 'full', attempted: true });
    expect(r.text).toContain('Langkah 1');
    expect(r.text).toContain('Rp7.000');
    expect(fullSolution(p)).toContain('25.000');
  });
  it('"pindah ruas" hanya disebut mulai Mission 06', () => {
    expect(fallbackReply({ message: 'kenapa tandanya berubah?', mission: 2 }).text.toLowerCase()).not.toContain('pindah');
    expect(fallbackReply({ message: 'kenapa tandanya berubah?', mission: 6 }).text).toContain('kedua ruas');
  });
  it('topik umum tanpa soal', () => {
    expect(fallbackReply({ message: 'Apa itu PLSV?' }).text).toContain('PLSV adalah');
    expect(fallbackReply({ message: 'halo' }).text).toContain('Bagian mana');
  });
  it('mendeteksi balasan yang menyebut jawaban akhir', () => {
    expect(leaksAnswer('Jadi x = 7.000, bagus!', '7000')).toBe(true);
    expect(leaksAnswer('Hasilnya x=−5.', '-5')).toBe(true);
    expect(leaksAnswer('Jadi x = 11/3', '11/3')).toBe(true);
    expect(leaksAnswer('Kurangi 4.000 di kedua ruas: 3x = 21.000', '7000')).toBe(false);
    expect(leaksAnswer('x = 70', '7')).toBe(false);
    expect(leaksAnswer('x = 7', '-7')).toBe(false);
  });
});

describe('Learning Zone & Challenge Zone', () => {
  const zonesDir = resolve(__dirname, '../../content/zones');
  const LESSONS = JSON.parse(readFileSync(resolve(zonesDir, 'learning.json'), 'utf8')).lessons;
  const CH = JSON.parse(readFileSync(resolve(zonesDir, 'challenge.json'), 'utf8')).questions;
  const quizQs = LESSONS.flatMap((l) => l.pages.flatMap((p) => p.questions || []));
  const ALLQ = [...quizQs, ...CH];
  const sol = (e) => solveEq(parseEquation(e));

  it('8 materi, masing-masing satu bagian per layar dengan latihan', () => {
    expect(LESSONS).toHaveLength(8);
    for (const l of LESSONS) expect(l.pages.at(-1).kind).toBe('quiz');
    expect(LESSONS[6].requires).toBe('L6'); // perubahan tanda setelah kedua ruas
  });
  it('Challenge: 10 soal per level, 4 jenis soal', () => {
    for (const lv of ['easy', 'medium', 'advanced']) expect(CH.filter((q) => q.level === lv)).toHaveLength(10);
    expect(new Set(CH.map((q) => q.type))).toEqual(new Set(['mc', 'short', 'step', 'story']));
  });
  it('kunci jawaban sama dengan mesin aljabar aplikasi', () => {
    for (const q of ALLQ) {
      if (q.verify === 'solution' || q.type === 'step' || q.type === 'story') {
        const s = sol(q.eq);
        expect(s.kind, q.id).toBe('one');
        expect(s.x.equals(frac(...q.answer.split('/').map(Number))), q.id).toBe(true);
      }
    }
  });
  it('langkah benar setara dengan soal, pengecoh tidak', () => {
    for (const q of ALLQ.filter((x) => x.type === 'step')) {
      for (const st of q.steps) for (const o of st.options) expect(eqEquivalent(parseEquation(o.eq), parseEquation(q.eq)), `${q.id} ${o.eq}`).toBe(!!o.correct);
    }
  });
  it('substitusi soal cerita seimbang', () => {
    for (const q of ALLQ.filter((x) => x.type === 'story')) {
      const e = parseEquation(q.eq);
      const x = sol(q.eq).x;
      expect(evaluate(e.left, x).equals(evaluate(e.right, x)), q.id).toBe(true);
      expect(String(evaluate(e.left, x))).toBe(q.check.left_value);
    }
  });
  it('umpan balik salah menjelaskan, petunjuk tidak memberi jawaban', () => {
    for (const q of ALLQ) {
      for (const o of [...(q.options || []), ...(q.steps || []).flatMap((s) => s.options)]) if (!o.correct) expect(o.why, q.id).toBeTruthy();
      if (q.hint && q.answer) expect(leaksAnswer(q.hint, q.answer), q.id).toBe(false);
    }
  });
  it('XP zona hanya sekali dan sesuai batas SQL', () => {
    expect(challengeXp({ firstTry: true, alreadySolved: false })).toBe(ZONE_XP.challengeFirstTry);
    expect(challengeXp({ firstTry: false, alreadySolved: false })).toBe(ZONE_XP.challengeRetry);
    expect(challengeXp({ firstTry: true, alreadySolved: true })).toBe(0);
    expect(ZONE_XP.challengeFirstTry).toBeLessThanOrEqual(3); // clamp_attempt: challenge ≤ 3
    expect(ZONE_XP.lesson).toBeLessThanOrEqual(10); // clamp_attempt: lesson ≤ 10
  });
});
