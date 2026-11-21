import type { GameState, Prestige } from '../types';
import type { MuseumPiece } from './types';

/** How many masterworks each member shows in the village museum. */
export const MUSEUM_PER_MEMBER = 6;

const PRESTIGE_RANK: Record<Prestige, number> = { bronze: 0, silver: 1, gold: 2 };

/** A member's museum shelf: best prestige first, then newest, at most MUSEUM_PER_MEMBER. */
export function museumEntries(s: GameState): MuseumPiece[] {
  return [...s.masterworks]
    .sort((a, b) => PRESTIGE_RANK[b.prestige] - PRESTIGE_RANK[a.prestige] || b.finishedAt - a.finishedAt)
    .slice(0, MUSEUM_PER_MEMBER)
    .map(({ id, design, glazeColor, effect, quality, prestige, patronName, finishedAt }) => ({ id, design: structuredClone(design), glazeColor, effect, quality, prestige, patronName, finishedAt }));
}
