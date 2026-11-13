// Kolom isian + keypad khusus (angka, x, +, −, =, /, kurung). Juga menerima ketikan keyboard fisik.

import { useEffect, useId, useState } from 'react';
import { sfx } from '../sound.js';

const LAYOUTS = {
  full: [
    ['7', '8', '9', 'x', '⌫'],
    ['4', '5', '6', '+', '−'],
    ['1', '2', '3', '=', '/'],
    ['0', '(', ')', ',', 'OK'],
  ],
  term: [
    ['7', '8', '9', 'x', '⌫'],
    ['4', '5', '6', '−', '/'],
    ['1', '2', '3', ',', 'OK'],
    ['0'],
  ],
  number: [
    ['7', '8', '9', '⌫'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', ','],
    ['0', 'OK'],
  ],
};

const KEY_MAP = { '-': '−', X: 'x', '.': ',', Enter: 'OK', Backspace: '⌫' };

let activePad = null; // hanya satu kolom yang menerima ketikan keyboard

export function applyKey(value, k) {
  if (k === '⌫') return value.slice(0, -1).replace(/\s+$/, '');
  if (value.length >= 40) return value;
  const add = k === '=' ? ' = ' : k === '+' || k === '−' ? ` ${k} ` : k;
  return (value + add).replace(/\s+/g, ' ').replace(/^ /, '');
}

/**
 * @param onSubmit (value, clear) => void
 */
export function InputPad({ layout = 'full', placeholder = '', okLabel = 'Cek', onSubmit, onChange, ariaLabel = 'Jawaban', initial = '' }) {
  const id = useId();
  const [value, setValue] = useState(initial);

  const press = (k) => {
    if (k === 'OK') {
      onSubmit?.(value, () => setValue(''));
      return;
    }
    setValue((v) => {
      const next = applyKey(v, k);
      onChange?.(next);
      return next;
    });
  };

  useEffect(() => {
    activePad = id;
    const allowed = new Set(LAYOUTS[layout].flat());
    const onKey = (e) => {
      if (activePad !== id) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key in KEY_MAP ? KEY_MAP[e.key] : e.key;
      if (allowed.has(k)) {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (activePad === id) activePad = null;
    };
  });

  return (
    <div className="input-pad">
      <div
        className={`pad-display ${value ? '' : 'placeholder'}`}
        role="textbox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-live="polite"
        onClick={() => (activePad = id)}
        onFocus={() => (activePad = id)}
      >
        {value || placeholder}
      </div>
      <div className={`keypad keypad-${layout}`}>
        {LAYOUTS[layout].map((row, r) => (
          <div className="keypad-row" key={r}>
            {row.map((k) => (
              <button
                key={k}
                type="button"
                className={`key ${k === 'OK' ? 'key-ok' : ''} ${k === 'x' ? 'key-x' : ''}`}
                aria-label={k === '⌫' ? 'Hapus' : k === 'OK' ? okLabel : k}
                onClick={() => {
                  activePad = id;
                  sfx.tap();
                  press(k);
                }}
              >
                {k === 'OK' ? okLabel : k}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
