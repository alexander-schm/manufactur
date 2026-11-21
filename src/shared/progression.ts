import type { GameEvent } from './actions';
import { collectionPercent } from './collection';
import { EFFECTS, TRAITS, UNLOCKS, tierAtLeast } from './content';
import { PRESTIGE_RANK } from './masterwork';
import { pick } from './rng';
import type { GameState, Tier } from './types';
import { DECOR, grantDecor } from './village/decor';

export interface Milestone {
  id: string; text: string; unlocks: string[]; done: (s: GameState) => boolean;
  /** set on tier milestones: the celebration card shows the new tier */
  tier?: Tier;
  /** decor ids handed out with the milestone */
  decor?: string[];
}

// done() checks run on every catch-up event: plain loops, no allocation.
const hasBodyEffect = (s: GameState): boolean => {
  for (const g of s.glazes) if (g.effect && EFFECTS[g.effect]?.body) return true;
  return false;
};
const hasEffect = (s: GameState, id: string): boolean => {
  for (const g of s.glazes) if (g.effect === id) return true;
  return false;
};
const allBodyEffects = (s: GameState, body: string): boolean => {
  for (const id in EFFECTS) if (EFFECTS[id].body === body && !hasEffect(s, id)) return false;
  return true;
};
const hasStoneware = (s: GameState): boolean => {
  for (const k of s.collection) if (k.includes('|steinzeug|')) return true;
  return false;
};
const hasPrestige = (s: GameState, rank: number): boolean => {
  for (const r of s.masterworks) if (PRESTIGE_RANK[r.prestige] >= rank) return true;
  return false;
};

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
  { id: 'ruf60', text: 'Die Werkstatt wächst (60 Ruf)!', unlocks: ['room2'], done: (s) => s.ruf >= 60 },
  { id: 'ruf72', text: 'Man erkennt deine Stücke schon von Weitem (72 Ruf)!', unlocks: ['zeichen'], done: (s) => s.ruf >= 72 },
  { id: 'ruf250', text: 'Weit über das Tal hinaus bekannt (250 Ruf)!', unlocks: ['rahmen-punkte'], done: (s) => s.ruf >= 250 },
  { id: 'tierManufaktur', tier: 'manufaktur', text: 'Aus der Werkstatt wird eine Manufaktur!', unlocks: ['steinzeug', 'teekanne', 'meisterstuecke'], done: (s) => tierAtLeast(s, 'manufaktur') },
  { id: 'firstStoneware', text: 'Dein erstes Stück aus Steinzeug!', unlocks: [], decor: ['steinzeugtopf'], done: hasStoneware },
  { id: 'ruf400', text: 'Händler fragen nach deinem Namen (400 Ruf)!', unlocks: ['muster-ranken'], done: (s) => s.ruf >= 400 },
  { id: 'firstBodyEffect', text: 'Ein Effekt, den nur ein besonderer Ton kann!', unlocks: ['mangan'], done: hasBodyEffect },
  { id: 'ruf600', text: 'Sammler reisen extra an (600 Ruf)!', unlocks: ['kunde-sammlerin'], done: (s) => s.ruf >= 600 },
  { id: 'allStonewareEffects', text: 'Alle Steinzeug-Effekte entdeckt!', unlocks: [], decor: ['glasurproben'], done: (s) => allBodyEffects(s, 'steinzeug') },
  { id: 'sammlung25', text: 'Ein Viertel der Sammlung!', unlocks: ['rahmen-doppel'], done: (s) => collectionPercent(s) >= 25 },
  { id: 'sammlung50', text: 'Die halbe Sammlung!', unlocks: [], decor: ['papierlampions'], done: (s) => collectionPercent(s) >= 50 },
  { id: 'sammlung75', text: 'Drei Viertel der Sammlung!', unlocks: ['muster-karo'], done: (s) => collectionPercent(s) >= 75 },
  { id: 'sammlung100', text: 'Die Sammlung ist vollständig!', unlocks: ['rahmen-kranz'], done: (s) => collectionPercent(s) >= 100 },
  { id: 'firstMasterwork', text: 'Dein erstes Meisterstück!', unlocks: [], decor: ['meisterbrief'], done: (s) => s.masterworks.length >= 1 },
  { id: 'masterworkSilver', text: 'Ein Meisterstück in Silber!', unlocks: ['rahmen-sonne'], done: (s) => hasPrestige(s, PRESTIGE_RANK.silver) },
  { id: 'masterworkGold', text: 'Ein Meisterstück in Gold!', unlocks: ['rahmen-gold'], done: (s) => hasPrestige(s, PRESTIGE_RANK.gold) },
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
    if (s.milestonesDone.includes(m.id) || !m.done(s)) continue;
    s.milestonesDone.push(m.id);
    events.push({ kind: 'milestone', id: m.id, text: m.text });
    for (const u of m.unlocks) {
      if (!s.unlocks.includes(u)) {
        s.unlocks.push(u);
        events.push({ kind: 'unlock', id: u, text: `Freigeschaltet: ${UNLOCKS[u].title}` });
      }
    }
    for (const d of m.decor ?? []) if (grantDecor(s, d)) events.push({ kind: 'unlock', id: d, text: `Neue Dekoration: ${DECOR[d].name}` });
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
