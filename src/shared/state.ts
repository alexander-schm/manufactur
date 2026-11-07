import { FORMS, NAMES, TRAITS } from './content';
import { newId } from './ids';
import { addOrder } from './orders';
import { nextRandom, pick } from './rng';
import type { Design, GameState, GlazeRecipe, Station, StationKind, Worker } from './types';

export const SCHEMA_VERSION = 1;

export { newId };

const TRAIT_IDS = Object.keys(TRAITS);

/** Generate a worker from the state's rng (advances state.rng). */
export function rollWorker(state: GameState): Worker {
  const [seedV, r1] = nextRandom(state.rng);
  const seed = Math.floor(seedV * 0xffffffff) >>> 0;
  const [name, r2] = pick(r1, NAMES);
  const [trait, r3] = pick(r2, TRAIT_IDS);
  state.rng = r3;
  return { id: newId(state, 'w'), seed, name, traits: [trait], xp: 0, stationId: null };
}

export const STARTER_GLAZE: GlazeRecipe = {
  id: 'klar', name: 'Klare Glasur', base: 'transparent', colorant: null, colorantPct: 0,
  firing: { temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#e9c9a6', effect: null,
};

const ROOM1: StationKind[] = ['prepBench', 'wheel', 'dryingRack', 'kiln', 'glazeTable', 'shelf', 'marketStall'];

export function newGame(playerId: string, seed: number, now: number): GameState {
  const s: GameState = {
    schemaVersion: SCHEMA_VERSION, version: 0, playerId, createdAt: now, lastTick: now, rng: seed >>> 0,
    taler: 100, ruf: 0, materials: { ton: 30, glasurbasis: 10 },
    stations: [], workers: [], hirePool: [], batches: [], designs: [], glazes: [STARTER_GLAZE], goods: [],
    standing: null, orders: [], stallDesignIds: [], unlocks: ['becher'], milestonesDone: [], milestonesAcked: [],
    boostUntil: 0, lastSeen: now, away: null, cooldowns: {}, avatarSeed: seed >>> 0,
    makerMark: { shape: 'circle', letter: 'M', color: '#b44c36' }, nextId: 1,
    stats: { made: 0, sold: 0, ordersDone: 0, experiments: 0, designsSaved: 0, effectsFound: 0 },
    lastOrderAt: now, stallCarry: 0,
  };
  s.stations = ROOM1.map((kind, slot): Station => ({ id: newId(s, 's'), kind, level: 1, slot }));
  const first = rollWorker(s);
  first.stationId = s.stations.find((x) => x.kind === 'wheel')!.id;
  s.workers.push(first);
  for (let i = 0; i < 3; i++) s.hirePool.push(rollWorker(s));
  const design: Design = {
    id: newId(s, 'd'), name: 'Erster Becher', form: 'becher', profile: { ...FORMS.becher.profileDefaults },
    handle: 'round', rim: 'plain', glazeId: 'klar', pattern: 'none', patternColor: '#2b2420',
  };
  s.designs.push(design);
  s.stallDesignIds = [design.id];
  addOrder(s, now);
  addOrder(s, now);
  return s;
}

const REQUIRED_KEYS: (keyof GameState)[] = ['schemaVersion', 'version', 'playerId', 'lastTick', 'rng', 'stations', 'workers', 'batches', 'designs', 'goods'];

/** Validate and upgrade a stored state to the current schema. */
export function migrateState(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Ungültiger Spielstand');
  const s = raw as GameState;
  for (const k of REQUIRED_KEYS) if (!(k in s)) throw new Error(`Spielstand unvollständig: ${String(k)}`);
  if (s.schemaVersion > SCHEMA_VERSION) throw new Error('Spielstand ist neuer als das Spiel');
  // future: step-wise upgrades `if (s.schemaVersion === 1) { ...; s.schemaVersion = 2 }`
  return s;
}
