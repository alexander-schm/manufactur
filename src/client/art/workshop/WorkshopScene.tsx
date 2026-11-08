import { makeCharacter } from '../../../shared/character';
import type { GameState, Station, StationKind, Worker } from '../../../shared/types';
import { Character, type Pose } from '../character/Character';
import { Cat, Room } from './Room';
import { DryingRack, GlazeTable, Kiln, MarketStall, PrepBench, Shelf, SHELF_VISIBLE_MAX, Wheel, type StationProps } from './stations/Stations';
import './scene.css';

export { SHELF_VISIBLE_MAX };

/** Floor positions (centre, base y) per station slot. Slots 7–11 are in the second room. */
export const SLOTS: { x: number; y: number }[] = [
  { x: 190, y: 640 },  // 0 prepBench (front left)
  { x: 520, y: 650 },  // 1 wheel (front centre)
  { x: 470, y: 480 },  // 2 dryingRack (back, under the window)
  { x: 1060, y: 470 }, // 3 kiln (back right)
  { x: 820, y: 640 },  // 4 glazeTable (front right)
  { x: 130, y: 470 },  // 5 shelf (back left)
  { x: 1070, y: 680 }, // 6 marketStall (front right corner)
  { x: 1330, y: 640 }, { x: 1520, y: 480 }, { x: 1660, y: 640 }, { x: 1700, y: 470 }, { x: 1400, y: 470 },
];

const DRAW: Record<StationKind, (p: StationProps) => preact.JSX.Element> = {
  prepBench: PrepBench, wheel: Wheel, dryingRack: DryingRack, kiln: Kiln, glazeTable: GlazeTable, shelf: Shelf, marketStall: MarketStall,
};

/** Where a worker stands relative to their station, and whether they're drawn behind it. */
const WORKER_SPOT: Partial<Record<StationKind, { dx: number; dy: number; behind: boolean }>> = {
  prepBench: { dx: 10, dy: -70, behind: true },
  wheel: { dx: -120, dy: 6, behind: false },
  glazeTable: { dx: -20, dy: -70, behind: true },
};
const IDLE_SPOTS = [{ x: 640, y: 712 }, { x: 900, y: 712 }, { x: 340, y: 712 }];

/** Without onStation the scene is read-only (visiting a friend). */
type Props = { state: GameState; now: number; onStation?: (id: string) => void; onWorker?: (id: string) => void; highlight?: StationKind };

function Person({ w, x, y, pose, onWorker, i }: { w: Worker; x: number; y: number; pose: Pose; onWorker: (id: string) => void; i: number }) {
  const size = 100;
  return (
    <g class="person" transform={`translate(${x - size / 2} ${y - size * 1.5})`} onClick={(e) => { e.stopPropagation(); onWorker(w.id); }} data-worker={w.id}>
      <Character look={makeCharacter(w.seed)} pose={pose} seed={w.seed + i} size={size} title={w.name} />
      <text x={size / 2} y={size * 1.5 + 22} text-anchor="middle" font-size="17" font-family="var(--font-hand)" fill="var(--line)" class="name-tag">{w.name}</text>
    </g>
  );
}

export function WorkshopScene({ state, now, onStation, onWorker = () => undefined, highlight }: Props) {
  const readOnly = !onStation;
  const room2 = state.unlocks.includes('room2');
  const width = room2 ? 1800 : 1200;
  const pins = state.designs.slice(-4).reverse().map((design) => ({ design, glaze: state.glazes.find((g) => g.id === design.glazeId) }));
  const byStation = (st: Station) => ({
    running: state.batches.filter((b) => b.stationId === st.id && b.startedAt !== null),
    waiting: state.batches.filter((b) => b.startedAt === null && stageKind(b.stage) === st.kind),
  });
  const ordered = [...state.stations].sort((a, b) => SLOTS[a.slot].y - SLOTS[b.slot].y);
  const idle = state.workers.filter((w) => !w.stationId);
  const catAwake = state.batches.length === 0;
  return (
    <div class={`scene-scroll ${readOnly ? 'readonly' : ''}`} data-readonly={readOnly ? '' : undefined}>
      <svg class="scene" viewBox={`0 0 ${width} 720`} data-width={width} role="img" aria-label="Deine Werkstatt">
        <Room pins={pins} room2={room2} />
        <Cat x={760} y={652} sleeping={!catAwake} />
        {ordered.map((st) => {
          const pos = SLOTS[st.slot];
          const { running, waiting } = byStation(st);
          const Draw = DRAW[st.kind];
          const spot = WORKER_SPOT[st.kind];
          const workers = state.workers.filter((w) => w.stationId === st.id);
          const people = spot ? workers.map((w, i) => <Person w={w} i={i} x={pos.x + spot.dx + i * 70} y={pos.y + spot.dy} pose={running.length ? 'work' : 'idle'} onWorker={onWorker} />) : null;
          return (
            <g class="station" data-station={st.kind} onClick={readOnly ? undefined : () => onStation(st.id)} tabIndex={readOnly ? undefined : 0} role={readOnly ? undefined : 'button'} aria-label={st.kind}
              onKeyDown={readOnly ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onStation(st.id); }}>
              {spot?.behind && people}
              <Draw x={pos.x} y={pos.y} state={state} station={st} now={now} running={running} waiting={waiting} />
              {!spot?.behind && people}
            </g>
          );
        })}
        {idle.map((w, i) => <Person w={w} i={i} x={IDLE_SPOTS[i % 3].x + Math.floor(i / 3) * 40} y={IDLE_SPOTS[i % 3].y} pose="sleep" onWorker={onWorker} />)}
        {highlight && (() => {
          const st = state.stations.find((x) => x.kind === highlight);
          if (!st) return null;
          const p = SLOTS[st.slot];
          const top = { kiln: 230, shelf: 300, dryingRack: 220, marketStall: 220, wheel: 190, prepBench: 120, glazeTable: 120 }[highlight];
          const x = p.x, y = p.y - top;
          return (
            <g class="hint-arrow">
              <path d={`M${x} ${y - 70} C${x - 16} ${y - 50} ${x + 14} ${y - 30} ${x} ${y - 8}`} fill="none" stroke="var(--kiln)" stroke-width="7" stroke-linecap="round" />
              <path d={`M${x - 14} ${y - 22} L${x} ${y - 2} L${x + 14} ${y - 22}`} fill="none" stroke="var(--kiln)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            </g>
          );
        })()}
        {now < state.boostUntil && (
          <g class="boost-banner">
            <rect x={width / 2 - 170} y="34" width="340" height="44" rx="10" fill="var(--sun)" stroke="var(--line)" stroke-width="2.2" />
            <text x={width / 2} y="64" text-anchor="middle" font-size="22" font-family="var(--font-hand)">Willkommen zurück! Doppeltes Tempo ✦</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function stageKind(stage: string): StationKind {
  return ({ prepare: 'prepBench', form: 'wheel', dry: 'dryingRack', bisque: 'kiln', glaze: 'glazeTable', glazeFire: 'kiln' } as Record<string, StationKind>)[stage];
}
