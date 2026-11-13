// Timbangan Seimbang (FR-06): model visual persamaan dalam SVG.
// x = kotak misteri biru, bilangan positif = beban abu-abu, bilangan negatif = balon oranye.

import { flatten, termLinear, format, hasGroup } from '../engine/equation.js';
import { formatNumber } from '../engine/fraction.js';

const W = 340;
const H = 220;
const PIVOT = { x: 170, y: 46 };
const ARM = 115;

function termLabel(a) {
  if (a.isOne()) return 'x';
  if (a.equals(-1)) return '−x';
  if (a.isInt()) return `${formatNumber(a)}x`;
  const abs = a.abs();
  return `${a.sign() < 0 ? '−' : ''}${abs.n === 1 ? '' : abs.n}x/${abs.d}`;
}

export function itemsOf(side) {
  const items = [];
  for (const t of flatten(side)) {
    let l;
    try {
      l = termLinear(t);
    } catch {
      continue;
    }
    if (hasGroup(t.node)) {
      items.push({ kind: t.sign < 0 ? 'xballoon' : 'bag', label: (t.sign < 0 ? '−' : '') + format(t.node) });
    } else if (!l.a.isZero() && l.b.isZero()) {
      const pos = l.a.sign() > 0;
      if (pos && l.a.isInt() && l.a.n <= 4) for (let i = 0; i < l.a.n; i++) items.push({ kind: 'box', label: 'x' });
      else items.push({ kind: pos ? 'box' : 'xballoon', label: termLabel(l.a) });
    } else if (l.a.isZero() && !l.b.isZero()) {
      items.push({ kind: l.b.sign() > 0 ? 'weight' : 'balloon', label: formatNumber(l.b) });
    } else if (!l.a.isZero()) {
      items.push({ kind: 'bag', label: format(t.node) });
    }
  }
  return items;
}

const widthOf = (it) => Math.max(28, it.label.length * 8 + 14);

function Pan({ end, trayY, items }) {
  const ground = items.filter((i) => i.kind !== 'balloon' && i.kind !== 'xballoon');
  const floating = items.filter((i) => i.kind === 'balloon' || i.kind === 'xballoon');
  const rows = [[]];
  let rowW = 0;
  for (const it of ground) {
    const w = widthOf(it);
    if (rowW + w > 104 && rows.at(-1).length) {
      rows.push([]);
      rowW = 0;
    }
    rows.at(-1).push(it);
    rowW += w + 4;
  }
  const cx = end.x;
  return (
    <g>
      <line x1={end.x} y1={end.y} x2={cx - 52} y2={trayY} className="sc-string" />
      <line x1={end.x} y1={end.y} x2={cx + 52} y2={trayY} className="sc-string" />
      {rows.map((row, r) => {
        const total = row.reduce((s, it) => s + widthOf(it) + 4, -4);
        let x = cx - total / 2;
        const y = trayY - 26 - r * 28;
        return row.map((it, i) => {
          const w = widthOf(it);
          const x0 = x;
          x += w + 4;
          return (
            <g key={`${r}-${i}`}>
              {it.kind === 'box' && <rect x={x0} y={y} width={w} height={24} rx={5} className="sc-box" />}
              {it.kind === 'bag' && <rect x={x0} y={y} width={w} height={24} rx={10} className="sc-bag" />}
              {it.kind === 'weight' && <path d={`M${x0 + 4} ${y} h${w - 8} l4 24 h-${w} z`} className="sc-weight" />}
              <text x={x0 + w / 2} y={y + 17} className="sc-label">
                {it.label}
              </text>
            </g>
          );
        });
      })}
      {floating.map((it, i) => {
        const w = widthOf(it);
        const bx = cx - ((floating.length - 1) * (w + 6)) / 2 + i * (w + 6);
        const by = trayY - 30 - rows.length * 28 - 22;
        return (
          <g key={`b${i}`}>
            <line x1={bx} y1={by + 14} x2={bx} y2={trayY} className="sc-string" />
            <ellipse cx={bx} cy={by} rx={w / 2} ry={14} className="sc-balloon" />
            <text x={bx} y={by + 5} className="sc-label">
              {it.label}
            </text>
          </g>
        );
      })}
      <path d={`M${cx - 58} ${trayY} h116 q-8 10 -20 10 h-76 q-12 0 -20 -10 z`} className="sc-tray" />
    </g>
  );
}

/** tilt: -1 kiri lebih berat, 0 seimbang, 1 kanan lebih berat */
export function BalanceScale({ eq, tilt = 0, caption = true }) {
  const angle = (tilt * 9 * Math.PI) / 180;
  const dx = ARM * Math.cos(angle);
  const dy = ARM * Math.sin(angle);
  const left = { x: PIVOT.x - dx, y: PIVOT.y - dy };
  const right = { x: PIVOT.x + dx, y: PIVOT.y + dy };
  let leftItems = [];
  let rightItems = [];
  try {
    leftItems = itemsOf(eq.left);
    rightItems = itemsOf(eq.right);
  } catch {
    /* timbangan kosong */
  }
  const label = tilt === 0 ? 'Seimbang' : tilt < 0 ? 'Miring: ruas kiri lebih berat' : 'Miring: ruas kanan lebih berat';
  return (
    <figure className={`scale ${tilt === 0 ? 'balanced' : 'tilted'}`}>
      <div className="scale-svg">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Timbangan. ${label}.`}>
          <rect x={PIVOT.x - 4} y={PIVOT.y} width={8} height={H - PIVOT.y - 14} className="sc-post" />
          <rect x={PIVOT.x - 46} y={H - 16} width={92} height={10} rx={5} className="sc-post" />
          <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} className="sc-beam" />
          <circle cx={PIVOT.x} cy={PIVOT.y} r={7} className="sc-pivot" />
          <Pan end={left} trayY={left.y + 120} items={leftItems} />
          <Pan end={right} trayY={right.y + 120} items={rightItems} />
        </svg>
      </div>
      {caption && <figcaption>{tilt === 0 ? '⚖️ Seimbang' : '⚠️ Miring! Kedua ruas tidak sama lagi.'}</figcaption>}
    </figure>
  );
}
