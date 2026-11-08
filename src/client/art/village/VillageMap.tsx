import { memo } from 'preact/compat';
import type { VillageView } from '../../../shared/village/types';
import { BUILDING_ORDER } from '../../../shared/village/buildings';
import { COMPLETIONS_PER_BUILDING } from '../../../shared/village/joint';
import { inkStyle } from '../ink';
import { VillageBuilding } from './Buildings';
import { FreePlot, House } from './House';
import './village.css';

export const MAP_W = 1400;
export const MAP_H = 880;
/** House plots (front-step centre). 0–5: the ring around the square; 6–9: outer plots for bigger villages. */
export const PLOTS = [
  { x: 330, y: 360 }, { x: 700, y: 280 }, { x: 1070, y: 360 }, { x: 1080, y: 700 }, { x: 700, y: 810 }, { x: 320, y: 700 },
  { x: 120, y: 520 }, { x: 1280, y: 520 }, { x: 470, y: 160 }, { x: 930, y: 160 },
];
export const BUILDING_SPOTS: Record<string, { x: number; y: number }> = {
  tongrube: { x: 150, y: 220 }, markthalle: { x: 1260, y: 230 }, glasurbibliothek: { x: 110, y: 860 }, gildenhaus: { x: 1290, y: 860 },
};
const CORE = 6;
const ACTIVE_MS = 3_600_000;

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g class="tree" style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y + 2} rx={30 * s} ry={8 * s} fill="url(#hatch)" opacity="0.35" />
      <path d={`M${x - 6 * s} ${y} L${x - 4 * s} ${y - 40 * s} L${x + 4 * s} ${y - 40 * s} L${x + 6 * s} ${y} Z`} fill="var(--woodDark)" style={S} />
      {[[-18, -52, 22], [16, -56, 24], [0, -78, 26], [-6, -48, 18]].map(([dx, dy, r]) => <circle cx={x + dx * s} cy={y + dy * s} r={r * s} fill="var(--g2)" style={S} />)}
      <circle cx={x + 10 * s} cy={y - 70 * s} r={4 * s} fill="var(--g3)" />
      <circle cx={x - 14 * s} cy={y - 58 * s} r={4 * s} fill="var(--g3)" />
    </g>
  );
}

function Sheep({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g class="sheep" transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      {[[-10, -14], [2, -18], [12, -12], [-2, -8], [10, -6]].map(([dx, dy]) => <circle cx={x + dx} cy={y + dy} r="9" fill="#fffaf0" style={inkStyle(1.6)} />)}
      <ellipse cx={x + 22} cy={y - 14} rx="7" ry="6" fill="#4a3b35" style={inkStyle(1.4)} />
      <path d={`M${x - 8} ${y - 2} l0 8 M${x + 8} ${y - 2} l0 8`} style={inkStyle(2.2)} />
    </g>
  );
}

function Landscape() {
  return (
    <g filter="url(#wobble)">
      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#b8d99a" />
      {Array.from({ length: 70 }, (_, i) => {
        const x = (i * 197) % MAP_W, y = (i * 113) % MAP_H;
        return <path d={`M${x} ${y} l3 -8 M${x + 6} ${y} l2 -10 M${x + 11} ${y} l3 -7`} fill="none" stroke="#6f9a4f" stroke-width="1.6" stroke-linecap="round" opacity="0.6" />;
      })}
      {/* paths */}
      <path d={`M700 ${MAP_H} Q690 700 700 560`} fill="none" stroke="#e8cf9f" stroke-width="44" stroke-linecap="round" />
      {PLOTS.slice(0, CORE).map((p) => <path d={`M700 470 Q${(700 + p.x) / 2 + 30} ${(470 + p.y) / 2 + 20} ${p.x} ${p.y + 10}`} fill="none" stroke="#e8cf9f" stroke-width="20" stroke-linecap="round" />)}
      <path d={`M700 ${MAP_H} Q690 700 700 560`} fill="none" style={{ ...T, strokeDasharray: '4 14' }} />
      {/* square */}
      <ellipse cx="700" cy="470" rx="200" ry="105" fill="#e8cf9f" style={S} />
      {Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2, r = 0.55 + ((i * 37) % 10) / 25;
        return <ellipse cx={700 + Math.cos(a) * 200 * r} cy={470 + Math.sin(a) * 105 * r} rx="9" ry="5" fill="none" style={T} />;
      })}
      {/* pond */}
      <ellipse cx="985" cy="510" rx="60" ry="26" fill="var(--sky)" style={S} />
      <path d="M955 506 q8 -4 16 0 M995 516 q8 -4 16 0" fill="none" stroke="#fff" stroke-width="2" opacity="0.8" />
      <g><ellipse cx="1000" cy="500" rx="9" ry="6" fill="#fffaf0" style={inkStyle(1.4)} /><circle cx="1007" cy="494" r="4" fill="#fffaf0" style={inkStyle(1.4)} /><path d="M1010 494 l5 1 l-5 2" fill="var(--g5)" /></g>
      {/* fences */}
      {[[40, 300, 150], [1210, 330, 150]].map(([x, y, w]) => (
        <g>{Array.from({ length: Math.floor(w / 25) + 1 }, (_, k) => <path d={`M${x + k * 25} ${y} l0 -26`} style={inkStyle(2.4)} />)}<path d={`M${x} ${y - 18} L${x + w} ${y - 18} M${x} ${y - 8} L${x + w} ${y - 8}`} style={inkStyle(2)} /></g>
      ))}
    </g>
  );
}

function Well({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 4} rx="46" ry="12" fill="url(#hatch)" opacity="0.4" />
      <path d={`M${x - 34} ${y} L${x - 34} ${y - 26} L${x + 34} ${y - 26} L${x + 34} ${y} Z`} fill="var(--brickLight)" style={S} />
      {[0, 1].map((r) => [0, 1, 2, 3].map((c) => <rect x={x - 32 + c * 17 + (r % 2) * 8} y={y - 24 + r * 12} width="14" height="9" rx="2" fill="none" style={T} />))}
      <ellipse cx={x} cy={y - 26} rx="34" ry="9" fill="var(--g1)" style={S} />
      <path d={`M${x - 28} ${y - 26} L${x - 28} ${y - 70} M${x + 28} ${y - 26} L${x + 28} ${y - 70}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x - 40} ${y - 66} L${x} ${y - 92} L${x + 40} ${y - 66} Z`} fill="var(--kiln)" style={S} />
      <path d={`M${x} ${y - 66} L${x} ${y - 44}`} style={inkStyle(1.2)} />
      <path d={`M${x - 7} ${y - 44} L${x + 7} ${y - 44} L${x + 5} ${y - 34} L${x - 5} ${y - 34} Z`} fill="var(--wood)" style={inkStyle(1.4)} />
    </g>
  );
}

function NoticeBoard({ x, y, offers, requests }: { x: number; y: number; offers: number; requests: number }) {
  return (
    <g class="noticeboard">
      <path d={`M${x - 40} ${y} L${x - 40} ${y - 70} M${x + 40} ${y} L${x + 40} ${y - 70}`} stroke="var(--woodDark)" stroke-width="5" />
      <path d={`M${x - 52} ${y - 110} L${x + 52} ${y - 110} L${x + 52} ${y - 50} L${x - 52} ${y - 50} Z`} fill="var(--cork)" style={S} />
      <path d={`M${x - 60} ${y - 112} L${x} ${y - 134} L${x + 60} ${y - 112} Z`} fill="var(--woodDark)" style={S} />
      {Array.from({ length: Math.min(offers, 4) }, (_, i) => <g transform={`rotate(${i % 2 ? 6 : -5} ${x - 36 + i * 18} ${y - 92})`}><rect x={x - 46 + i * 18} y={y - 104} width="20" height="24" fill="#fffaf0" style={inkStyle(1.2)} /><circle cx={x - 36 + i * 18} cy={y - 102} r="2.5" fill="var(--g3)" /></g>)}
      {Array.from({ length: Math.min(requests, 3) }, (_, i) => <rect x={x - 30 + i * 22} y={y - 76} width="18" height="18" fill="var(--g5)" style={inkStyle(1.2)} transform={`rotate(${i % 2 ? -6 : 4} ${x - 21 + i * 22} ${y - 67})`} />)}
      <text x={x} y={y + 22} text-anchor="middle" font-size="17" font-family="var(--font-hand)" fill="var(--line)">Tauschbrett</text>
    </g>
  );
}

type Props = { village: VillageView; meId: string; now: number; onHouse: (playerId: string) => void; onBuilding: (id: string) => void; onBoard?: () => void };

const StaticLandscape = memo(Landscape);

export function VillageMap({ village, meId, now, onHouse, onBuilding, onBoard }: Props) {
  const bySlot = new Map(village.members.map((m) => [m.houseSlot, m]));
  const built = new Set(village.buildings);
  const nextIdx = BUILDING_ORDER.findIndex((b) => !built.has(b));
  const progress = village.completedJoint % COMPLETIONS_PER_BUILDING;
  // draw back-to-front by y so houses overlap naturally
  const items: { y: number; el: preact.JSX.Element }[] = [];
  PLOTS.forEach((p, slot) => {
    const m = bySlot.get(slot);
    if (m) items.push({ y: p.y, el: <House m={m} x={p.x} y={p.y} me={m.playerId === meId} active={now - m.lastSeen < ACTIVE_MS} onClick={() => onHouse(m.playerId)} /> });
    else if (slot < CORE) items.push({ y: p.y, el: <FreePlot x={p.x} y={p.y} /> });
  });
  BUILDING_ORDER.forEach((id, i) => {
    const p = BUILDING_SPOTS[id];
    if (built.has(id) || i === nextIdx) items.push({ y: p.y, el: <VillageBuilding id={id} x={p.x} y={p.y} built={built.has(id)} progress={progress} onClick={() => onBuilding(id)} /> });
  });
  items.push({ y: 470, el: <Well x={700} y={470} /> });
  items.push({ y: 500, el: <g onClick={onBoard} role="button" aria-label="Tauschbrett"><NoticeBoard x={830} y={500} offers={village.offers.length} requests={village.requests.length} /></g> });
  for (const [x, y, s] of [[40, 420, 1], [1370, 420, 1.1], [560, 620, 0.8], [850, 640, 0.75], [30, 760, 1.2], [1380, 770, 1], [260, 110, 0.9], [1120, 100, 0.85], [700, 120, 0.7]] as const) {
    items.push({ y, el: <Tree x={x} y={y} s={s} /> });
  }
  items.push({ y: 610, el: <Sheep x={590} y={610} /> }, { y: 600, el: <Sheep x={800} y={600} flip /> });
  items.sort((a, b) => a.y - b.y);
  return (
    <div class="village-scroll">
      <svg class="village-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={`Das Dorf ${village.name}`}>
        <StaticLandscape />
        {items.map((it) => it.el)}
        <g transform="rotate(-2 700 40)">
          <rect x="560" y="12" width="280" height="50" rx="8" fill="#fffaf0" style={S} />
          <text x="700" y="47" text-anchor="middle" font-size="30" font-family="var(--font-hand)" fill="var(--line)">{village.name}</text>
        </g>
      </svg>
    </div>
  );
}
