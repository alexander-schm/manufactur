import { newGame } from '../../src/shared/state';
import type { GameState } from '../../src/shared/types';

export const T0 = 1_800_000_000_000;

/** A fresh game whose single worker has no traits, for predictable numbers. */
export function plainGame(seed = 1): GameState {
  const s = newGame('p1', seed, T0);
  s.workers = s.workers.map((w) => ({ ...w, traits: [] }));
  return s;
}
