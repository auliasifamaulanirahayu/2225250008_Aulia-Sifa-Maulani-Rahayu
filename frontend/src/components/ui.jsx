// Komponen UI kecil: maskot, gelembung bicara, umpan balik, progres, bintang, sheet, navigasi bawah, toast.

import { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';

// ---------------------------------------------------------------- toast
const toastListeners = new Set();
let toastId = 0;
export function toast(message, { action, onAction, duration = 3500 } = {}) {
  const t = { id: ++toastId, message, action, onAction, duration };
  toastListeners.forEach((fn) => fn(t));
}
export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const add = (t) => {
      setItems((xs) => [...xs, t]);
      if (t.duration) setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.duration);
    };
    toastListeners.add(add);
    return () => toastListeners.delete(add);
  }, []);
  return (
    <div id="toasts" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.message}</span>
          {t.action && (
            <button
              className="toast-btn"
              onClick={() => {
                t.onAction?.();
                setItems((xs) => xs.filter((x) => x.id !== t.id));
              }}
            >
              {t.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- maskot "Seimbang"
export function Mascot({ size = 72, mood = 'happy' }) {
  return (
    <span className="mascot" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 68 68">
        <line x1="34" y1="4" x2="34" y2="14" stroke="#7652D8" strokeWidth="3" />
        <circle cx="34" cy="5" r="4" fill="#52D9FF" />
        <rect x="10" y="14" width="48" height="40" rx="14" fill="#3156D9" />
        <rect x="16" y="22" width="36" height="26" rx="10" fill="#F5F7FF" />
        <circle cx="27" cy="33" r="4" fill="#1F2430" />
        <circle cx="41" cy="33" r="4" fill="#1F2430" />
        {mood === 'think' ? (
          <path d="M27 44 h14" stroke="#1F2430" strokeWidth="3" strokeLinecap="round" />
        ) : (
          <path d="M25 42 q9 8 18 0" stroke="#1F2430" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        <rect x="2" y="28" width="8" height="14" rx="4" fill="#7652D8" />
        <rect x="58" y="28" width="8" height="14" rx="4" fill="#7652D8" />
        <rect x="22" y="56" width="24" height="8" rx="4" fill="#52D9FF" />
      </svg>
    </span>
  );
}

export function Speech({ children, mood }) {
  return (
    <div className="speech">
      <Mascot size={56} mood={mood} />
      <p className="bubble">{children}</p>
    </div>
  );
}

/** kind: good | warn | info — selalu dengan ikon, bukan hanya warna. */
export function Feedback({ kind = 'info', children }) {
  const icon = { good: '✔', warn: '!', info: 'i' }[kind];
  return (
    <div className={`feedback fb-${kind}`} role="status">
      <span className="fb-icon" aria-hidden="true">
        {icon}
      </span>
      <p>{children}</p>
    </div>
  );
}

export function ProgressBar({ value, max, color, label = 'Progres' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="progress-fill" style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

export function Stars({ n = 0, max = 3 }) {
  return (
    <span className="stars" aria-label={`${n} dari ${max} bintang`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < n ? 'star on' : 'star'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Sheet({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" aria-label="Tutup" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const NAV_STUDENT = [
  ['/home', '🎯', 'Misi'],
  ['/map', '🗺️', 'Peta'],
  ['/team', '👥', 'Tim'],
  ['/profile', '👤', 'Profil'],
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {NAV_STUDENT.map(([to, icon, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="nav-icon" aria-hidden="true">
            {icon}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Screen({ className = '', nav = false, children }) {
  const inner = <div className={`screen ${className}`}>{children}</div>;
  return nav ? (
    <div className="with-nav">
      {inner}
      <BottomNav />
    </div>
  ) : (
    inner
  );
}

export function EmptyState({ title, text, children }) {
  return (
    <div className="card center">
      <Mascot size={80} mood="think" />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}

/** Konfirmasi dua ketukan (dialog confirm() tidak dipakai). */
export function ConfirmButton({ label, confirmLabel, onConfirm, className = 'btn btn-ghost' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={`${className} ${armed ? 'armed' : ''}`} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : label}
    </button>
  );
}

export function Choices({ options, multi = false, value, onChange, label = (o) => o, className = '', disabled = false }) {
  const isOn = (o) => (multi ? value?.has(o) : value === o);
  return (
    <div className={`choices ${className}`} role="group">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`choice ${isOn(o) ? 'on' : ''}`}
          aria-pressed={isOn(o)}
          disabled={disabled}
          onClick={() => {
            if (multi) {
              const next = new Set(value);
              next.has(o) ? next.delete(o) : next.add(o);
              onChange(next);
            } else onChange(o);
          }}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export function Loading({ text = 'Memuat…' }) {
  return (
    <div className="card center muted" aria-busy="true">
      {text}
    </div>
  );
}
