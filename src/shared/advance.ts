import { getStationDef, getTrait } from './content';
import { addGoods, goodsTotal, shelfCapacity, stallRate, stallSalesBetween, stallStock } from './market';
import { addOrder, nextOrderTime } from './orders';
import { checkMilestones } from './progression';
import { kilnCapacity, qualityTier, stageDurationMs, startNewBatch, stationForStage, workersAt } from './production';
import { nextRandom } from './rng';
import { newId } from './state';
import { STAGES, type Batch, type GameState, type Station } from './types';

const MIN = 60_000;
export const AWAY_LOG_AFTER_MS = 10 * MIN;
/** Standing orders keep at most this many batches in the pipeline. */
export const STANDING_PIPELINE = 4;
const MAX_ITER = 500_000;

const isRunning = (b: Batch) => b.startedAt !== null;
const endOf = (b: Batch) => (b.startedAt ?? 0) + b.durationMs;

/**
 * Deterministic catch-up: simulate everything that happened between state.lastTick and now.
 * Pure — returns a new state; returns the same object if there is nothing to do.
 */
export function advance(state: GameState, now: number): GameState {
  if (now <= state.lastTick) return state;
  const s = structuredClone(state);
  if (now - s.lastSeen > AWAY_LOG_AFTER_MS && !s.away) {
    s.away = { since: s.lastSeen, made: 0, sold: 0, talerEarned: 0, discoveries: [] };
  }
  let t = s.lastTick;
  for (let i = 0; i < MAX_ITER; i++) {
    startWork(s, t);
    const next = nextEventTime(s, t);
    const until = next === null || next > now ? now : next;
    sell(s, t, until);
    t = until;
    if (next === null || next > now) break;
    completeDue(s, t);
  }
  s.lastTick = now;
  return checkMilestones(s).state;
}


function stationsOfKind(s: GameState, kind: Station['kind']): Station[] {
  return s.stations.filter((x) => x.kind === kind);
}

function canStartOn(s: GameState, st: Station, b: Batch): boolean {
  const here = s.batches.filter((x) => x.stationId === st.id && isRunning(x));
  if (st.kind === 'kiln') {
    const used = here.reduce((a, x) => a + x.count, 0);
    return used + b.count <= kilnCapacity(s);
  }
  return here.length === 0;
}

export function startWork(s: GameState, t: number): void {
  // standing order: keep the pipeline fed
  if (s.standing && s.batches.length < STANDING_PIPELINE && !s.batches.some((b) => b.stage === 'prepare')) {
    const design = s.designs.find((d) => d.id === s.standing!.designId);
    if (design) startNewBatch(s, design, s.standing.batchSize, s.standing.autoBuy, (p) => newId(s, p));
    else s.standing = null;
  }
  // later stages first so the pipeline drains
  for (let i = STAGES.length - 1; i >= 0; i--) {
    const stage = STAGES[i];
    const kind = stationForStage(stage);
    for (const b of s.batches) {
      if (b.stage !== stage || isRunning(b) || b.blocked) continue;
      const st = stationsOfKind(s, kind).find((x) => canStartOn(s, x, b));
      if (!st) continue;
      b.stationId = st.id;
      b.startedAt = t;
      b.durationMs = stageDurationMs(s, b, st, t);
    }
  }
}

function blockedNeed(s: GameState): number {
  const blocked = s.batches.filter((b) => b.blocked);
  if (blocked.length === 0) return 0;
  const free = shelfCapacity(s) - goodsTotal(s);
  return Math.max(1, Math.min(...blocked.map((b) => b.count)) - free);
}

export function nextEventTime(s: GameState, t: number): number | null {
  let next: number | null = null;
  const consider = (x: number | null) => { if (x !== null && (next === null || x < next)) next = x; };
  for (const b of s.batches) if (isRunning(b) && !b.blocked) consider(Math.max(t, endOf(b)));
  const need = blockedNeed(s);
  if (need > 0) {
    const rate = stallRate(s);
    if (rate > 0 && stallStock(s) > 0) consider(t + Math.max(1, Math.ceil(((need - s.stallCarry) / rate) * MIN)));
  }
  consider(nextOrderTime(s, t));
  return next;
}

function sell(s: GameState, from: number, to: number): void {
  if (to <= from) return;
  const r = stallSalesBetween(s, from, to);
  if (s.away) { s.away.sold += r.sold; s.away.talerEarned = Math.round((s.away.talerEarned + r.taler) * 100) / 100; }
  if (r.sold > 0) tryUnblock(s);
}

function finishBatch(s: GameState, b: Batch): boolean {
  if (goodsTotal(s) + b.count > shelfCapacity(s)) { b.blocked = true; return false; }
  const design = s.designs.find((d) => d.id === b.designId);
  let effect: string | null = null;
  const glaze = design && s.glazes.find((g) => g.id === design.glazeId);
  if (glaze?.effect) {
    let chance = 0.6;
    for (const st of stationsOfKind(s, 'glazeTable')) for (const w of workersAt(s, st.id)) for (const tr of w.traits) chance += getTrait(tr).effectChanceAdd ?? 0;
    const [v, r] = nextRandom(s.rng);
    s.rng = r;
    if (v < chance) effect = glaze.effect;
  }
  addGoods(s, { designId: b.designId, quality: qualityTier(b.quality), effect, count: b.count });
  s.batches = s.batches.filter((x) => x !== b);
  s.stats.made += b.count;
  if (s.away) s.away.made += b.count;
  return true;
}

function tryUnblock(s: GameState): void {
  for (const b of s.batches.filter((x) => x.blocked)) {
    if (goodsTotal(s) + b.count <= shelfCapacity(s)) { b.blocked = false; finishBatch(s, b); }
  }
}

export function completeDue(s: GameState, t: number): void {
  const due = s.batches.filter((b) => isRunning(b) && !b.blocked && endOf(b) <= t).sort((a, b) => endOf(a) - endOf(b));
  for (const b of due) {
    const st = s.stations.find((x) => x.id === b.stationId);
    if (st && getStationDef(st.kind).usesWorkers) for (const w of workersAt(s, st.id)) w.xp += b.count;
    b.touch = undefined;
    if (b.stage === 'glazeFire') {
      finishBatch(s, b);
    } else {
      b.stage = STAGES[STAGES.indexOf(b.stage) + 1];
      b.startedAt = null;
      b.stationId = null;
      b.durationMs = 0;
    }
  }
  tryUnblock(s);
  const due2 = nextOrderTime(s, t);
  if (due2 !== null && due2 <= t) addOrder(s, t);
}
