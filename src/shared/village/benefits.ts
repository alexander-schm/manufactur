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
