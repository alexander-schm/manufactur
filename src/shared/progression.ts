import type { GameEvent } from './actions';
import { TRAITS, UNLOCKS } from './content';
import { pick } from './rng';
import type { GameState } from './types';

export interface Milestone { id: string; text: string; unlocks: string[]; done: (s: GameState) => boolean }

/** In rough order of a first session. */
export const MILESTONES: Milestone[] = [
  { id: 'firstSale', text: 'Dein erstes Stück ist verkauft!', unlocks: ['orders'], done: (s) => s.stats.sold >= 1 },
  { id: 'firstOrder', text: 'Erster Auftrag erledigt!', unlocks: ['studio'], done: (s) => s.stats.ordersDone >= 1 },
  { id: 'firstDesign', text: 'Dein erster eigener Entwurf!', unlocks: ['schale'], done: (s) => s.stats.designsSaved >= 1 },
  { id: 'made20', text: '20 Stücke gefertigt!', unlocks: ['hiring'], done: (s) => s.stats.made >= 20 },
  { id: 'firstExperiment', text: 'Dein erster Glasurversuch!', unlocks: ['recipes'], done: (s) => s.stats.experiments >= 1 },
  { id: 'ruf10', text: 'Man spricht über dich im Dorf (10 Ruf)!', unlocks: ['upgrades'], done: (s) => s.ruf >= 10 },
  { id: 'workers2', text: 'Zu zweit geht’s besser!', unlocks: ['teller'], done: (s) => s.workers.length >= 2 },
  { id: 'orders5', text: 'Fünf Aufträge erledigt – der Händler kommt vorbei!', unlocks: ['farbkoerper'], done: (s) => s.stats.ordersDone >= 5 },
  { id: 'firstEffect', text: 'Dein erster Glasureffekt!', unlocks: ['vase'], done: (s) => s.stats.effectsFound >= 1 },
  { id: 'ruf20', text: 'Deine Ware ist gefragt (20 Ruf)!', unlocks: ['formdetails'], done: (s) => s.ruf >= 20 },
    { id: 'ruf30', text: 'Bekannt im ganzen Tal (30 Ruf)!', unlocks: ['krug', 'patterns2'], done: (s) => s.ruf >= 30 },
  { id: 'orders10', text: 'Zehn zufriedene Kundschaften!', unlocks: ['kobalt'], done: (s) => s.stats.ordersDone >= 10 },
  { id: 'ruf45', text: 'Die alte Brennmeisterin verrät dir ein Geheimnis (45 Ruf)!', unlocks: ['reduktion'], done: (s) => s.ruf >= 45 },
  { id: 'ruf60', text: 'Eine richtige Manufaktur (60 Ruf)!', unlocks: ['room2'], done: (s) => s.ruf >= 60 },
  { id: 'ruf72', text: 'Man erkennt deine Stücke schon von Weitem (72 Ruf)!', unlocks: ['zeichen'], done: (s) => s.ruf >= 72 },
];

export const BOOST_AFTER_MS = 24 * 3_600_000;
export const BOOST_DURATION_MS = 30 * 60_000;
export const XP_PER_TRAIT = 150;
export const MAX_TRAITS = 3;

/** Mark the player as present; grants the welcome-back boost after long absences. Pure. */
export function touchSeen(state: GameState, now: number): GameState {
  if (now <= state.lastSeen) return state;
  const s = { ...state, lastSeen: now };
  if (now - state.lastSeen >= BOOST_AFTER_MS) s.boostUntil = now + BOOST_DURATION_MS;
  return s;
}

/** Apply milestone unlocks and worker growth to a copy; returns it with events. */
export function checkMilestones(state: GameState): { state: GameState; events: GameEvent[] } {
  if (!needsMilestoneWork(state)) return { state, events: [] };
  const s = structuredClone(state);
  return { state: s, events: applyMilestones(s) };
}

function traitsDue(xp: number, have: number): boolean {
  return have < MAX_TRAITS && have < 1 + Math.floor(xp / XP_PER_TRAIT);
}

function needsMilestoneWork(s: GameState): boolean {
  return MILESTONES.some((m) => !s.milestonesDone.includes(m.id) && m.done(s)) || s.workers.some((w) => traitsDue(w.xp, w.traits.length));
}

/** Same as checkMilestones but mutates in place (used inside the catch-up loop). */
export function applyMilestones(s: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (s.milestonesDone.length < MILESTONES.length) for (const m of MILESTONES) {
    if (!m.done(s) || s.milestonesDone.includes(m.id)) continue;
    s.milestonesDone.push(m.id);
    events.push({ kind: 'milestone', id: m.id, text: m.text });
    for (const u of m.unlocks) {
      if (!s.unlocks.includes(u)) {
        s.unlocks.push(u);
        events.push({ kind: 'unlock', id: u, text: `Freigeschaltet: ${UNLOCKS[u].title}` });
      }
    }
  }
  for (const w of s.workers) {
    while (traitsDue(w.xp, w.traits.length)) {
      const options = Object.keys(TRAITS).filter((t) => !w.traits.includes(t));
      if (options.length === 0) break;
      const [trait, r] = pick(s.rng, options);
      s.rng = r;
      w.traits.push(trait);
      events.push({ kind: 'levelUp', id: w.id, text: `${w.name} hat dazugelernt: ${TRAITS[trait].name}!` });
    }
  }
  return events;
}
