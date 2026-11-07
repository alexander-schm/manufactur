import { getForm, getStationDef, getTrait } from './content';
import type { Batch, Design, GameState, Stage, Station, StationKind, Worker } from './types';

const STAGE_STATION: Record<Stage, StationKind> = {
  prepare: 'prepBench', form: 'wheel', dry: 'dryingRack', bisque: 'kiln', glaze: 'glazeTable', glazeFire: 'kiln',
};

export function stationForStage(stage: Stage): StationKind {
  return STAGE_STATION[stage];
}

/** The owner always lends a hand; each worker adds this share of the base speed. */
export const WORKER_SHARE = 0.6;
export const AWAY_AFTER_MS = 5 * 60_000;

export function workersAt(state: GameState, stationId: string): Worker[] {
  return state.workers.filter((w) => w.stationId === stationId);
}

export function stationSpeed(state: GameState, station: Station, stage: Stage, now: number): number {
  const def = getStationDef(station.kind);
  let speed = def.piecesPerMinute[station.level - 1];
  if (def.usesWorkers) {
    const away = now > state.lastSeen + AWAY_AFTER_MS;
    let factor = 1;
    for (const w of workersAt(state, station.id)) {
      let m = 1;
      for (const t of w.traits) {
        const tr = getTrait(t);
        m *= tr.speedMul;
        if (tr.favStage === stage) m *= 1.2;
        if (away && tr.offlineSpeedMul) m *= tr.offlineSpeedMul;
      }
      factor += WORKER_SHARE * m;
    }
    speed *= factor;
  }
  // chatty neighbours
  for (const other of state.stations) {
    if (Math.abs(other.slot - station.slot) !== 1) continue;
    for (const w of workersAt(state, other.id)) {
      for (const t of w.traits) speed *= getTrait(t).neighbourSpeedMul ?? 1;
    }
  }
  if (now < state.boostUntil) speed *= 2;
  return speed;
}

export function stageDurationMs(state: GameState, batch: Batch, station: Station, now: number): number {
  const speed = stationSpeed(state, station, batch.stage, now) * (batch.touch ?? 1);
  return Math.round((batch.count / speed) * 60_000);
}

export function designDifficultyOf(design: Design): number {
  const form = getForm(design.form);
  const p = design.profile;
  const shape = 1 + Math.max(0, p.height - 0.5) * 0.4 + Math.abs(p.belly - p.neck) * 0.3;
  const extras = (design.handle !== 'none' ? 0.1 : 0) + (design.pattern !== 'none' ? 0.15 : 0) + (design.rim !== 'plain' ? 0.05 : 0);
  return Math.min(2, Math.max(0.5, form.baseDifficulty * shape + extras));
}

export function batchQuality(state: GameState, design: Design, workers: Worker[]): number {
  let q = 55 - (designDifficultyOf(design) - 1) * 30;
  for (const w of workers) {
    for (const t of w.traits) q += getTrait(t).qualityAdd;
    q += Math.min(10, w.xp / 30);
  }
  const wheel = state.stations.find((s) => s.kind === 'wheel');
  if (wheel) q += (wheel.level - 1) * 4;
  return Math.max(0, Math.min(100, q));
}

export function qualityTier(q: number): 1 | 2 | 3 {
  if (q < 40) return 1;
  if (q < 75) return 2;
  return 3;
}
