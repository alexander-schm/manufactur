import type { SurpriseDef } from './types';

/** Each later task appends its defs here. */
export const SURPRISES: SurpriseDef[] = [
  // the cat: a pet purrs; petting five times in a row earns a swat instead of anything else
  { id: 'katze-streicheln', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 2500, album: ['katze-streicheln'] },
  { id: 'katze-beleidigt', where: 'workshop', trigger: { kind: 'click', target: 'cat', combo: { count: 5, withinMs: 4000 } }, rarity: 'C', durationMs: 2000, album: ['katze-beleidigt'] },
  // the seasons
  { id: 'silvester', where: 'window', trigger: { kind: 'calendar' }, rarity: 'L', durationMs: 0, when: (c) => c.mood.newYear, album: ['silvester'] },
  { id: 'geburtstag', where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'L', durationMs: 0, when: (c) => c.mood.birthday, album: ['geburtstag'] },
  // the time of day
  { id: 'abendlicht', where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'C', durationMs: 0, when: (c) => c.mood.daypart === 'evening', album: ['abendlicht'] },
  { id: 'eule', where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 5 * 60_000, when: (c) => c.mood.daypart === 'night', album: ['eule'] },
  { id: 'morgenvoegel', where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 3 * 60_000, when: (c) => c.mood.daypart === 'morning', album: ['morgenvoegel'] },
  { id: 'dezember', where: 'window', trigger: { kind: 'calendar' }, rarity: 'R', durationMs: 0, when: (c) => c.mood.december, album: ['dezember'] },
];
