// Mesin persamaan linear satu variabel: parser, bentuk linear, operasi kedua ruas, format tampilan.
// Murni (tanpa DOM) agar mudah diuji. Lihat docs/ARCHITECTURE.md §4.2.

import { Fraction, frac, ZERO, ONE, lcm, formatNumber } from './fraction.js';

export class ParseError extends Error {}
export class NonLinearError extends Error {}

// ------------------------------------------------------------------ node AST
export const N = {
  num: (v) => ({ t: 'num', v: Fraction.from(v) }),
  x: () => ({ t: 'x' }),
  add: (a, b) => ({ t: 'add', a, b }),
  sub: (a, b) => ({ t: 'sub', a, b }),
  mul: (a, b, implicit = false) => ({ t: 'mul', a, b, implicit }),
  div: (a, b, colon = false) => ({ t: 'div', a, b, colon }),
  neg: (a) => ({ t: 'neg', a }),
  grp: (a) => ({ t: 'grp', a }),
};

// ------------------------------------------------------------------ parser
export function normalizeInput(s) {
  return String(s)
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/X/g, 'x')
    .replace(/\s+/g, '')
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1'); // pemisah ribuan 25.000 -> 25000
}

function tokenize(s) {
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      const int = s.slice(i, j);
      let fr = '';
      if ((s[j] === '.' || s[j] === ',') && /[0-9]/.test(s[j + 1] ?? '')) {
        let k = j + 1;
        while (k < s.length && /[0-9]/.test(s[k])) k++;
        fr = s.slice(j + 1, k);
        j = k;
      }
      tokens.push({ t: 'num', v: frac(parseInt(int + fr, 10), 10 ** fr.length) });
      i = j;
    } else if (c === 'x') {
      tokens.push({ t: 'x' });
      i++;
    } else if ('+-*/()='.includes(c)) {
      tokens.push({ t: c });
      i++;
    } else {
      throw new ParseError(`Simbol "${c}" tidak dikenal.`);
    }
  }
  return tokens;
}

function parseTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function expr() {
    let node = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const rhs = term();
      node = op === '+' ? N.add(node, rhs) : N.sub(node, rhs);
    }
    return node;
  }
  function term() {
    let node = unary();
    for (;;) {
      const p = peek();
      if (!p) break;
      if (p.t === '*') {
        next();
        node = N.mul(node, unary(), false);
      } else if (p.t === '/') {
        next();
        node = N.div(node, unary());
      } else if (p.t === 'x' || p.t === '(') {
        node = N.mul(node, unary(), true);
      } else break;
    }
    return node;
  }
  function unary() {
    const p = peek();
    if (!p) throw new ParseError('Persamaan belum lengkap.');
    if (p.t === '-') {
      next();
      return N.neg(unary());
    }
    if (p.t === '+') {
      next();
      return unary();
    }
    return primary();
  }
  function primary() {
    const p = next();
    if (!p) throw new ParseError('Persamaan belum lengkap.');
    if (p.t === 'num') return { t: 'num', v: p.v };
    if (p.t === 'x') return N.x();
    if (p.t === '(') {
      const inner = expr();
      if (!peek() || peek().t !== ')') throw new ParseError('Tanda kurung belum ditutup.');
      next();
      return N.grp(inner);
    }
    throw new ParseError(`Tanda "${p.t}" tidak di tempat yang benar.`);
  }

  const node = expr();
  if (pos < tokens.length) throw new ParseError(`Tanda "${tokens[pos].t}" tidak di tempat yang benar.`);
  return node;
}

export function parseExpr(str) {
  const s = normalizeInput(str);
  if (!s) throw new ParseError('Masih kosong.');
  if (s.includes('=')) throw new ParseError('Tanda = tidak boleh di sini.');
  return parseTokens(tokenize(s));
}

export function parseEquation(str) {
  const s = normalizeInput(str);
  const parts = s.split('=');
  if (parts.length !== 2) throw new ParseError('Persamaan harus punya tepat satu tanda =.');
  if (!parts[0] || !parts[1]) throw new ParseError('Ruas kiri dan kanan harus diisi.');
  return { left: parseTokens(tokenize(parts[0])), right: parseTokens(tokenize(parts[1])) };
}

// ------------------------------------------------------------------ bentuk linear a·x + b
export const L = {
  make: (a, b) => ({ a: Fraction.from(a), b: Fraction.from(b) }),
  add: (p, q) => ({ a: p.a.add(q.a), b: p.b.add(q.b) }),
  sub: (p, q) => ({ a: p.a.sub(q.a), b: p.b.sub(q.b) }),
  scale: (p, k) => ({ a: p.a.mul(k), b: p.b.mul(k) }),
  neg: (p) => ({ a: p.a.neg(), b: p.b.neg() }),
};

export function linear(node) {
  switch (node.t) {
    case 'num':
      return L.make(ZERO, node.v);
    case 'x':
      return L.make(ONE, ZERO);
    case 'add':
      return L.add(linear(node.a), linear(node.b));
    case 'sub':
      return L.sub(linear(node.a), linear(node.b));
    case 'neg':
      return L.neg(linear(node.a));
    case 'grp':
      return linear(node.a);
    case 'mul': {
      const p = linear(node.a);
      const q = linear(node.b);
      if (p.a.isZero()) return L.scale(q, p.b);
      if (q.a.isZero()) return L.scale(p, q.b);
      throw new NonLinearError('x dikali x bukan persamaan linear.');
    }
    case 'div': {
      const p = linear(node.a);
      const q = linear(node.b);
      if (!q.a.isZero()) throw new NonLinearError('Tidak bisa membagi dengan x.');
      if (q.b.isZero()) throw new NonLinearError('Tidak bisa membagi dengan nol.');
      return L.scale(p, ONE.div(q.b));
    }
    default:
      throw new ParseError('Bentuk tidak dikenal.');
  }
}

/** Penyelesaian persamaan: {kind:'one', x} | {kind:'all'} | {kind:'none'}. */
export function solveEq(eq) {
  const d = L.sub(linear(eq.left), linear(eq.right));
  if (d.a.isZero()) return { kind: d.b.isZero() ? 'all' : 'none' };
  return { kind: 'one', x: d.b.neg().div(d.a) };
}

export function sameSolution(s1, s2) {
  if (s1.kind !== s2.kind) return false;
  return s1.kind !== 'one' || s1.x.equals(s2.x);
}

export function equivalent(e1, e2) {
  return sameSolution(solveEq(e1), solveEq(e2));
}

export function evaluate(node, xVal) {
  const l = linear(node);
  return l.a.mul(xVal).add(l.b);
}

// ------------------------------------------------------------------ format tampilan
const PREC = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, num: 4, x: 4, grp: 4 };

export function format(node, opts = {}) {
  const { subst = null } = opts;
  const f = (n) => format(n, opts);
  const wrap = (n, minPrec) => (PREC[n.t] < minPrec ? `(${f(n)})` : f(n));
  const isNegLeaf = (n) => n.t === 'num' && n.v.sign() < 0;
  switch (node.t) {
    case 'num':
      return formatNumber(node.v);
    case 'x':
      if (!subst) return 'x';
      return subst.sign() < 0 ? `(${formatNumber(subst)})` : formatNumber(subst);
    case 'grp':
      return `(${f(node.a)})`;
    case 'neg':
      return `−${wrap(node.a, 2)}`;
    case 'add': {
      if (node.b.t === 'neg') return `${f(node.a)} − ${wrap(node.b.a, 2)}`;
      if (isNegLeaf(node.b)) return `${f(node.a)} − ${formatNumber(node.b.v.abs())}`;
      return `${f(node.a)} + ${f(node.b)}`;
    }
    case 'sub':
      return `${f(node.a)} − ${wrap(node.b, 2)}`;
    case 'mul': {
      const left = wrap(node.a, 2);
      const right = wrap(node.b, 3);
      const numLike = (n) => n.t === 'num' || (n.t === 'neg' && numLike(n.a));
      const looksImplicit = node.implicit || (numLike(node.a) && (node.b.t === 'x' || node.b.t === 'grp'));
      if (looksImplicit && !subst) return `${left}${right}`;
      if (looksImplicit && subst && node.b.t === 'grp') return `${left}${right}`;
      return `${left} × ${right}`;
    }
    case 'div': {
      const sep = node.colon ? ' : ' : '/';
      return `${wrap(node.a, 2)}${sep}${wrap(node.b, 3)}`;
    }
    default:
      return '?';
  }
}

export const formatEq = (eq, opts) => `${format(eq.left, opts)} = ${format(eq.right, opts)}`;

/** Bangun kembali node sederhana dari bentuk linear, mis. {a:3,b:-5} -> 3x − 5. */
export function linToAst({ a, b }) {
  let xTerm = null;
  if (!a.isZero()) {
    const abs = a.abs();
    let t;
    if (abs.isOne()) t = N.x();
    else if (abs.isInt()) t = N.mul(N.num(abs), N.x(), true);
    else {
      const top = abs.n === 1 ? N.x() : N.mul(N.num(frac(abs.n)), N.x(), true);
      t = N.div(top, N.num(frac(abs.d)));
    }
    xTerm = a.sign() < 0 ? N.neg(t) : t;
  }
  if (!xTerm) return b.sign() < 0 ? N.neg(N.num(b.abs())) : N.num(b);
  if (b.isZero()) return xTerm;
  return b.sign() < 0 ? N.sub(xTerm, N.num(b.abs())) : N.add(xTerm, N.num(b));
}

// ------------------------------------------------------------------ struktur suku
/** Pecah ruas menjadi suku-suku tingkat atas beserta tandanya. */
export function flatten(node, sign = 1, out = []) {
  if (node.t === 'add') {
    flatten(node.a, sign, out);
    flatten(node.b, sign, out);
  } else if (node.t === 'sub') {
    flatten(node.a, sign, out);
    flatten(node.b, -sign, out);
  } else if (node.t === 'neg' && (node.a.t === 'add' || node.a.t === 'sub' || node.a.t === 'neg')) {
    flatten(node.a, -sign, out);
  } else {
    out.push({ sign, node });
  }
  return out;
}

export const termCount = (node) => flatten(node).length;

export function termLinear(term) {
  const l = linear(term.node);
  return term.sign < 0 ? L.neg(l) : l;
}

function hasNode(node, pred) {
  if (!node || typeof node !== 'object') return false;
  if (pred(node)) return true;
  return hasNode(node.a, pred) || hasNode(node.b, pred);
}
export const hasGroup = (node) => hasNode(node, (n) => n.t === 'grp');
const hasDiv = (node) => hasNode(node, (n) => n.t === 'div');

/** Ukuran "kerumitan" persamaan: berkurang bila siswa membuat kemajuan. */
export function measure(eq) {
  let m = 0;
  for (const side of [eq.left, eq.right]) {
    m += termCount(side);
    if (hasGroup(side)) m += 2;
    else if (hasDiv(side)) m += 1;
    const l = linear(side);
    if (!l.a.isZero() && !l.a.isOne()) m += 1;
  }
  return m;
}

const isSimpleConst = (n) =>
  n.t === 'num' ||
  (n.t === 'neg' && isSimpleConst(n.a)) ||
  (n.t === 'div' && n.a.t === 'num' && n.b.t === 'num');
const isBareX = (n) => n.t === 'x' || (n.t === 'grp' && isBareX(n.a));

/** Selesai bila bentuknya x = bilangan atau bilangan = x. */
export function isSolved(eq) {
  return (isBareX(eq.left) && isSimpleConst(eq.right)) || (isBareX(eq.right) && isSimpleConst(eq.left));
}

// ------------------------------------------------------------------ operasi kedua ruas
const wrapIfCompound = (n) => (termCount(n) > 1 ? N.grp(n) : n);

export function simplifyEq(eq) {
  return { left: linToAst(linear(eq.left)), right: linToAst(linear(eq.right)) };
}

/**
 * Terapkan operasi ke KEDUA ruas.
 * op: 'add' | 'sub' | 'mul' | 'div' | 'expand' | 'swap'; value: node (untuk add/sub/mul/div).
 * Mengembalikan { shown, result }: shown = bentuk antara untuk ditampilkan (boleh null).
 */
export function applyOp(eq, op, value) {
  if (op === 'swap') return { shown: null, result: { left: eq.right, right: eq.left } };
  if (op === 'expand') return { shown: null, result: simplifyEq(eq) };
  if (!value) throw new ParseError('Isi dulu bilangannya.');
  const v = op === 'sub' || op === 'mul' || op === 'div' ? wrapIfCompound(value) : value;
  if (op === 'mul' || op === 'div') {
    const lv = linear(value);
    if (!lv.a.isZero()) throw new NonLinearError('Kali atau bagi hanya dengan bilangan, bukan dengan x.');
    if (lv.b.isZero()) throw new NonLinearError('Tidak boleh kali atau bagi dengan nol.');
  }
  const build = {
    add: (s) => N.add(s, v),
    sub: (s) => N.sub(s, v),
    mul: (s) => N.mul(wrapIfCompound(s), v, false),
    div: (s) => N.div(wrapIfCompound(s), v, true),
  }[op];
  if (!build) throw new ParseError(`Operasi ${op} tidak dikenal.`);
  const shown = { left: build(eq.left), right: build(eq.right) };
  return { shown, result: simplifyEq(shown) };
}

/**
 * Langkah baku berikutnya (sama dengan content/tools/build_worlds.py -> gen_steps).
 * Dipakai untuk petunjuk dinamis dan contoh. Mengembalikan {op, value} atau null bila selesai.
 */
export function nextStep(eq) {
  if (isSolved(eq)) return null;
  const l = linear(eq.left);
  const r = linear(eq.right);
  const den = [l.a, l.b, r.a, r.b].reduce((acc, f) => lcm(acc, f.d), 1);
  if (den > 1) return { op: 'mul', value: N.num(den) };
  if (hasGroup(eq.left) || hasGroup(eq.right)) return { op: 'expand', value: null };
  if (!l.a.isZero() && !r.a.isZero()) {
    const k = r.a.toNumber() > l.a.toNumber() ? l.a : r.a;
    return { op: k.sign() > 0 ? 'sub' : 'add', value: linToAst(L.make(k.abs(), ZERO)) };
  }
  const leftVar = !l.a.isZero();
  const a = leftVar ? l.a : r.a;
  const b = leftVar ? l.b : r.b;
  if (a.isZero()) return null;
  if (!b.isZero()) return { op: b.sign() > 0 ? 'sub' : 'add', value: N.num(b.abs()) };
  if (!a.isOne()) return { op: 'div', value: a.sign() < 0 ? N.neg(N.num(a.abs())) : N.num(a) };
  // bentuk linear sudah x = c tetapi belum rapi (mis. 3x − 2x = 5)
  return { op: 'expand', value: null };
}

export function explainStep(step) {
  const v = step.value ? format(step.value) : '';
  switch (step.op) {
    case 'add':
      return `Tambahkan ${v} ke kedua ruas.`;
    case 'sub':
      return `Kurangi kedua ruas dengan ${v}.`;
    case 'mul':
      return `Kalikan kedua ruas dengan ${v}.`;
    case 'div':
      return `Bagi kedua ruas dengan ${v}.`;
    case 'expand':
      return 'Sederhanakan: jabarkan tanda kurung dan gabungkan suku sejenis.';
    case 'swap':
      return 'Tukar ruas kiri dan kanan.';
    default:
      return '';
  }
}

/** Langkah dari JSON konten -> {op, value(node), result(eq)}. */
export function parseStep(step) {
  return {
    op: step.op,
    value: step.value ? parseExpr(step.value) : null,
    result: parseEquation(step.result),
  };
}

/** Tampilan persamaan dari string konten (sintaks SymPy) ke teks rapi. */
export const pretty = (str) => formatEq(parseEquation(str));
