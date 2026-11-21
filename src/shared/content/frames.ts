export interface FrameDef { id: string; name: string; unlock: string }

/** Maker-mark frames, each unlocked by a milestone of the Manufaktur range. */
export const FRAMES: Record<string, FrameDef> = Object.fromEntries(
  ([['punkte', 'Punktekranz'], ['doppel', 'Doppelring'], ['kranz', 'Lorbeerkranz'], ['sonne', 'Sonnenstrahlen'], ['gold', 'Goldring'], ['krone', 'Krone']] as const)
    .map(([id, name]) => [id, { id, name, unlock: `rahmen-${id}` }]),
);
