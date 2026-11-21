import { PROJECTS, ROMAN } from '../../../shared/village/projects';
import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const GOLD = '#e8b63a';
const GOLD_DARK = '#b8862a';
const STONE = '#ddd3c2';
const PORCELAIN = '#fbfaf6';
const COBALT = '#3d5fb5';

type Look = { x: number; y: number; level: number };

/** A tiny blue-and-white tile for porcelain trims. */
function BlueTile({ x, y, s = 12 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill={PORCELAIN} style={inkStyle(1)} />
      <path d={`M${x + s / 2} ${y + 2} L${x + s - 2} ${y + s / 2} L${x + s / 2} ${y + s - 2} L${x + 2} ${y + s / 2} Z`} fill={COBALT} opacity="0.85" />
    </g>
  );
}

function Flag({ x, y, c, h = 40 }: { x: number; y: number; c: string; h?: number }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x} ${y - h}`} style={inkStyle(2.2)} />
      <path class="flag" d={`M${x} ${y - h} L${x + 26} ${y - h + 7} L${x} ${y - h + 15} Z`} fill={c} style={inkStyle(1.5)} />
    </g>
  );
}

function Dorfbrunnen({ x, y, level }: Look) {
  const top = level >= 2 ? 78 : 62;
  return (
    <g>
      {/* basin: white wall with blue tiles, a stone rim, water */}
      <path d={`M${x - 82} ${y - 36} L${x - 82} ${y - 12} Q${x} ${y + 14} ${x + 82} ${y - 12} L${x + 82} ${y - 36} Z`} fill={PORCELAIN} style={S} />
      {Array.from({ length: 9 }, (_, i) => {
        const tx = x - 76 + i * 17;
        const sag = 10 * (1 - ((tx + 6 - x) / 82) ** 2);
        return <BlueTile x={tx} y={y - 30 + sag} s={12} />;
      })}
      <ellipse cx={x} cy={y - 36} rx="84" ry="19" fill={STONE} style={S} />
      <ellipse cx={x} cy={y - 37} rx="70" ry="13" fill="var(--sky)" style={inkStyle(1.6)} />
      <path d={`M${x - 50} ${y - 38} q8 -4 16 0 M${x + 24} ${y - 34} q8 -4 16 0`} fill="none" stroke="#fff" stroke-width="2" opacity="0.9" />
      {/* the column in the middle */}
      <path d={`M${x - 8} ${y - 36} L${x - 7} ${y - top} L${x + 7} ${y - top} L${x + 8} ${y - 36} Z`} fill={STONE} style={S} />
      <ellipse cx={x} cy={y - top} rx={level >= 2 ? 26 : 16} ry={level >= 2 ? 7 : 5} fill={PORCELAIN} style={inkStyle(1.8)} />
      {level === 1 && <path d={`M${x + 12} ${y - top + 2} Q${x + 24} ${y - top + 4} ${x + 26} ${y - 40}`} fill="none" stroke="var(--g1)" stroke-width="3" stroke-linecap="round" />}
      {level >= 2 && (
        <g class="jet">
          <path d={`M${x} ${y - top - 4} Q${x - 4} ${y - top - 44} ${x - 32} ${y - top - 2} M${x} ${y - top - 4} Q${x + 4} ${y - top - 44} ${x + 32} ${y - top - 2}`} fill="none" stroke="var(--g1)" stroke-width="4" stroke-linecap="round" />
          <path d={`M${x - 22} ${y - top + 4} Q${x - 30} ${y - 54} ${x - 40} ${y - 42} M${x + 22} ${y - top + 4} Q${x + 30} ${y - 54} ${x + 40} ${y - 42}`} fill="none" stroke="var(--sky)" stroke-width="3" stroke-linecap="round" />
          {[[-14, -38], [12, -44], [0, -30]].map(([dx, dy]) => <circle cx={x + dx} cy={y - top + dy} r="2.5" fill="var(--sky)" style={inkStyle(0.8)} />)}
        </g>
      )}
      {level >= 3 && (
        // a blue-and-white porcelain swan on the top bowl
        <g>
          <path d={`M${x - 20} ${y - top - 4} Q${x - 22} ${y - top - 22} ${x} ${y - top - 20} Q${x + 10} ${y - top - 18} ${x + 14} ${y - top - 8} Q${x + 8} ${y - top - 2} ${x - 20} ${y - top - 4} Z`} fill={PORCELAIN} style={inkStyle(1.8)} />
          <path d={`M${x + 8} ${y - top - 14} Q${x + 16} ${y - top - 30} ${x + 8} ${y - top - 40} Q${x + 2} ${y - top - 46} ${x - 4} ${y - top - 40}`} fill="none" stroke="var(--line)" stroke-width="7" stroke-linecap="round" />
          <path d={`M${x + 8} ${y - top - 14} Q${x + 16} ${y - top - 30} ${x + 8} ${y - top - 40} Q${x + 2} ${y - top - 46} ${x - 4} ${y - top - 40}`} fill="none" stroke={PORCELAIN} stroke-width="3.6" stroke-linecap="round" />
          <path d={`M${x - 5} ${y - top - 41} l-7 2 l6 2 Z`} fill="var(--g5)" style={inkStyle(1)} />
          <circle cx={x + 1} cy={y - top - 42} r="1.3" fill="var(--line)" />
          <path d={`M${x - 14} ${y - top - 10} q6 -8 14 -4 q-2 6 -14 4 Z M${x - 8} ${y - top - 16} q4 2 8 0`} fill={COBALT} opacity="0.85" />
        </g>
      )}
    </g>
  );
}

function Glockenturm({ x, y, level }: Look) {
  return (
    <g>
      {/* stone shaft */}
      <path d={`M${x - 32} ${y} L${x - 28} ${y - 170} L${x + 28} ${y - 170} L${x + 32} ${y} Z`} fill={STONE} style={S} />
      {Array.from({ length: 8 }, (_, r) => <path d={`M${x - 30 + r * 0.4} ${y - 20 - r * 20} L${x + 30 - r * 0.4} ${y - 20 - r * 20} M${x + (r % 2 ? -8 : 8)} ${y - r * 20} l0 -20`} fill="none" style={T} />)}
      <path d={`M${x - 12} ${y} L${x - 12} ${y - 28} Q${x} ${y - 40} ${x + 12} ${y - 28} L${x + 12} ${y} Z`} fill="var(--woodDark)" style={S} />
      {/* belfry with the bell */}
      <path d={`M${x - 30} ${y - 150} L${x + 30} ${y - 150} L${x + 30} ${y - 176} L${x - 30} ${y - 176} Z`} fill="var(--wood)" style={S} />
      <path d={`M${x - 18} ${y - 120} L${x - 18} ${y - 144} Q${x} ${y - 160} ${x + 18} ${y - 144} L${x + 18} ${y - 120} Z`} fill="var(--kilnInside)" style={S} />
      <path d={`M${x - 11} ${y - 124} Q${x - 10} ${y - 146} ${x} ${y - 147} Q${x + 10} ${y - 146} ${x + 11} ${y - 124} Z`} fill="var(--g5)" style={inkStyle(1.6)} />
      <circle cx={x} cy={y - 122} r="3" fill="var(--g5)" style={inkStyle(1.2)} />
      {level >= 2 && (
        <g>
          <circle cx={x} cy={y - 84} r="17" fill="#fffaf0" style={S} />
          {[0, 1, 2, 3].map((i) => <circle cx={x + Math.cos((i * Math.PI) / 2) * 12} cy={y - 84 + Math.sin((i * Math.PI) / 2) * 12} r="1.4" fill="var(--line)" />)}
          <path d={`M${x} ${y - 84} L${x} ${y - 95} M${x} ${y - 84} L${x + 7} ${y - 80}`} stroke="var(--line)" stroke-width="2" stroke-linecap="round" />
        </g>
      )}
      {level >= 3
        ? (
          <g>
            <path d={`M${x - 38} ${y - 174} L${x} ${y - 262} L${x + 38} ${y - 174} Z`} fill={GOLD} style={S} />
            <path d={`M${x - 20} ${y - 196} L${x + 20} ${y - 196} M${x - 11} ${y - 222} L${x + 11} ${y - 222}`} stroke={GOLD_DARK} stroke-width="2" stroke-linecap="round" />
            <path d={`M${x} ${y - 262} L${x} ${y - 278}`} style={inkStyle(2)} />
            <path d={`M${x} ${y - 290} l3 6 l7 0 l-5 4 l2 7 l-7 -4 l-7 4 l2 -7 l-5 -4 l7 0 Z`} fill={GOLD} style={inkStyle(1.4)} />
          </g>
        )
        : (
          <g>
            <path d={`M${x - 40} ${y - 174} L${x} ${y - 222} L${x + 40} ${y - 174} Z`} fill="var(--kilnDark)" style={S} />
            <path d={`M${x - 22} ${y - 190} L${x + 22} ${y - 190} M${x - 10} ${y - 206} L${x + 10} ${y - 206}`} stroke="#8e3a28" stroke-width="2" stroke-linecap="round" />
            <path d={`M${x} ${y - 222} L${x} ${y - 236}`} style={inkStyle(2)} />
            <circle cx={x} cy={y - 238} r="3" fill="var(--g5)" style={inkStyle(1.2)} />
          </g>
        )}
    </g>
  );
}

function Museum({ x, y, level }: Look) {
  const cols = [-78, -42, 42, 78];
  return (
    <g>
      {level >= 3 && (
        <g>
          <path d={`M${x - 46} ${y - 128} Q${x - 46} ${y - 196} ${x} ${y - 198} Q${x + 46} ${y - 196} ${x + 46} ${y - 128} Z`} fill="var(--sky)" opacity="0.9" style={S} />
          <path d={`M${x} ${y - 198} L${x} ${y - 128} M${x - 24} ${y - 188} Q${x - 30} ${y - 160} ${x - 28} ${y - 128} M${x + 24} ${y - 188} Q${x + 30} ${y - 160} ${x + 28} ${y - 128} M${x - 44} ${y - 150} Q${x} ${y - 158} ${x + 44} ${y - 150}`} fill="none" style={inkStyle(1.3)} />
          <path d={`M${x - 30} ${y - 176} q6 -10 14 -12`} fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.9" />
          <path d={`M${x} ${y - 198} L${x} ${y - 212}`} style={inkStyle(2)} />
          <circle cx={x} cy={y - 215} r="4" fill={GOLD} style={inkStyle(1.2)} />
        </g>
      )}
      {/* steps */}
      <path d={`M${x - 108} ${y} L${x - 108} ${y - 8} L${x + 108} ${y - 8} L${x + 108} ${y} Z`} fill={STONE} style={S} />
      <path d={`M${x - 100} ${y - 8} L${x - 100} ${y - 16} L${x + 100} ${y - 16} L${x + 100} ${y - 8} Z`} fill={STONE} style={S} />
      {/* back wall + door */}
      <path d={`M${x - 90} ${y - 16} L${x - 90} ${y - 92} L${x + 90} ${y - 92} L${x + 90} ${y - 16} Z`} fill="#f1e2c6" style={S} />
      <path d={`M${x - 16} ${y - 16} L${x - 16} ${y - 54} Q${x} ${y - 68} ${x + 16} ${y - 54} L${x + 16} ${y - 16} Z`} fill="var(--woodDark)" style={S} />
      {/* a vase in each window */}
      {[-60, 60].map((dx, i) => (
        <g>
          <path d={`M${x + dx - 10} ${y - 30} L${x + dx - 10} ${y - 62} Q${x + dx} ${y - 72} ${x + dx + 10} ${y - 62} L${x + dx + 10} ${y - 30} Z`} fill="var(--sky)" style={inkStyle(1.6)} />
          <path d={`M${x + dx - 5} ${y - 32} Q${x + dx - 8} ${y - 42} ${x + dx - 3} ${y - 48} L${x + dx - 3} ${y - 52} L${x + dx + 3} ${y - 52} L${x + dx + 3} ${y - 48} Q${x + dx + 8} ${y - 42} ${x + dx + 5} ${y - 32} Z`} fill={i ? 'var(--g3)' : COBALT} style={inkStyle(1.2)} />
        </g>
      ))}
      {/* columns */}
      {cols.map((dx) => (
        <g>
          <path d={`M${x + dx - 7} ${y - 16} L${x + dx - 6} ${y - 92} L${x + dx + 6} ${y - 92} L${x + dx + 7} ${y - 16} Z`} fill="#fffaf0" style={S} />
          <path d={`M${x + dx - 2} ${y - 22} L${x + dx - 2} ${y - 86} M${x + dx + 2} ${y - 22} L${x + dx + 2} ${y - 86}`} style={T} />
          <path d={`M${x + dx - 10} ${y - 92} L${x + dx + 10} ${y - 92} L${x + dx + 10} ${y - 98} L${x + dx - 10} ${y - 98} Z`} fill="#fffaf0" style={inkStyle(1.6)} />
        </g>
      ))}
      {level >= 2 && cols.map((dx, i) => {
        // banners between the columns
        const bx = x + (i < 2 ? dx + 18 : dx - 18);
        const c = ['var(--g3)', 'var(--g1)', 'var(--g1)', 'var(--g3)'][i];
        return i === 1 || i === 2 ? null : <path class="banner" d={`M${bx - 8} ${y - 96} L${bx + 8} ${y - 96} L${bx + 8} ${y - 50} L${bx} ${y - 58} L${bx - 8} ${y - 50} Z`} fill={c} style={inkStyle(1.6)} />;
      })}
      {/* frieze + pediment */}
      <path d={`M${x - 100} ${y - 98} L${x + 100} ${y - 98} L${x + 100} ${y - 114} L${x - 100} ${y - 114} Z`} fill="#fffaf0" style={S} />
      <text x={x} y={y - 101} text-anchor="middle" font-size="12" font-family="var(--font-hand)" fill="var(--line)" letter-spacing="3">MUSEUM</text>
      <path d={`M${x - 108} ${y - 114} L${x} ${y - 150} L${x + 108} ${y - 114} Z`} fill="var(--g4)" style={S} />
      <path d={`M${x - 14} ${y - 120} Q${x - 16} ${y - 128} ${x - 6} ${y - 134} L${x - 6} ${y - 138} L${x + 6} ${y - 138} L${x + 6} ${y - 134} Q${x + 16} ${y - 128} ${x + 14} ${y - 120} Z`} fill={GOLD} style={inkStyle(1.4)} />
      {level >= 2 && <Flag x={x} y={y - 150} c="var(--g3)" h={34} />}
    </g>
  );
}

function Headframe({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      <path d={`M${x - 26} ${y} L${x} ${y - h} L${x + 26} ${y} M${x - 18} ${y - h * 0.3} L${x + 18} ${y - h * 0.3} M${x - 10} ${y - h * 0.62} L${x + 10} ${y - h * 0.62} M${x - 18} ${y - h * 0.3} L${x + 10} ${y - h * 0.62}`} fill="none" stroke="var(--woodDark)" stroke-width="5" stroke-linecap="round" />
      <circle cx={x} cy={y - h} r="12" fill="var(--wood)" style={inkStyle(1.8)} />
      {[0, 1, 2].map((i) => <path d={`M${x} ${y - h} l${Math.cos((i * Math.PI) / 1.5) * 11} ${Math.sin((i * Math.PI) / 1.5) * 11}`} style={inkStyle(1.2)} />)}
      <path d={`M${x + 11} ${y - h} L${x + 11} ${y - 18}`} style={inkStyle(1.2)} />
      <path d={`M${x + 4} ${y - 18} L${x + 18} ${y - 18} L${x + 16} ${y - 6} L${x + 6} ${y - 6} Z`} fill="var(--bucket)" style={inkStyle(1.4)} />
    </g>
  );
}

function Kaolingrube({ x, y, level }: Look) {
  return (
    <g>
      {level >= 2 && (
        // a cart rail from the pit to the left
        <g>
          <path d={`M${x - 160} ${y + 2} L${x - 60} ${y - 8} M${x - 160} ${y + 12} L${x - 56} ${y + 2}`} style={inkStyle(2)} />
          {Array.from({ length: 6 }, (_, i) => <path d={`M${x - 154 + i * 18} ${y - 2 - i * 1.8} l2 16`} stroke="var(--woodDark)" stroke-width="4" stroke-linecap="round" />)}
          <path d={`M${x - 128} ${y - 30} L${x - 86} ${y - 34} L${x - 90} ${y - 8} L${x - 122} ${y - 6} Z`} fill="#8b6a4e" style={S} />
          <path d={`M${x - 126} ${y - 30} Q${x - 108} ${y - 46} ${x - 88} ${y - 34} Z`} fill={PORCELAIN} style={inkStyle(1.6)} />
          <circle cx={x - 116} cy={y - 4} r="5" fill="#555" style={inkStyle(1.4)} />
          <circle cx={x - 96} cy={y - 6} r="5" fill="#555" style={inkStyle(1.4)} />
        </g>
      )}
      {level >= 3 && (
        <g>
          {/* the white heap */}
          <path d={`M${x - 190} ${y + 4} Q${x - 168} ${y - 56} ${x - 150} ${y - 58} Q${x - 132} ${y - 54} ${x - 112} ${y + 4} Z`} fill={PORCELAIN} style={S} />
          <path d={`M${x - 168} ${y - 24} q8 -6 16 0 M${x - 150} ${y - 40} q6 -4 12 0`} fill="none" style={T} />
        </g>
      )}
      {/* the white pit */}
      <ellipse cx={x} cy={y - 14} rx="86" ry="32" fill="#cfc8bb" style={S} />
      <ellipse cx={x} cy={y - 18} rx="68" ry="21" fill={PORCELAIN} />
      <path d={`M${x - 44} ${y - 18} q10 -6 22 0 q12 -8 26 0 M${x - 22} ${y - 8} q14 -4 30 0`} fill="none" style={T} />
      {[[-34, -10], [22, -22], [40, -12]].map(([dx, dy]) => <path d={`M${x + dx} ${y + dy} l6 -6 l8 2 l1 7 Z`} fill="#fffaf0" style={inkStyle(1.2)} />)}
      <Headframe x={x + 52} y={y - 20} h={level >= 3 ? 136 : 118} />
      {level >= 3 && <Headframe x={x - 44} y={y - 24} h={84} />}
    </g>
  );
}

function Rathaus({ x, y, level }: Look) {
  const win = (wx: number, wy: number) => (
    <g>
      <rect x={wx - 10} y={wy - 12} width="20" height="22" fill="var(--sky)" style={inkStyle(1.8)} />
      <path d={`M${wx} ${wy - 12} L${wx} ${wy + 10} M${wx - 10} ${wy - 1} L${wx + 10} ${wy - 1}`} style={inkStyle(1.2)} />
    </g>
  );
  return (
    <g>
      {/* tower behind the hall */}
      <path d={`M${x - 26} ${y - 100} L${x - 26} ${y - 182} L${x + 26} ${y - 182} L${x + 26} ${y - 100} Z`} fill="#fbf0dc" style={S} />
      <path d={`M${x - 26} ${y - 166} L${x + 26} ${y - 166}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x - 34} ${y - 180} L${x} ${y - 226} L${x + 34} ${y - 180} Z`} fill="var(--kilnDark)" style={S} />
      <path d={`M${x} ${y - 226} L${x} ${y - 240}`} style={inkStyle(2)} />
      <circle cx={x} cy={y - 242} r="3" fill={level >= 3 ? GOLD : 'var(--g5)'} style={inkStyle(1.2)} />
      {/* half-timbered hall */}
      <path d={`M${x - 120} ${y} L${x - 120} ${y - 100} L${x + 120} ${y - 100} L${x + 120} ${y} Z`} fill="#fbf0dc" style={S} />
      <path d={`M${x - 120} ${y - 50} L${x + 120} ${y - 50} M${x - 80} ${y - 100} L${x - 80} ${y} M${x - 40} ${y - 100} L${x - 40} ${y - 50} M${x + 40} ${y - 100} L${x + 40} ${y - 50} M${x + 80} ${y - 100} L${x + 80} ${y} M${x - 120} ${y - 100} L${x - 80} ${y - 50} M${x + 120} ${y - 100} L${x + 80} ${y - 50} M${x - 120} ${y - 50} L${x - 80} ${y} M${x + 120} ${y - 50} L${x + 80} ${y}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x - 120} ${y} L${x - 120} ${y - 100} L${x + 120} ${y - 100} L${x + 120} ${y} Z`} fill="none" style={S} />
      {[-100, -60, -20, 20, 60, 100].map((dx) => win(x + dx, y - 74))}
      {win(x - 60, y - 24)}{win(x + 60, y - 24)}
      {/* roof */}
      <path d={`M${x - 136} ${y - 94} L${x - 96} ${y - 150} L${x + 96} ${y - 150} L${x + 136} ${y - 94} Z`} fill="var(--kiln)" style={S} />
      <path d={`M${x - 112} ${y - 112} L${x - 60} ${y - 112} M${x + 60} ${y - 112} L${x + 112} ${y - 112} M${x - 90} ${y - 132} L${x - 40} ${y - 132} M${x + 40} ${y - 132} L${x + 90} ${y - 132}`} stroke="var(--kilnDark)" stroke-width="2" stroke-linecap="round" />
      {/* tower front above the roof */}
      <path d={`M${x - 26} ${y - 150} L${x - 26} ${y - 120} L${x + 26} ${y - 120} L${x + 26} ${y - 150}`} fill="#fbf0dc" style={S} />
      {level >= 3
        ? <g><circle cx={x} cy={y - 152} r="13" fill={GOLD} style={S} /><circle cx={x} cy={y - 152} r="8.5" fill="#fffaf0" style={inkStyle(1.2)} /><path d={`M${x} ${y - 152} L${x} ${y - 160} M${x} ${y - 152} L${x + 6} ${y - 149}`} stroke="var(--line)" stroke-width="1.8" stroke-linecap="round" /></g>
        : win(x, y - 150)}
      {/* door with a sign */}
      <path d={`M${x - 20} ${y} L${x - 20} ${y - 34} Q${x} ${y - 48} ${x + 20} ${y - 34} L${x + 20} ${y} Z`} fill="var(--woodDark)" style={S} />
      <path d={`M${x - 26} ${y - 136} L${x + 26} ${y - 136} L${x + 22} ${y - 122} L${x - 22} ${y - 122} Z`} fill="var(--g1)" style={inkStyle(1.6)} />
      <text x={x} y={y - 125} text-anchor="middle" font-size="11" font-family="var(--font-hand)" fill="#fff">Rathaus</text>
      {level >= 2 && (
        <g>
          {/* balcony with flags */}
          <path d={`M${x - 44} ${y - 50} L${x + 44} ${y - 50} L${x + 40} ${y - 44} L${x - 40} ${y - 44} Z`} fill="var(--wood)" style={inkStyle(1.8)} />
          <path d={`M${x - 42} ${y - 50} L${x - 42} ${y - 64} L${x + 42} ${y - 64} L${x + 42} ${y - 50} ${Array.from({ length: 9 }, (_, i) => `M${x - 32 + i * 8} ${y - 50} L${x - 32 + i * 8} ${y - 64}`).join(' ')}`} fill="none" style={inkStyle(1.6)} />
          <Flag x={x - 118} y={y - 98} c="var(--g5)" />
          <Flag x={x + 118} y={y - 98} c="var(--g1)" />
          {[-30, 30].map((dx, i) => <path d={`M${x + dx} ${y - 64} L${x + dx} ${y - 92}`} style={inkStyle(1.6)} />)}
          <path class="flag" d={`M${x - 30} ${y - 92} L${x - 10} ${y - 86} L${x - 30} ${y - 80} Z`} fill="var(--g3)" style={inkStyle(1.3)} />
          <path class="flag" d={`M${x + 30} ${y - 92} L${x + 50} ${y - 86} L${x + 30} ${y - 80} Z`} fill="var(--g2)" style={inkStyle(1.3)} />
        </g>
      )}
      {level >= 3 && (
        <g>
          {/* a wide stair down to the square, with a little fountain at its side */}
          <path d={`M${x - 34} ${y} L${x - 42} ${y + 12} L${x + 42} ${y + 12} L${x + 34} ${y} Z`} fill={STONE} style={inkStyle(1.8)} />
          <path d={`M${x - 42} ${y + 12} L${x - 50} ${y + 24} L${x + 50} ${y + 24} L${x + 42} ${y + 12} Z`} fill={STONE} style={inkStyle(1.8)} />
          <path d={`M${x + 70} ${y + 6} L${x + 70} ${y + 18} Q${x + 96} ${y + 28} ${x + 122} ${y + 18} L${x + 122} ${y + 6} Z`} fill={PORCELAIN} style={inkStyle(1.8)} />
          <BlueTile x={x + 80} y={y + 8} s={10} /><BlueTile x={x + 101} y={y + 9} s={10} />
          <ellipse cx={x + 96} cy={y + 6} rx="26" ry="7" fill="var(--sky)" style={inkStyle(1.6)} />
          <path class="jet" d={`M${x + 96} ${y + 4} Q${x + 92} ${y - 20} ${x + 82} ${y + 2} M${x + 96} ${y + 4} Q${x + 100} ${y - 20} ${x + 110} ${y + 2}`} fill="none" stroke="var(--g1)" stroke-width="3" stroke-linecap="round" />
        </g>
      )}
    </g>
  );
}

/** Per project: the look at a level, how tall and how wide it is (for clip and scaffolding). */
const DRAW: Record<string, { draw: (p: Look) => preact.JSX.Element; h: number; hw: number; label: number }> = {
  dorfbrunnen: { draw: Dorfbrunnen, h: 140, hw: 86, label: 30 },
  glockenturm: { draw: Glockenturm, h: 300, hw: 42, label: 30 },
  museum: { draw: Museum, h: 220, hw: 110, label: 30 },
  kaolingrube: { draw: Kaolingrube, h: 160, hw: 100, label: 42 },
  rathaus: { draw: Rathaus, h: 246, hw: 138, label: 44 },
};

function Scaffold({ x, top, bottom, ground, hw }: { x: number; top: number; bottom: number; ground: number; hw: number }) {
  const left = x - hw - 6, right = x + hw + 6;
  const poles = hw > 90 ? [left, x, right] : [left, right];
  const planks: number[] = [];
  for (let py = bottom; py > top + 6; py -= 42) planks.push(py);
  return (
    <g class="scaffold">
      {poles.map((px) => <path d={`M${px} ${ground} L${px} ${top - 8}`} stroke="var(--woodDark)" stroke-width="4" stroke-linecap="round" />)}
      {planks.map((py, i) => (
        <g>
          <path d={`M${left - 6} ${py} L${right + 6} ${py}`} stroke="var(--wood)" stroke-width="6" stroke-linecap="round" />
          <path d={`M${left - 6} ${py - 3} L${right + 6} ${py - 3} M${left - 6} ${py + 3} L${right + 6} ${py + 3}`} style={inkStyle(1.2)} />
          {i % 2 === 0 && i < planks.length - 1 && poles.slice(1).map((px, k) => <path d={`M${poles[k]} ${py} L${px} ${planks[i + 1]}`} stroke="var(--woodDark)" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />)}
        </g>
      ))}
    </g>
  );
}

function Sign({ x, y, text, fill }: { x: number; y: number; text: string; fill: string }) {
  const w = Math.max(84, Math.round(text.length * 7.6 + 18));
  return (
    <g>
      <path d={`M${x} ${y} L${x} ${y - 52}`} stroke="var(--woodDark)" stroke-width="4" />
      <g transform={`rotate(-3 ${x} ${y - 52})`}>
        <rect x={x - w / 2} y={y - 80} width={w} height="30" fill={fill} style={inkStyle(1.8)} />
        <text x={x} y={y - 59} text-anchor="middle" font-size="15" font-family="var(--font-hand)" fill="var(--line)">{text}</text>
      </g>
    </g>
  );
}

/** A low builder's board in front of a construction site (where the name goes once it is finished). */
function BoardSign({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(84, Math.round(text.length * 7.6 + 18));
  return (
    <g>
      <path d={`M${x - w / 2 + 12} ${y + 14} L${x - w / 2 + 12} ${y - 14} M${x + w / 2 - 12} ${y + 14} L${x + w / 2 - 12} ${y - 14}`} stroke="var(--woodDark)" stroke-width="4" />
      <g transform={`rotate(-2 ${x} ${y})`}>
        <rect x={x - w / 2} y={y - 18} width={w} height="28" fill="var(--sun)" style={inkStyle(1.8)} />
        <path d={`M${x - w / 2 + 4} ${y + 6} l10 0 M${x + w / 2 - 14} ${y + 6} l10 0`} stroke="var(--line)" stroke-width="3" opacity="0.5" />
        <text x={x} y={y + 2} text-anchor="middle" font-size="15" font-family="var(--font-hand)" fill="var(--line)">{text}</text>
      </g>
    </g>
  );
}

function Plot({ x, y, hw }: { x: number; y: number; hw: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y - 16} rx={hw * 0.85} ry="26" fill="#d9bf92" opacity="0.75" style={{ ...inkStyle(1.4), strokeDasharray: '6 6' }} />
      {[[-0.75, -16], [0.75, -16], [-0.3, 2], [0.3, -34]].map(([fx, dy]) => <path d={`M${x + fx * hw} ${y + dy} l0 -14`} stroke="var(--woodDark)" stroke-width="3" stroke-linecap="round" />)}
      <path d={`M${x - 0.75 * hw} ${y - 28} L${x - 0.3 * hw} ${y - 10} L${x + 0.75 * hw} ${y - 28} L${x + 0.3 * hw} ${y - 46} Z`} fill="none" stroke="#fffaf0" stroke-width="1.6" />
    </g>
  );
}

export type SiteBuilding = { level: 1 | 2 | 3; stage: number; stages: number } | null;

/**
 * A grand-project spot on the map. `level` = highest completed level (0 = never built);
 * `building` = the level under construction here, if any.
 */
export function ProjectSite({ id, x, y, level, building, offered, onClick }: { id: string; x: number; y: number; level: number; building: SiteBuilding; offered: boolean; onClick: () => void }) {
  const def = PROJECTS[id];
  const look = DRAW[id];
  if (!def || !look) return null;
  const shownLevel = building?.level ?? level;
  const stage = building ? building.stage : level > 0 ? def.stages.length : 0;
  const Draw = look.draw;
  const root = { class: 'vbuilding project-site', 'data-project-site': id, 'data-stage': stage, 'data-level': shownLevel, onClick, role: 'button' as const };

  if (building) {
    const frac = Math.max(0, Math.min(1, building.stage / Math.max(1, building.stages)));
    const top = y - look.h;
    const cut = y + 30 - (look.h + 30) * frac;
    const clipId = `site-${id}-${building.level}-${building.stage}-${x}-${y}`;
    const label = `${def.name} ${ROMAN[building.level - 1]} · ${building.stage}/${building.stages}`;
    return (
      <g {...root} aria-label={`Baustelle: ${label}`}>
        <ellipse cx={x} cy={y + 4} rx={look.hw + 24} ry="20" fill="url(#hatch)" opacity="0.35" />
        {building.level === 1 && <Plot x={x} y={y} hw={look.hw} />}
        <g opacity="0.3" style={{ strokeDasharray: '7 6' }}><Draw x={x} y={y} level={building.level} /></g>
        {building.level > 1 && <g filter="url(#wobble-soft)"><Draw x={x} y={y} level={building.level - 1} /></g>}
        <clipPath id={clipId}><rect x={x - look.hw - 120} y={cut} width={look.hw * 2 + 240} height={y + 40 - cut} /></clipPath>
        <g clip-path={`url(#${clipId})`}><g filter="url(#wobble-soft)"><Draw x={x} y={y} level={building.level} /></g></g>
        <Scaffold x={x} top={top} bottom={Math.min(y - 14, cut)} ground={y} hw={look.hw} />
        <BoardSign x={x} y={y + look.label - 6} text={label} />
      </g>
    );
  }
  if (level <= 0) {
    const text = offered ? `Zur Wahl: ${def.name}` : 'Bauplatz';
    return (
      <g {...root} aria-label={text}>
        <Plot x={x} y={y} hw={look.hw} />
        <Sign x={x + (offered ? 0 : 10)} y={y - 12} text={text} fill={offered ? 'var(--sun)' : '#fffaf0'} />
      </g>
    );
  }
  return (
    <g {...root} aria-label={`${def.name} ${ROMAN[level - 1]}`}>
      <ellipse cx={x} cy={y + 4} rx={look.hw + 20} ry="20" fill="url(#hatch)" opacity="0.35" />
      <g filter="url(#wobble-soft)"><Draw x={x} y={y} level={level} /></g>
      <text x={x} y={y + look.label} text-anchor="middle" font-size="18" font-family="var(--font-hand)" fill="var(--line)">{def.name} {ROMAN[level - 1]}</text>
    </g>
  );
}
