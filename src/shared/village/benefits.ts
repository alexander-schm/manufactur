import type { GameState, VillageSnapshot } from '../types';

/** Rathaus level 1-3: joint orders grow and pay better. */
export const RATHAUS_COUNT_MUL = [1.25, 1.5, 1.75];
export const RATHAUS_REWARD_MUL = [1.6, 2.2, 3];

/** Highest completed level of a village project, 0 when never built. */
export const levelOf = (levels: Record<string, number> | undefined, id: string): number => levels?.[id] ?? 0;

/** Dorfbrunnen level 1-3: Ruf per day for every member. */
export const BRUNNEN_RUF_PER_DAY = [3, 6, 10];
/** Museum: Ruf per own masterwork per day (level), counting at most this many. */
export const MUSEUM_MAX_COUNTED = 10;
/** Glockenturm level 1-3: Saturday market day, from MARKET_DAY_START_UTC_HOUR for this many hours at this sell factor. */
export const MARKET_DAY_HOURS = [3, 4, 6];
export const MARKET_DAY_FACTOR = [1.2, 1.35, 1.5];
export const MARKET_DAY_START_UTC_HOUR = 9;
/** Kaolingrube level 1-3: price factor for kaolin. */
export const KAOLIN_PRICE_FACTOR = [0.6, 0.45, 0.3];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Completed level of a village project in this workshop (0 without a village). */
export const projectLevel = (s: { village: VillageSnapshot | null }, id: string): number => levelOf(s.village?.projects, id);

/** Ruf per day from Dorfbrunnen and Museum (own masterworks). */
export function villageRufPerDay(s: GameState): number {
  const b = projectLevel(s, 'dorfbrunnen');
  const m = projectLevel(s, 'museum');
  return (b > 0 ? BRUNNEN_RUF_PER_DAY[b - 1] : 0) + m * Math.min(MUSEUM_MAX_COUNTED, s.masterworks.length);
}

/** Ruf trickles in whole points, the fraction is carried (deterministic, allocation-free). */
export function trickleVillageRuf(s: GameState, from: number, to: number): void {
  const v = s.village;
  if (!v?.projects || to <= from) return;
  const perDay = villageRufPerDay(s);
  if (perDay <= 0) return;
  const exact = (v.rufCarry ?? 0) + (perDay * (to - from)) / DAY;
  const n = Math.floor(exact);
  v.rufCarry = exact - n;
  if (n > 0) s.ruf += n;
}

/** Saturday (epoch day % 7 === 2), from 09:00 UTC for the Glockenturm's hours. */
export function marketDayAt(s: GameState, t: number): { factor: number; endsAt: number } | null {
  const lv = projectLevel(s, 'glockenturm');
  if (lv <= 0) return null;
  const day = Math.floor(t / DAY);
  if (day % 7 !== 2) return null;
  const start = day * DAY + MARKET_DAY_START_UTC_HOUR * HOUR;
  const end = start + MARKET_DAY_HOURS[lv - 1] * HOUR;
  return t >= start && t < end ? { factor: MARKET_DAY_FACTOR[lv - 1], endsAt: end } : null;
}

/** The next instant after t at which the market day starts or ends; null without a Glockenturm. */
export function nextMarketEdge(s: GameState, t: number): number | null {
  const lv = projectLevel(s, 'glockenturm');
  if (lv <= 0) return null;
  const len = MARKET_DAY_HOURS[lv - 1] * HOUR;
  for (let d = Math.floor(t / DAY); d <= Math.floor(t / DAY) + 7; d++) {
    if (d % 7 !== 2) continue;
    const start = d * DAY + MARKET_DAY_START_UTC_HOUR * HOUR;
    if (start > t) return start;
    if (start + len > t) return start + len;
  }
  return null;
}

/** Kaolingrube: kaolin price factor (1 without it). */
export function kaolinFactor(s: GameState): number {
  const lv = projectLevel(s, 'kaolingrube');
  return lv > 0 ? KAOLIN_PRICE_FACTOR[lv - 1] : 1;
}
