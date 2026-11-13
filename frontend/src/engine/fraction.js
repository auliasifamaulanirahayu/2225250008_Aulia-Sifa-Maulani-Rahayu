// Bilangan rasional tepat (tanpa galat floating point).

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export class Fraction {
  constructor(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Fraction butuh bilangan bulat');
    if (d === 0) throw new Error('Pembagian dengan nol');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    this.n = n / g || 0; // hindari -0
    this.d = d / g;
  }

  static from(v) {
    if (v instanceof Fraction) return v;
    if (Number.isInteger(v)) return new Fraction(v);
    if (typeof v === 'string') {
      if (v.includes('/')) {
        const [a, b] = v.split('/');
        return new Fraction(parseInt(a, 10), parseInt(b, 10));
      }
      const neg = v.trim().startsWith('-');
      const [i, f = ''] = v.replace('-', '').split('.');
      const fr = new Fraction(parseInt(i + f, 10), 10 ** f.length);
      return neg ? fr.neg() : fr;
    }
    return Fraction.from(String(v));
  }

  add(o) {
    o = Fraction.from(o);
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o) {
    return this.add(Fraction.from(o).neg());
  }
  mul(o) {
    o = Fraction.from(o);
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o) {
    o = Fraction.from(o);
    if (o.n === 0) throw new Error('Pembagian dengan nol');
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  neg() {
    return new Fraction(-this.n, this.d);
  }
  abs() {
    return new Fraction(Math.abs(this.n), this.d);
  }
  isZero() {
    return this.n === 0;
  }
  isInt() {
    return this.d === 1;
  }
  isOne() {
    return this.n === 1 && this.d === 1;
  }
  sign() {
    return Math.sign(this.n);
  }
  equals(o) {
    o = Fraction.from(o);
    return this.n === o.n && this.d === o.d;
  }
  toNumber() {
    return this.n / this.d;
  }
  toString() {
    return this.d === 1 ? String(this.n) : `${this.n}/${this.d}`;
  }
}

export const frac = (n, d = 1) => new Fraction(n, d);
export const ZERO = frac(0);
export const ONE = frac(1);

/** Kelipatan persekutuan terkecil dua bilangan bulat positif. */
export const lcm = (a, b) => (a / gcd(a, b)) * b;

/** Format angka Indonesia: 25000 -> "25.000", -3 -> "−3", 11/3 -> "11/3". */
export function formatNumber(fr, { minus = '−' } = {}) {
  fr = Fraction.from(fr);
  const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = fr.n < 0 ? minus : '';
  const n = Math.abs(fr.n);
  return fr.d === 1 ? `${sign}${group(n)}` : `${sign}${group(n)}/${group(fr.d)}`;
}
