/**
 * The workshop cat, a round orange loaf facing left. (x, y) is the bottom centre of the loaf.
 * `sleep` and `awake` are the cat as it has always been; `purr` and `swat` are its reactions to petting.
 * Away from home: `kiln` curls up asleep (x, y = bottom centre of the curl), `pot` peeks out of a fresh pot (x, y = the pot's foot),
 * `gift` sits proudly (a loaf without its yarn ball), `shelf` faces right and paws at a pot over the edge.
 */
import { inkStyle } from '../ink';
import { CAT_HIT } from '../../surprises/spots';
import { GIFT_NAMES } from '../../surprises/texts';
import './surprises.css';

export type CatPose = 'sleep' | 'awake' | 'purr' | 'swat' | 'kiln' | 'pot' | 'gift' | 'shelf';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const D = inkStyle(1.2);

/** A small heart centred on (cx, cy). */
const heart = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy + r * 0.9} C${cx - r * 1.5} ${cy - r * 0.1} ${cx - r * 0.8} ${cy - r * 1.3} ${cx} ${cy - r * 0.45} C${cx + r * 0.8} ${cy - r * 1.3} ${cx + r * 1.5} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;

function Ears({ x, y, back }: { x: number; y: number; back: boolean }) {
  return back ? (
    // flattened "airplane" ears: offended, not scary
    <g>
      <path d={`M${x - 42} ${y - 30} L${x - 60} ${y - 42} L${x - 36} ${y - 44} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 14} ${y - 44} L${x + 6} ${y - 54} L${x - 1} ${y - 38} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 44} ${y - 35} L${x - 53} ${y - 41} L${x - 40} ${y - 41} Z`} fill="var(--cheek)" />
    </g>
  ) : (
    <g>
      <path d={`M${x - 42} ${y - 27} L${x - 45} ${y - 52} L${x - 27} ${y - 40} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 17} ${y - 42} L${x - 10} ${y - 62} L${x - 2} ${y - 40} Z`} fill="var(--cat)" style={S} />
      <path d={`M${x - 41} ${y - 34} L${x - 42} ${y - 45} L${x - 33} ${y - 38} Z`} fill="var(--cheek)" />
    </g>
  );
}

function Eyes({ x, y, pose }: { x: number; y: number; pose: CatPose }) {
  if (pose === 'sleep') return <path d={`M${x - 37} ${y - 20} q5 4 10 0 M${x - 22} ${y - 22} q5 4 10 0`} stroke="var(--line)" stroke-width="2.2" fill="none" stroke-linecap="round" />;
  // happy closed eyes: little upward arcs
  if (pose === 'purr' || pose === 'gift') return <path d={`M${x - 37} ${y - 19} q5 -6 10 0 M${x - 22} ${y - 21} q5 -6 10 0`} stroke="var(--line)" stroke-width="2.4" fill="none" stroke-linecap="round" />;
  // peering down over the edge after the pot
  if (pose === 'shelf') return <g><circle cx={x - 33} cy={y - 18} r="3.4" fill="var(--line)" /><circle cx={x - 18} cy={y - 20} r="3.4" fill="var(--line)" /><circle cx={x - 32} cy={y - 19.4} r="1" fill="#fff" /><circle cx={x - 17} cy={y - 21.4} r="1" fill="#fff" /></g>;
  if (pose === 'swat') {
    // half-lidded, a sulky look sideways
    return (
      <g>
        <path d={`M${x - 36} ${y - 22} a4 4 0 0 0 8 0 Z M${x - 21} ${y - 24} a4 4 0 0 0 8 0 Z`} fill="var(--line)" />
        <path d={`M${x - 37} ${y - 23} L${x - 27} ${y - 21} M${x - 22} ${y - 25} L${x - 12} ${y - 24}`} stroke="var(--line)" stroke-width="2.2" fill="none" stroke-linecap="round" />
      </g>
    );
  }
  return <g><circle cx={x - 32} cy={y - 21} r="3" fill="var(--line)" /><circle cx={x - 17} cy={y - 23} r="3" fill="var(--line)" /></g>;
}

function Tail({ x, y, pose }: { x: number; y: number; pose: CatPose }) {
  if (pose === 'purr') {
    // curled into a happy little spiral
    return <path class="cat-tail" d={`M${x + 44} ${y - 5} Q${x + 72} ${y - 4} ${x + 68} ${y - 28} Q${x + 64} ${y - 42} ${x + 53} ${y - 36} Q${x + 46} ${y - 30} ${x + 54} ${y - 24}`} fill="none" style={{ ...S, transformOrigin: `${x + 44}px ${y - 5}px` }} />;
  }
  if (pose === 'swat') {
    // puffed up like a bottle brush
    return (
      <g class="cat-tail-puff">
        <path d={`M${x + 40} ${y - 4} Q${x + 52} ${y - 14} ${x + 52} ${y - 30} Q${x + 46} ${y - 38} ${x + 53} ${y - 44} Q${x + 50} ${y - 56} ${x + 61} ${y - 58} Q${x + 63} ${y - 70} ${x + 74} ${y - 66} Q${x + 84} ${y - 70} ${x + 86} ${y - 58} Q${x + 96} ${y - 52} ${x + 89} ${y - 43} Q${x + 95} ${y - 33} ${x + 85} ${y - 28} Q${x + 80} ${y - 8} ${x + 46} ${y + 3} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x + 66} ${y - 50} q4 6 2 13 M${x + 76} ${y - 54} q3 5 1 11`} fill="none" style={T} />
      </g>
    );
  }
  if (pose === 'gift') {
    // held high like a flag: proud
    return <path class="cat-tail" d={`M${x + 42} ${y - 10} Q${x + 64} ${y - 20} ${x + 60} ${y - 52} Q${x + 58} ${y - 72} ${x + 70} ${y - 76}`} fill="none" style={{ ...S, transformOrigin: `${x + 42}px ${y - 10}px` }} />;
  }
  return <path class="cat-tail" d={`M${x + 44} ${y - 5} Q${x + 76} ${y - 2} ${x + 69} ${y - 30} Q${x + 64} ${y - 40} ${x + 57} ${y - 32}`} fill="none" style={{ ...S, transformOrigin: `${x + 44}px ${y - 5}px` }} />;
}

/** One front paw raised mid-swipe, toe beans out, with two swish lines. */
function SwatPaw({ x, y }: { x: number; y: number }) {
  const px = x - 66, py = y - 38;
  return (
    <g class="swat-paw" style={{ transformOrigin: `${x - 38}px ${y - 2}px` }}>
      <path d={`M${x - 38} ${y - 2} Q${x - 56} ${y - 10} ${px + 2} ${py + 6}`} fill="none" stroke="var(--line)" stroke-width="16.4" stroke-linecap="round" />
      <path d={`M${x - 38} ${y - 2} Q${x - 56} ${y - 10} ${px + 2} ${py + 6}`} fill="none" stroke="var(--cat)" stroke-width="12" stroke-linecap="round" />
      <ellipse cx={px} cy={py} rx="10" ry="9" fill="var(--cat)" style={S} />
      <ellipse cx={px - 1} cy={py + 2} rx="3.6" ry="3" fill="var(--cheek)" />
      {[[-6, -4], [-1, -6.5], [4, -4]].map(([dx, dy]) => <circle cx={px - 1 + dx!} cy={py + dy!} r="1.7" fill="var(--cheek)" />)}
      <path d={`M${px - 16} ${py - 16} q-9 10 -5 24 M${px - 24} ${py - 8} q-5 7 -3 15`} fill="none" stroke="var(--line)" stroke-width="2" stroke-linecap="round" opacity="0.6" />
    </g>
  );
}

/** A little puff with a "!": offended. */
function Huff({ x, y }: { x: number; y: number }) {
  const cx = x - 62, cy = y - 78;
  return (
    <g class="cat-huff">
      <path d={`M${cx - 12} ${cy + 8} Q${cx - 20} ${cy + 2} ${cx - 13} ${cy - 6} Q${cx - 12} ${cy - 16} ${cx - 2} ${cy - 14} Q${cx + 6} ${cy - 20} ${cx + 12} ${cy - 11} Q${cx + 21} ${cy - 6} ${cx + 15} ${cy + 3} Q${cx + 16} ${cy + 13} ${cx + 5} ${cy + 12} Q${cx - 4} ${cy + 17} ${cx - 12} ${cy + 8} Z`} fill="var(--paper)" style={inkStyle(1.6)} />
      <path d={`M${cx + 1} ${cy - 9} L${cx} ${cy + 3}`} stroke="var(--kiln)" stroke-width="3.4" stroke-linecap="round" />
      <circle cx={cx} cy={cy + 8.5} r="2" fill="var(--kiln)" />
    </g>
  );
}

/** Three small hearts drifting up from the purring head. Their resting positions are the still pose. */
function Hearts({ x, y }: { x: number; y: number }) {
  return (
    <g class="hearts">
      {([[-46, -72, 6.5], [-22, -82, 5], [-52, -96, 4]] as const).map(([dx, dy, r], i) => (
        <g style={{ animationDelay: `${i * 0.5}s` }}><path d={heart(x + dx, y + dy, r)} fill="var(--cheek)" style={D} /></g>
      ))}
    </g>
  );
}

/** A front paw stretched forward over the edge (the shelf nudge). */
function ReachPaw({ x, y }: { x: number; y: number }) {
  const d = `M${x - 34} ${y - 2} Q${x - 52} ${y - 8} ${x - 64} ${y - 4}`;
  return (
    <g class="reach-paw" style={{ transformOrigin: `${x - 34}px ${y - 2}px` }}>
      <path d={d} fill="none" stroke="var(--line)" stroke-width="14.4" stroke-linecap="round" />
      <path d={d} fill="none" stroke="var(--cat)" stroke-width="10" stroke-linecap="round" />
      <ellipse cx={x - 68} cy={y - 4} rx="8" ry="7" fill="var(--cat)" style={S} />
      <path d={`M${x - 72} ${y - 8} l0 5 M${x - 67} ${y - 10} l0 5`} fill="none" style={T} />
    </g>
  );
}

/** Curled up asleep in a warm round ball, nose tucked into the tail. (x, y) is the bottom centre. */
function CurledCat({ x, y }: { x: number; y: number }) {
  const hx = x - 22, hy = y - 22;
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx="40" ry="5" fill="url(#hatch)" opacity="0.45" />
      <g class="cat-body" style={{ transformOrigin: `${x}px ${y}px` }}>
        <path d={`M${x - 38} ${y} Q${x - 44} ${y - 30} ${x - 6} ${y - 36} Q${x + 36} ${y - 38} ${x + 40} ${y - 12} Q${x + 42} ${y + 2} ${x + 8} ${y + 2} Q${x - 30} ${y + 3} ${x - 38} ${y} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x + 2} ${y - 33} q5 8 1 16 M${x + 16} ${y - 32} q5 8 1 15 M${x + 28} ${y - 26} q3 6 0 12`} fill="none" style={T} />
      </g>
      {/* head resting on the front, ears soft */}
      <path d={`M${hx - 16} ${hy - 4} L${hx - 18} ${hy - 22} L${hx - 4} ${hy - 13} Z`} fill="var(--cat)" style={S} />
      <path d={`M${hx + 4} ${hy - 14} L${hx + 14} ${hy - 26} L${hx + 15} ${hy - 9} Z`} fill="var(--cat)" style={S} />
      <path d={`M${hx - 15} ${hy - 9} L${hx - 16} ${hy - 18} L${hx - 8} ${hy - 13} Z`} fill="var(--cheek)" />
      <ellipse cx={hx} cy={hy} rx="20" ry="16" fill="var(--cat)" style={S} />
      <path d={`M${hx - 12} ${hy - 1} q4 3.5 8 0 M${hx + 2} ${hy - 2} q4 3.5 8 0`} stroke="var(--line)" stroke-width="2.2" fill="none" stroke-linecap="round" />
      <path d={`M${hx - 3} ${hy + 5} l-2 2 l-2 -2`} stroke="var(--line)" stroke-width="1.5" fill="none" />
      <ellipse cx={hx - 13} cy={hy + 6} rx="3.4" ry="2" fill="var(--cheek)" opacity="0.9" />
      <ellipse cx={hx + 9} cy={hy + 5} rx="3.4" ry="2" fill="var(--cheek)" opacity="0.8" />
      {/* the tail wraps round the front, its tip under the chin */}
      <path d={`M${x + 38} ${y - 6} Q${x + 30} ${y + 6} ${x} ${y + 3} Q${x - 20} ${y + 2} ${hx - 6} ${hy + 15}`} fill="none" stroke="var(--line)" stroke-width="13.4" stroke-linecap="round" />
      <path d={`M${x + 38} ${y - 6} Q${x + 30} ${y + 6} ${x} ${y + 3} Q${x - 20} ${y + 2} ${hx - 6} ${hy + 15}`} fill="none" stroke="var(--cat)" stroke-width="9" stroke-linecap="round" />
      <g class="zzz" font-family="var(--font-hand)" fill="var(--line)">
        <text x={x + 14} y={y - 46} font-size="17" opacity="0.7">z</text>
        <text x={x + 26} y={y - 60} font-size="13" opacity="0.55">z</text>
      </g>
    </g>
  );
}

/** Only head, ears and front paws peek out of a fresh grey-clay pot. (x, y) is the pot's foot. */
function PotCat({ x, y }: { x: number; y: number }) {
  const rim = y - 64, hy = rim - 14;
  const clay = '#bdb5a9', clayDark = '#9f978b';
  return (
    <g>
      {/* the pot's opening behind the cat */}
      <ellipse cx={x} cy={rim} rx="40" ry="9" fill={clayDark} style={S} />
      <g class="pot-peek" style={{ transformOrigin: `${x}px ${rim}px` }}>
        <path d={`M${x - 24} ${hy - 6} L${x - 26} ${hy - 32} L${x - 8} ${hy - 20} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x + 8} ${hy - 20} L${x + 26} ${hy - 32} L${x + 24} ${hy - 6} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x - 22} ${hy - 12} L${x - 23} ${hy - 26} L${x - 12} ${hy - 19} Z M${x + 12} ${hy - 19} L${x + 23} ${hy - 26} L${x + 22} ${hy - 12} Z`} fill="var(--cheek)" />
        <ellipse cx={x} cy={hy} rx="27" ry="23" fill="var(--cat)" style={S} />
        <path d={`M${x - 6} ${hy - 22} q2 6 0 10 M${x + 6} ${hy - 22} q-2 6 0 10`} fill="none" style={T} />
        {/* big round eyes with a shine */}
        <circle cx={x - 10} cy={hy - 1} r="4.6" fill="var(--line)" />
        <circle cx={x + 10} cy={hy - 1} r="4.6" fill="var(--line)" />
        <circle cx={x - 8.6} cy={hy - 2.8} r="1.6" fill="#fff" />
        <circle cx={x + 11.4} cy={hy - 2.8} r="1.6" fill="#fff" />
        <path d={`M${x - 2.5} ${hy + 5} l2.5 2.5 l2.5 -2.5`} stroke="var(--line)" stroke-width="1.6" fill="none" />
        <path d={`M${x - 5} ${hy + 9} q2.5 3 5 0 q2.5 3 5 0`} stroke="var(--line)" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <ellipse cx={x - 17} cy={hy + 7} rx="4" ry="2.4" fill="var(--cheek)" />
        <ellipse cx={x + 17} cy={hy + 7} rx="4" ry="2.4" fill="var(--cheek)" />
        <path d={`M${x - 26} ${hy + 4} l-12 -2 M${x - 26} ${hy + 9} l-12 2 M${x + 26} ${hy + 4} l12 -2 M${x + 26} ${hy + 9} l12 2`} fill="none" style={T} />
      </g>
      {/* the pot's body in front: a fresh, still-wet grey pot */}
      <path d={`M${x - 40} ${rim} Q${x - 52} ${rim + 26} ${x - 34} ${y - 8} Q${x - 30} ${y} ${x - 24} ${y} L${x + 24} ${y} Q${x + 30} ${y} ${x + 34} ${y - 8} Q${x + 52} ${rim + 26} ${x + 40} ${rim} Q${x} ${rim + 12} ${x - 40} ${rim} Z`} fill={clay} style={S} />
      <path d={`M${x - 40} ${rim + 20} Q${x} ${rim + 30} ${x + 40} ${rim + 20} M${x - 36} ${rim + 38} Q${x} ${rim + 47} ${x + 36} ${rim + 38}`} fill="none" style={T} />
      <path d={`M${x - 30} ${rim + 10} q-6 14 -2 30`} fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.5" />
      {/* front paws hooked over the rim */}
      {[-13, 13].map((dx) => (
        <g>
          <ellipse cx={x + dx} cy={rim + 4} rx="9" ry="7" fill="var(--cat)" style={S} />
          <path d={`M${x + dx - 3} ${rim + 3} l0 5 M${x + dx + 3} ${rim + 3} l0 5`} fill="none" style={T} />
        </g>
      ))}
    </g>
  );
}

/** What the cat brought, lying on the floor at (x, y): 0 a button, 1 a feather, 2 a single striped sock. */
export function CatGift({ x, y, kind, still = false }: { x: number; y: number; kind: 0 | 1 | 2; still?: boolean }) {
  return (
    <g class={still ? 'cat-gift still' : 'cat-gift'} data-gift={kind} role="img" aria-label={GIFT_NAMES[kind]} pointer-events="none">
      <ellipse cx={x} cy={y + 2} rx="20" ry="3.5" fill="url(#hatch)" opacity="0.5" />
      {kind === 0 && (
        <g>
          <circle cx={x} cy={y - 9} r="11" fill="var(--g5)" style={S} />
          <circle cx={x} cy={y - 9} r="7.5" fill="none" style={T} />
          {[[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].map(([dx, dy]) => <circle cx={x + dx!} cy={y - 9 + dy!} r="1.5" fill="var(--line)" />)}
        </g>
      )}
      {kind === 1 && (
        <g transform={`rotate(-14 ${x} ${y})`}>
          <path d={`M${x - 20} ${y - 2} Q${x - 6} ${y - 20} ${x + 18} ${y - 14} Q${x + 6} ${y - 2} ${x - 20} ${y - 2} Z`} fill="var(--g1)" style={S} />
          <path d={`M${x - 24} ${y} L${x + 14} ${y - 13}`} fill="none" style={D} />
          <path d={`M${x - 6} ${y - 6} l4 -7 M${x + 2} ${y - 9} l4 -6 M${x - 2} ${y - 5} l5 2`} fill="none" style={T} />
        </g>
      )}
      {kind === 2 && <Sock x={x - 22} y={y - 5} lying />}
      <g class="gift-sparkle" fill="var(--sun)" style={inkStyle(1)}>
        <path d={`M${x + 18} ${y - 26} l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z`} />
        <path d={`M${x - 18} ${y - 22} l1.4 3.4 l3.4 1.4 l-3.4 1.4 l-1.4 3.4 l-1.4 -3.4 l-3.4 -1.4 l3.4 -1.4 Z`} />
      </g>
    </g>
  );
}

/** A single striped sock. Hanging (`lying` false): its cuff at (x, y), toe down to the right; lying: on the floor at (x, y). */
export function Sock({ x, y, lying = false }: { x: number; y: number; lying?: boolean }) {
  const body = `M${x - 7} ${y} L${x + 7} ${y} L${x + 8} ${y + 34} Q${x + 9} ${y + 40} ${x + 15} ${y + 41} L${x + 22} ${y + 42} Q${x + 30} ${y + 44} ${x + 28} ${y + 51} Q${x + 26} ${y + 56} ${x + 18} ${y + 55} L${x + 2} ${y + 53} Q${x - 8} ${y + 51} ${x - 7} ${y + 40} Z`;
  return (
    <g transform={lying ? `translate(${x} ${y}) scale(0.75) rotate(-90) translate(${-x} ${-y})` : undefined}>
      <path d={body} fill="#fbf8f2" style={S} />
      <path d={`M${x - 7} ${y + 11} L${x + 7} ${y + 11} L${x + 7} ${y + 17} L${x - 7} ${y + 17} Z M${x - 7} ${y + 25} L${x + 7.6} ${y + 25} L${x + 7.8} ${y + 31} L${x - 7} ${y + 31} Z`} fill="var(--g3)" />
      <path d={`M${x + 18} ${y + 42.4} Q${x + 30} ${y + 44} ${x + 28} ${y + 51} Q${x + 26} ${y + 56} ${x + 18} ${y + 55} Q${x + 16} ${y + 48} ${x + 18} ${y + 42.4} Z`} fill="var(--g1)" style={D} />
      <path d={`M${x - 8} ${y - 1} L${x + 8} ${y - 1} L${x + 8} ${y + 5} L${x - 8} ${y + 5} Z`} fill="var(--g1)" style={D} />
      <path d={body} fill="none" style={S} />
    </g>
  );
}

export function WorkshopCat({ x, y, pose, still = false }: { x: number; y: number; pose: CatPose; still?: boolean }) {
  const cls = still ? 'cat still' : 'cat';
  if (pose === 'kiln') return <g class={cls} data-cat-pose={pose} pointer-events="none"><CurledCat x={x} y={y} /></g>;
  if (pose === 'pot') return <g class={cls} data-cat-pose={pose} pointer-events="none"><PotCat x={x} y={y} /></g>;
  const away = pose === 'gift' || pose === 'shelf';
  return (
    <g class={cls} data-cat-pose={pose} pointer-events={away ? 'none' : undefined}>
      <g transform={pose === 'shelf' ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      <ellipse cx={x} cy={y + 7} rx="54" ry="8" fill="url(#hatch)" opacity="0.5" />
      {pose === 'swat' && <Tail x={x} y={y} pose={pose} />}
      <g class="cat-body" style={{ transformOrigin: `${x}px ${y}px` }}>
        <path d={`M${x - 50} ${y} Q${x - 55} ${y - 42} ${x - 8} ${y - 47} Q${x + 46} ${y - 47} ${x + 46} ${y - 8} Q${x + 46} ${y + 5} ${x} ${y + 5} Q${x - 46} ${y + 5} ${x - 50} ${y} Z`} fill="var(--cat)" style={S} />
        <path d={`M${x - 8} ${y - 42} q5 10 0 20 M${x + 10} ${y - 42} q5 10 0 20 M${x + 25} ${y - 37} q4 8 0 15`} fill="none" style={T} />
      </g>
      <Ears x={x} y={y} back={pose === 'swat'} />
      <Eyes x={x} y={y} pose={pose} />
      <path d={`M${x - 26} ${y - 14} l-2.5 2.5 l-2.5 -2.5`} stroke="var(--line)" stroke-width="1.6" fill="none" />
      {(pose === 'purr' || pose === 'gift') && <path d={`M${x - 33.5} ${y - 9} q2.5 3 5 0 q2.5 3 5 0`} stroke="var(--line)" stroke-width="1.5" fill="none" stroke-linecap="round" />}
      {pose === 'swat' && <path d={`M${x - 31} ${y - 7} l5 0`} stroke="var(--line)" stroke-width="1.5" fill="none" stroke-linecap="round" />}
      <ellipse cx={x - 40} cy={y - 11} rx="4" ry="2.4" fill="var(--cheek)" opacity={pose === 'purr' ? 1 : 0.8} />
      {pose === 'purr' && <ellipse cx={x - 11} cy={y - 14} rx="3.4" ry="2" fill="var(--cheek)" opacity="0.8" />}
      <path d={`M${x - 50} ${y - 12} l-12 -2 M${x - 50} ${y - 7} l-12 2`} fill="none" style={T} />
      {pose !== 'swat' && <Tail x={x} y={y} pose={pose} />}
      {pose !== 'swat' && <path d={`M${x - 32} ${y + 2} q5 5 12 0`} fill="var(--cat)" style={S} />}
      <path d={`M${x - 7} ${y + 2} q5 5 12 0`} fill="var(--cat)" style={S} />
      {pose === 'swat' && <SwatPaw x={x} y={y} />}
      {pose === 'swat' && <Huff x={x} y={y} />}
      {pose === 'purr' && <Hearts x={x} y={y} />}
      {pose === 'sleep' && (
        <g class="zzz" font-family="var(--font-hand)" fill="var(--line)">
          <text x={x + 24} y={y - 62} font-size="20" opacity="0.7">z</text>
          <text x={x + 38} y={y - 80} font-size="15" opacity="0.55">z</text>
          <text x={x + 48} y={y - 94} font-size="11" opacity="0.4">z</text>
        </g>
      )}
      {pose === 'shelf' && <ReachPaw x={x} y={y} />}
      {pose === 'gift' && <path d={`M${x - 30} ${y - 78} l2.4 6 l6 2.4 l-6 2.4 l-2.4 6 l-2.4 -6 l-6 -2.4 l6 -2.4 Z`} fill="var(--sun)" style={D} />}
      {!away && <circle cx={x + 84} cy={y} r="11" fill="var(--g1)" style={S} />}
      {!away && <path d={`M${x + 76} ${y - 5} q8 5 17 -2 M${x + 77} ${y + 5} q8 2 16 -5`} fill="none" style={T} />}
      </g>
    </g>
  );
}

/** The cat's own click target: a transparent ellipse above everything, at least 60×60. */
export function CatHit({ x, y, hit = CAT_HIT, onClick }: { x: number; y: number; hit?: { dx: number; dy: number; rx: number; ry: number }; onClick: () => void }) {
  return (
    <ellipse class="cat-hit" cx={x + hit.dx} cy={y + hit.dy} rx={hit.rx} ry={hit.ry} fill="transparent"
      data-hit="cat" role="button" aria-label="Katze" tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onClick(); } }} />
  );
}
