/**
 * Seasonal set pieces: the little December tree in the workshop and the Christmas stall on the village map.
 * Both are static drawings with one or two small CSS loops (a twinkling bauble, steam), switched off when `still`.
 */
import { inkStyle } from '../ink';
import './surprises.css';

const S = inkStyle(2.2);
const D = inkStyle(1.2);
const COBALT = '#3f5e8c';
const GINGER = '#b8733f';

/** A five-pointed star centred on (x, y). */
function star(x: number, y: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ') + ' Z';
}

/** One fir tier: a soft triangle with a scalloped hem, `w` half-width at the hem `y`, peak `h` above it. */
function tier(x: number, y: number, w: number, h: number): string {
  return `M${x - w} ${y} Q${x - w * 0.55} ${y - h * 0.55} ${x - 3} ${y - h} Q${x} ${y - h - 2} ${x + 3} ${y - h} Q${x + w * 0.55} ${y - h * 0.55} ${x + w} ${y}`
    + ` Q${x + w * 0.66} ${y + 5} ${x + w / 3} ${y + 1} Q${x} ${y + 6} ${x - w / 3} ${y + 1} Q${x - w * 0.66} ${y + 5} ${x - w} ${y} Z`;
}

/** A hand-made ceramic bauble hanging at (x, y): glaze colour, a painted band, a glint. */
function Bauble({ x, y, fill, band, twinkle }: { x: number; y: number; fill: string; band: string; twinkle?: boolean }) {
  return (
    <g class={twinkle ? 'bauble twinkle' : 'bauble'}>
      {twinkle && <circle class="bauble-glow" cx={x} cy={y} r="9" fill="url(#glow)" />}
      <rect x={x - 1.6} y={y - 6.6} width="3.2" height="2.4" fill="var(--woodDark)" />
      <circle cx={x} cy={y} r="4.6" fill={fill} style={inkStyle(1.3)} />
      <path d={`M${x - 4.2} ${y + 0.6} q4.2 2.2 8.4 0`} fill="none" stroke={band} stroke-width="1.4" stroke-linecap="round" />
      <circle cx={x - 1.6} cy={y - 1.8} r="1.1" fill="#fff" opacity="0.9" />
    </g>
  );
}

/** A paper chain draped along a curve: links alternating in two glaze colours. */
function PaperChain({ d, a, b }: { d: string; a: string; b: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke="var(--line)" stroke-width="4.2" stroke-linecap="round" opacity="0.55" />
      <path d={d} fill="none" stroke={a} stroke-width="3" stroke-dasharray="4 4" />
      <path d={d} fill="none" stroke={b} stroke-width="3" stroke-dasharray="4 4" stroke-dashoffset="4" />
    </g>
  );
}

/**
 * The little December tree at (x, y) (bottom centre of the pot): a fir in a clay pot, a star, paper chains in glaze colours,
 * ceramic baubles, one slowly twinkling. Stays inside `TREE_BOXES`: 64 wide up to 80 above the floor, 40 wide above that, 128 tall.
 */
export function ChristmasTree({ x, y, still }: { x: number; y: number; still: boolean }) {
  return (
    <g class={`xmas-tree${still ? ' still' : ''}`} data-tree>
      <ellipse cx={x} cy={y + 1} rx="30" ry="4" fill="url(#hatch)" opacity="0.5" />
      {/* trunk and the clay pot with a stamped heart */}
      <path d={`M${x - 4} ${y - 36} L${x + 4} ${y - 36} L${x + 4} ${y - 26} L${x - 4} ${y - 26} Z`} fill="var(--woodDark)" style={D} />
      <path d={`M${x - 16} ${y - 25} L${x + 16} ${y - 25} L${x + 12} ${y} L${x - 12} ${y} Z`} fill="var(--clay)" style={S} />
      <path d={`M${x - 19} ${y - 31} L${x + 19} ${y - 31} L${x + 19} ${y - 24} L${x - 19} ${y - 24} Z`} fill="var(--clay)" style={S} />
      <path d={`M${x} ${y - 7} c-6 -4 -5 -10 0 -8 c5 -2 6 4 0 8 Z`} fill="var(--g3)" style={inkStyle(1)} />
      {/* three tiers of fir */}
      <path d={tier(x, y - 36, 30, 40)} fill="var(--g2)" style={S} />
      <path d={tier(x, y - 62, 24, 36)} fill="var(--g2)" style={S} />
      <path d={tier(x, y - 86, 16, 30)} fill="var(--g2)" style={S} />
      <path d={`M${x - 18} ${y - 44} q4 -4 8 -2 M${x + 8} ${y - 48} q5 -3 9 0 M${x - 12} ${y - 72} q4 -3 7 -1 M${x + 4} ${y - 96} q4 -3 7 0`} fill="none" stroke="var(--g2Dark)" stroke-width="1.6" stroke-linecap="round" />
      {/* paper chains */}
      <PaperChain d={`M${x - 24} ${y - 52} Q${x} ${y - 38} ${x + 22} ${y - 56}`} a="var(--g3)" b="var(--sun)" />
      <PaperChain d={`M${x - 15} ${y - 80} Q${x + 2} ${y - 68} ${x + 16} ${y - 82}`} a="var(--g1)" b="#fbf8f2" />
      {/* ceramic baubles; the cobalt-banded porcelain one twinkles */}
      <Bauble x={x - 17} y={y - 40} fill="var(--g1)" band="#fbf8f2" />
      <Bauble x={x + 17} y={y - 42} fill="var(--g5)" band="var(--g3)" />
      <Bauble x={x - 3} y={y - 62} fill="#fbf8f2" band={COBALT} twinkle />
      <Bauble x={x + 10} y={y - 88} fill="var(--g4)" band="var(--sun)" />
      <Bauble x={x - 9} y={y - 96} fill="var(--g3)" band="#fbf8f2" />
      {/* the star */}
      <path d={star(x, y - 119, 9)} fill="var(--sun)" style={inkStyle(1.5)} />
      <circle cx={x - 2.4} cy={y - 121} r="1.2" fill="#fff" />
    </g>
  );
}

/** A gingerbread heart with white icing, centred on (x, y). */
function Gingerbread({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const h = (k: number) => `M${x} ${y + 7 * k} C${x - 10 * k} ${y} ${x - 8 * k} ${y - 9 * k} ${x} ${y - 4 * k} C${x + 8 * k} ${y - 9 * k} ${x + 10 * k} ${y} ${x} ${y + 7 * k} Z`;
  return (
    <g>
      <path d={h(s)} fill={GINGER} style={inkStyle(1.3)} />
      <path d={h(s * 0.66)} fill="none" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 1.6" />
      <circle cx={x - 2 * s} cy={y - 1 * s} r={0.9 * s} fill="var(--g3)" />
      <circle cx={x + 2 * s} cy={y - 1 * s} r={0.9 * s} fill="var(--g1)" />
    </g>
  );
}

/**
 * The village Christmas stall at (x, y) (bottom centre): a striped roof with snow and a star, a fir garland on the counter,
 * a steaming pot of punch and gingerbread hearts. Static, no click. Stays inside `xmasStallRect` (100 wide, 112 tall).
 */
export function ChristmasStall({ x, y }: { x: number; y: number }) {
  const stripes = [0, 1, 2, 3, 4, 5];
  const seg = (i: number) => x - 50 + i * (100 / 6);
  return (
    <g class="xmas-stall" data-xmas-stall>
      <ellipse cx={x} cy={y + 1} rx="50" ry="3.4" fill="url(#hatch)" opacity="0.45" />
      {/* posts */}
      <path d={`M${x - 42} ${y - 34} L${x - 42} ${y - 84} M${x + 42} ${y - 34} L${x + 42} ${y - 84}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x - 42} ${y - 34} L${x - 42} ${y - 84} M${x + 42} ${y - 34} L${x + 42} ${y - 84}`} fill="none" style={D} />
      {/* gingerbread hearts hanging under the awning */}
      {[[-28, -62], [-12, -58]].map(([dx, dy]) => (
        <g>
          <path d={`M${x + dx} ${y - 76} L${x + dx} ${y + dy - 5}`} stroke="var(--line)" stroke-width="1" opacity="0.7" />
          <Gingerbread x={x + dx} y={y + dy} />
        </g>
      ))}
      {/* the counter */}
      <path d={`M${x - 46} ${y} L${x - 46} ${y - 34} L${x + 46} ${y - 34} L${x + 46} ${y} Z`} fill="var(--wood)" style={S} />
      <path d={`M${x - 46} ${y - 12} L${x + 46} ${y - 12}`} fill="none" style={{ ...D, opacity: 0.5 }} />
      <path d={`M${x - 50} ${y - 39} L${x + 50} ${y - 39} L${x + 50} ${y - 33} L${x - 50} ${y - 33} Z`} fill="var(--woodDark)" style={D} />
      {/* fir garland with red berries across the counter front */}
      <path d={`M${x - 46} ${y - 30} Q${x - 23} ${y - 14} ${x} ${y - 28} Q${x + 23} ${y - 14} ${x + 46} ${y - 30}`} fill="none" stroke="var(--g2Dark)" stroke-width="7" stroke-linecap="round" />
      <path d={`M${x - 46} ${y - 30} Q${x - 23} ${y - 14} ${x} ${y - 28} Q${x + 23} ${y - 14} ${x + 46} ${y - 30}`} fill="none" stroke="var(--g2)" stroke-width="4" stroke-linecap="round" stroke-dasharray="3 3" />
      {[[-34, -24], [-18, -21], [-6, -26], [10, -24], [26, -21], [38, -26]].map(([dx, dy], i) => <circle cx={x + dx} cy={y + dy} r="2.2" fill={i % 2 ? 'var(--g3)' : 'var(--sun)'} style={inkStyle(0.8)} />)}
      {/* a plate of gingerbread hearts on the counter */}
      <ellipse cx={x - 22} cy={y - 40} rx="14" ry="3.2" fill="#fbf8f2" style={D} />
      <Gingerbread x={x - 27} y={y - 45} s={0.7} />
      <Gingerbread x={x - 17} y={y - 46} s={0.7} />
      {/* the steaming pot */}
      <path d={`M${x + 10} ${y - 54} L${x + 34} ${y - 54} Q${x + 36} ${y - 40} ${x + 28} ${y - 39} L${x + 16} ${y - 39} Q${x + 8} ${y - 40} ${x + 10} ${y - 54} Z`} fill="var(--kiln)" style={inkStyle(1.6)} />
      <path d={`M${x + 8} ${y - 55} L${x + 36} ${y - 55}`} style={inkStyle(2)} />
      <path d={`M${x + 10} ${y - 49} q-5 1 -4 5 M${x + 34} ${y - 49} q5 1 4 5`} fill="none" style={inkStyle(1.4)} />
      <path d={`M${x + 16} ${y - 47} q6 3 12 0`} fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0.8" />
      <g class="xmas-steam">
        {[[17, -1], [27, 1]].map(([dx, k]) => {
          const d = `M${x + dx} ${y - 59} q${-3 * k} -4 0 -7 q${3 * k} -3 0 -6`;
          return <g><path d={d} fill="none" stroke="var(--line)" stroke-width="3.6" stroke-linecap="round" opacity="0.3" /><path d={d} fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" /></g>;
        })}
      </g>
      {/* striped roof */}
      {stripes.map((i) => <path d={`M${x} ${y - 103} L${seg(i)} ${y - 84} L${seg(i + 1)} ${y - 84} Z`} fill={i % 2 ? '#fffaf0' : 'var(--g3)'} />)}
      <path d={`M${x - 54} ${y - 83} L${x} ${y - 104} L${x + 54} ${y - 83} Z`} fill="none" style={S} />
      {/* scalloped valance */}
      {stripes.map((i) => <path d={`M${seg(i)} ${y - 84} L${seg(i + 1)} ${y - 84} L${seg(i + 1)} ${y - 79} Q${(seg(i) + seg(i + 1)) / 2} ${y - 70} ${seg(i)} ${y - 79} Z`} fill={i % 2 ? '#fffaf0' : 'var(--g3)'} style={inkStyle(1.4)} />)}
      {/* snow on the roof */}
      <path d={`M${x - 46} ${y - 86} L${x} ${y - 104} L${x + 46} ${y - 86} Q${x + 40} ${y - 84} ${x + 34} ${y - 89} Q${x + 26} ${y - 87} ${x + 20} ${y - 94} Q${x + 10} ${y - 92} ${x} ${y - 98} Q${x - 8} ${y - 91} ${x - 18} ${y - 95} Q${x - 26} ${y - 86} ${x - 34} ${y - 90} Q${x - 40} ${y - 84} ${x - 46} ${y - 86} Z`} fill="#fbfdff" style={inkStyle(1.2)} />
      {/* star on top */}
      <path d={star(x, y - 104, 7)} fill="var(--sun)" style={inkStyle(1.4)} />
    </g>
  );
}
