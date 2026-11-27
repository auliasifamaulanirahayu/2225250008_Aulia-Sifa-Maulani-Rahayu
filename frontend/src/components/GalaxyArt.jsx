// Ilustrasi galaxy untuk landing page & halaman non-soal (SVG inline: ringan, tajam, tanpa unduhan gambar).
// Jangan dipakai di layar soal (aturan pedagogis 9: prinsip koherensi).

const STARS = [
  [18, 22, 1.4], [62, 12, 1], [112, 30, 1.6], [168, 14, 1.1], [214, 40, 1.3], [250, 18, 1],
  [30, 92, 1], [238, 96, 1.5], [12, 160, 1.2], [262, 150, 1.1], [44, 210, 1.5], [228, 214, 1],
  [140, 226, 1.2], [96, 196, 0.9], [190, 180, 0.9],
];

export function GalaxyArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 280 240" role="img" aria-label="Ilustrasi galaksi dengan planet bercincin dan portal misi">
      <defs>
        <radialGradient id="ga-nebula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7652D8" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#3156D9" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#080B2A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ga-planet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#52D9FF" />
          <stop offset="55%" stopColor="#3156D9" />
          <stop offset="100%" stopColor="#111A52" />
        </linearGradient>
        <linearGradient id="ga-moon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9B8FF" />
          <stop offset="100%" stopColor="#7652D8" />
        </linearGradient>
      </defs>

      <ellipse cx="140" cy="120" rx="140" ry="110" fill="url(#ga-nebula)" />

      {STARS.map(([x, y, r], i) => (
        <circle
          key={i}
          className="animate-twinkle"
          style={{ animationDelay: `${(i % 5) * 0.6}s` }}
          cx={x}
          cy={y}
          r={r}
          fill="#F5F7FF"
        />
      ))}

      {/* orbit jalur misi */}
      <ellipse cx="140" cy="128" rx="118" ry="38" fill="none" stroke="#52D9FF" strokeOpacity="0.35" strokeDasharray="3 6" />

      {/* planet utama bercincin */}
      <g className="animate-float">
        <circle cx="140" cy="118" r="46" fill="url(#ga-planet)" />
        <path d="M110 104 q30 -14 62 -2" stroke="#F5F7FF" strokeOpacity="0.25" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M104 128 q36 12 72 0" stroke="#080B2A" strokeOpacity="0.25" strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="140" cy="122" rx="74" ry="15" fill="none" stroke="#52D9FF" strokeWidth="4" strokeOpacity="0.85" />
        {/* x di planet: variabel yang dicari */}
        <text x="140" y="132" textAnchor="middle" fontSize="34" fontWeight="800" fill="#F5F7FF" fontFamily="Nunito, sans-serif">
          x
        </text>
      </g>

      {/* bulan kecil */}
      <circle cx="232" cy="62" r="14" fill="url(#ga-moon)" />
      <circle cx="227" cy="58" r="3" fill="#080B2A" fillOpacity="0.25" />

      {/* portal misi */}
      <g transform="translate(46 64)">
        <ellipse cx="0" cy="0" rx="16" ry="22" fill="#080B2A" stroke="#7652D8" strokeWidth="3" />
        <ellipse cx="0" cy="0" rx="9" ry="14" fill="none" stroke="#52D9FF" strokeWidth="2" strokeOpacity="0.8" />
      </g>

      {/* roket menuju planet */}
      <g transform="translate(60 182) rotate(-35)">
        <path d="M0 -14 q8 6 8 20 h-16 q0 -14 8 -20z" fill="#F5F7FF" />
        <circle cx="0" cy="0" r="3" fill="#3156D9" />
        <path d="M-8 6 l-5 7 h5z M8 6 l5 7 h-5z" fill="#7652D8" />
        <path d="M-4 7 q4 10 8 0z" fill="#52D9FF" />
      </g>
    </svg>
  );
}

/** Warna teks yang kontras di atas warna planet (gelap di planet terang, putih di planet gelap). */
function inkOn(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#080B2A' : '#FFFFFF';
}

/**
 * Planet misi untuk Mission Map & Dashboard.
 * state: 'locked' | 'open' | 'active' | 'done'. Ring luar menunjukkan progres (0–1).
 */
export function Planet({ color, size = 64, state = 'open', progress = 0, label }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * (r + 3);
  const locked = state === 'locked';
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r + 3} fill="none" stroke="var(--c-border)" strokeWidth="3" />
        {!locked && progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r + 3}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(1, progress)} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 2}
          fill={locked ? 'var(--c-surface-2)' : color}
          fillOpacity={locked ? 1 : 0.9}
        />
        {!locked && (
          <path
            d={`M${size * 0.3} ${size * 0.42} q${size * 0.2} -${size * 0.12} ${size * 0.42} -${size * 0.02}`}
            stroke="#fff"
            strokeOpacity="0.35"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className={`relative font-extrabold ${locked ? 'text-muted' : ''}`}
        style={{ fontSize: size * 0.3, color: locked ? undefined : inkOn(color) }}
      >
        {locked ? '🔒' : state === 'done' ? '✓' : label}
      </span>
      {state === 'active' && (
        <span className="absolute inset-0 rounded-full shadow-[0_0_22px_rgb(82_217_255/45%)]" />
      )}
    </span>
  );
}
