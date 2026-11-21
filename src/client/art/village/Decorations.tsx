import { memo } from 'preact/compat';
import { decorationsFor } from '../../../shared/village/level';
import { inkStyle } from '../ink';

const S = inkStyle(2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const FLOWERS = ['var(--g3)', 'var(--sun)', 'var(--g4)', '#fffaf0', 'var(--kiln)'];

function FlowerBed({ x, y, seed }: { x: number; y: number; seed: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="40" ry="13" fill="var(--woodDark)" style={S} />
      <ellipse cx={x} cy={y - 2} rx="34" ry="9" fill="#7a5236" />
      {Array.from({ length: 9 }, (_, i) => {
        const fx = x - 28 + i * 7, fy = y - 6 - ((i * 5 + seed) % 3) * 3;
        return (
          <g>
            <path d={`M${fx} ${fy + 6} l0 -6`} stroke="var(--g2Dark)" stroke-width="2" />
            <circle cx={fx} cy={fy - 2} r="4" fill={FLOWERS[(i + seed) % FLOWERS.length]} style={inkStyle(1)} />
            <circle cx={fx} cy={fy - 2} r="1.3" fill="var(--sun)" />
          </g>
        );
      })}
    </g>
  );
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x} ${y - 62} q0 -8 10 -8`} fill="none" stroke="var(--line)" stroke-width="3" stroke-linecap="round" />
      <path d={`M${x - 6} ${y} L${x + 6} ${y}`} style={inkStyle(3)} />
      <circle class="lantern-glow" cx={x + 10} cy={y - 52} r="11" fill="var(--sun)" opacity="0.35" />
      <path d={`M${x + 4} ${y - 60} L${x + 16} ${y - 60} L${x + 14} ${y - 46} L${x + 6} ${y - 46} Z`} fill="var(--fireCore)" style={inkStyle(1.5)} />
      <path d={`M${x + 3} ${y - 60} L${x + 10} ${y - 66} L${x + 17} ${y - 60} Z`} fill="var(--line)" />
    </g>
  );
}

function Maypole({ x, y }: { x: number; y: number }) {
  const top = y - 170;
  return (
    <g>
      <ellipse cx={x} cy={y + 2} rx="26" ry="7" fill="url(#hatch)" opacity="0.4" />
      <path d={`M${x - 4} ${y} L${x - 2} ${top} L${x + 2} ${top} L${x + 4} ${y} Z`} fill="#fffaf0" style={S} />
      {Array.from({ length: 7 }, (_, i) => <path d={`M${x - 3} ${y - 14 - i * 20} l6 -8`} stroke="var(--g1)" stroke-width="2.4" />)}
      {/* wreath and ribbons */}
      {['var(--g3)', 'var(--sun)', 'var(--g1)', 'var(--g2)'].map((c, i) => <path class="ribbon" d={`M${x} ${top + 20} Q${x - 30 + i * 20} ${top + 50} ${x - 34 + i * 22} ${top + 74}`} fill="none" stroke={c} stroke-width="3" stroke-linecap="round" />)}
      <ellipse cx={x} cy={top + 20} rx="20" ry="6" fill="var(--g2)" style={S} />
      {[-14, -5, 5, 14].map((dx, i) => <circle cx={x + dx} cy={top + 18 + (i % 2) * 3} r="2.6" fill={FLOWERS[i]} />)}
      <path d={`M${x - 14} ${top + 4} Q${x} ${top - 30} ${x + 14} ${top + 4} Z`} fill="var(--g2)" style={inkStyle(1.6)} />
      <path class="flag" d={`M${x} ${top - 18} L${x} ${top - 34} L${x + 18} ${top - 28} L${x} ${top - 22}`} fill="var(--g3)" style={inkStyle(1.3)} />
    </g>
  );
}

function Bunting({ x1, y1, x2, y2, sag }: { x1: number; y1: number; x2: number; y2: number; sag: number }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  const n = 11;
  return (
    <g>
      <path d={`M${x1} ${y1} Q${mx} ${my + sag} ${x2} ${y2}`} fill="none" style={inkStyle(1.4)} />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const px = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * mx + t * t * x2;
        const py = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (my + sag) + t * t * y2;
        return <path d={`M${px - 7} ${py} L${px + 7} ${py} L${px} ${py + 13} Z`} fill={FLOWERS[i % 4 === 3 ? 4 : i % 4]} style={inkStyle(1.2)} />;
      })}
    </g>
  );
}

function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 3} rx="30" ry="5" fill="url(#hatch)" opacity="0.4" />
      <path d={`M${x - 22} ${y} L${x - 22} ${y - 12} M${x + 22} ${y} L${x + 22} ${y - 12}`} stroke="var(--woodDark)" stroke-width="4" stroke-linecap="round" />
      <path d={`M${x - 28} ${y - 12} L${x + 28} ${y - 12} L${x + 28} ${y - 17} L${x - 28} ${y - 17} Z`} fill="var(--wood)" style={inkStyle(1.6)} />
      <path d={`M${x - 26} ${y - 22} L${x + 26} ${y - 22} L${x + 26} ${y - 30} L${x - 26} ${y - 30} Z`} fill="var(--wood)" style={inkStyle(1.6)} />
      <path d={`M${x - 20} ${y - 17} L${x - 20} ${y - 22} M${x + 20} ${y - 17} L${x + 20} ${y - 22}`} style={inkStyle(1.6)} />
    </g>
  );
}

function RoseArch({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 34} ${y} L${x - 34} ${y - 56} Q${x - 34} ${y - 90} ${x} ${y - 90} Q${x + 34} ${y - 90} ${x + 34} ${y - 56} L${x + 34} ${y}`} fill="none" stroke="var(--line)" stroke-width="8" stroke-linecap="round" />
      <path d={`M${x - 34} ${y} L${x - 34} ${y - 56} Q${x - 34} ${y - 90} ${x} ${y - 90} Q${x + 34} ${y - 90} ${x + 34} ${y - 56} L${x + 34} ${y}`} fill="none" stroke="#fffaf0" stroke-width="4" stroke-linecap="round" />
      {Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI - (i / 12) * Math.PI;
        const onArch = i >= 3 && i <= 9;
        const px = onArch ? x + Math.cos(a) * 34 : x + (i < 3 ? -34 : 34);
        const py = onArch ? y - 56 - Math.sin(a) * 34 : y - 14 - (i < 3 ? i : 12 - i) * 16;
        return (
          <g>
            <ellipse cx={px - 5} cy={py + 4} rx="6" ry="3.5" fill="var(--g2)" style={inkStyle(1)} transform={`rotate(-30 ${px - 5} ${py + 4})`} />
            <circle cx={px} cy={py} r="5" fill={i % 3 === 1 ? '#fffaf0' : 'var(--g3)'} style={inkStyle(1.2)} />
            <path d={`M${px - 2} ${py} q2 -2 4 0`} fill="none" style={T} />
          </g>
        );
      })}
    </g>
  );
}

/** Small things around the village square, one more every 5 village levels. */
function Decorations({ level }: { level: number }) {
  const on = new Set(decorationsFor(level));
  return (
    <g class="level-decorations">
      {on.has('blumenbeete') && <g data-decoration="blumenbeete"><FlowerBed x={615} y={410} seed={0} /><FlowerBed x={850} y={556} seed={2} /></g>}
      {on.has('laternen') && <g data-decoration="laternen">{[[520, 500], [630, 590], [770, 590], [900, 450]].map(([x, y]) => <Lantern x={x} y={y} />)}</g>}
      {on.has('maibaum') && <g data-decoration="maibaum"><Maypole x={556} y={520} /></g>}
      {on.has('wimpel') && <g data-decoration="wimpel"><Bunting x1={556} y1={360} x2={830} y2={368} sag={18} /></g>}
      {on.has('baenke') && <g data-decoration="baenke"><Bench x={650} y={535} /><Bench x={752} y={535} /></g>}
      {on.has('rosenbogen') && <g data-decoration="rosenbogen"><RoseArch x={700} y={640} /></g>}
    </g>
  );
}

/** Depends only on the level, so it is skipped on clock ticks. */
export const LevelDecorations = memo(Decorations);
