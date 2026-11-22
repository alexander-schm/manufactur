import type { GameState, StationKind } from '../../shared/types';
import type { SurpriseDef } from './types';

/** Whether the room-1 station of this kind (slots 0–6) has a running batch. */
const busyInRoom1 = (s: GameState, kind: StationKind) => {
  const st = s.stations.find((x) => x.kind === kind && x.slot < 7);
  return !!st && s.batches.some((b) => b.stationId === st.id && b.startedAt !== null);
};

/** Each later task appends its defs here. */
export const SURPRISES: SurpriseDef[] = [
  // the cat: a pet purrs; petting five times in a row earns a swat instead of anything else
  { id: 'katze-streicheln', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 2500, album: ['katze-streicheln'] },
  { id: 'katze-beleidigt', where: 'workshop', trigger: { kind: 'click', target: 'cat', combo: { count: 5, withinMs: 4000 } }, rarity: 'C', durationMs: 2000, album: ['katze-beleidigt'] },
  // the cat about the workshop: a nap on the firing kiln, a fresh pot to sit in, a gift, a nudged pot that a worker catches
  { id: 'katze-ofen', where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 4 * 60_000, when: (c) => busyInRoom1(c.s, 'kiln'), album: ['katze-ofen'] },
  { id: 'katze-topf', where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 90_000, when: (c) => busyInRoom1(c.s, 'wheel'), album: ['katze-topf'] },
  { id: 'katze-geschenk', where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 60_000, album: ['katze-geschenk'] },
  { id: 'katze-schubs', where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'R', durationMs: 4000, when: (c) => c.s.goods.some((g) => g.count > 0) && c.s.workers.length > 0, album: ['katze-schubs'] },
  // the seasons
  { id: 'silvester', where: 'window', trigger: { kind: 'calendar' }, rarity: 'L', durationMs: 0, when: (c) => c.mood.newYear, album: ['silvester'] },
  { id: 'geburtstag', where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'L', durationMs: 0, when: (c) => c.mood.birthday, album: ['geburtstag'] },
  // the time of day
  { id: 'abendlicht', where: 'workshop', trigger: { kind: 'calendar' }, rarity: 'C', durationMs: 0, when: (c) => c.mood.daypart === 'evening', album: ['abendlicht'] },
  { id: 'eule', where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 5 * 60_000, when: (c) => c.mood.daypart === 'night', album: ['eule'] },
  { id: 'morgenvoegel', where: 'window', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 3 * 60_000, when: (c) => c.mood.daypart === 'morning', album: ['morgenvoegel'] },
  { id: 'dezember', where: 'window', trigger: { kind: 'calendar' }, rarity: 'R', durationMs: 0, when: (c) => c.mood.december, album: ['dezember'] },
];
