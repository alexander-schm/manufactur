import type { SurpriseDef } from './types';

/** Each later task appends its defs here. */
export const SURPRISES: SurpriseDef[] = [
  // the cat: a pet purrs; petting five times in a row earns a swat instead of anything else
  { id: 'katze-streicheln', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 2500, album: ['katze-streicheln'] },
  { id: 'katze-beleidigt', where: 'workshop', trigger: { kind: 'click', target: 'cat', combo: { count: 5, withinMs: 4000 } }, rarity: 'C', durationMs: 2000, album: ['katze-beleidigt'] },
];
