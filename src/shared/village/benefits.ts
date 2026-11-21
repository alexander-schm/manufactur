/** Rathaus level 1-3: joint orders grow and pay better. */
export const RATHAUS_COUNT_MUL = [1.25, 1.5, 1.75];
export const RATHAUS_REWARD_MUL = [1.6, 2.2, 3];

/** Highest completed level of a village project, 0 when never built. */
export const levelOf = (levels: Record<string, number> | undefined, id: string): number => levels?.[id] ?? 0;
