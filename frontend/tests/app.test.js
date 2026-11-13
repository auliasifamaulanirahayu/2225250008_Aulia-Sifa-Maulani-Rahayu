import { describe, it, expect } from 'vitest';
import { applyKey } from '../src/components/Keypad.jsx';
import { studentEmail } from '../src/lib/auth.js';
import { parseNumber } from '../src/screens/problem/stages.jsx';

describe('keypad', () => {
  it('menyusun persamaan dengan spasi rapi', () => {
    let v = '';
    for (const k of ['3', 'x', '−', '5', '=', '1', '6']) v = applyKey(v, k);
    expect(v).toBe('3x − 5 = 16');
    v = applyKey(v, '⌫');
    v = applyKey(v, '⌫');
    expect(v).toBe('3x − 5 =');
  });
  it('tanda minus di awal', () => {
    expect(applyKey('', '−')).toBe('− ');
  });
});

describe('akun siswa tanpa email', () => {
  it('email sintetis stabil dan tidak peka huruf besar', () => {
    const a = studentEmail('K7B3QZ', 'Raka');
    expect(a).toBe(studentEmail('k7b3qz', ' raka '));
    expect(a).toMatch(/^k7b3qz\.raka-[0-9a-z]+@/);
    expect(studentEmail('K7B3QZ', 'Raka')).not.toBe(studentEmail('K7B3QZ', 'Rakaa'));
    expect(studentEmail('K7B3QZ', 'Siti Nur')).toMatch(/^k7b3qz\.siti-nur-/);
  });
});

describe('isian angka', () => {
  it('membaca format Indonesia', () => {
    expect(parseNumber('7.000').toString()).toBe('7000');
    expect(parseNumber('−2').toString()).toBe('-2');
    expect(parseNumber('11/3').toString()).toBe('11/3');
    expect(parseNumber('2,5').toString()).toBe('5/2');
    expect(parseNumber('x')).toBe(null);
    expect(parseNumber('')).toBe(null);
  });
});
