import { BODIES } from '../../src/shared/content';
import { MILESTONES } from '../../src/shared/progression';
import { newGame } from '../../src/shared/state';
import type { GameState } from '../../src/shared/types';

export const T0 = 1_800_000_000_000;

/** A fresh game whose single worker has no traits, for predictable numbers. */
export function plainGame(seed = 1): GameState {
  const s = newGame('p1', seed, T0);
  s.workers = s.workers.map((w) => ({ ...w, traits: [] }));
  return s;
}

/** A game already in the Manufaktur tier, all stations at level 5, with every milestone that currently holds acknowledged. */
export function manufakturGame(seed = 1): GameState {
  const s = plainGame(seed);
  s.tier = 'manufaktur';
  for (const u of ['studio', 'farbkoerper', 'reduktion', 'patterns2', 'formdetails', 'schale', 'teller', 'vase', 'krug', 'upgrades', 'steinzeug', 'teekanne', 'meisterstuecke']) {
    if (!s.unlocks.includes(u)) s.unlocks.push(u);
  }
  for (const st of s.stations) st.level = 5;
  s.ruf = 400;
  s.taler = 100000;
  s.materials.steinzeugton = 100;
  s.glazes.push(structuredClone(BODIES.steinzeug.starterGlaze!));
  const held = MILESTONES.filter((m) => m.done(s)).map((m) => m.id);
  s.milestonesDone = [...held];
  s.milestonesAcked = [...held];
  return s;
}

/** A plain game with a standing order of 6 of the first design. */
export function withStanding(seed = 1): GameState {
  const s = plainGame(seed);
  s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
  s.stallDesignIds = [];
  return s;
}
