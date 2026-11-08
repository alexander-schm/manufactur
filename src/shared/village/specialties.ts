import { MATERIALS, own } from '../content';
import { pick } from '../rng';
import type { GameState } from '../types';

export interface SpecialtyDef { material: string; name: string; yieldPerHour: number; prop: 'clay' | 'ore' | 'copper' | 'crystal' | 'wood' }

/** Each village member's land has one of these. */
export const SPECIALTIES: Record<string, SpecialtyDef> = {
  ton: { material: 'ton', name: 'Rote Tongrube', yieldPerHour: 40, prop: 'clay' },
  eisenoxid: { material: 'eisenoxid', name: 'Eisenerz', yieldPerHour: 6, prop: 'ore' },
  kupferoxid: { material: 'kupferoxid', name: 'Kupfermine', yieldPerHour: 5, prop: 'copper' },
  kobalt: { material: 'kobalt', name: 'Kobaltader', yieldPerHour: 3, prop: 'crystal' },
  holz: { material: 'holz', name: 'Buchenwald', yieldPerHour: 30, prop: 'wood' },
};

export const OWN_SPECIALTY_FACTOR = 0.3;
export const FOREIGN_SPECIALTY_FACTOR = 2;
export const VILLAGE_STORE_FACTOR = 3;

/** The specialty the village has least of (ties broken by seed). */
export function assignSpecialty(taken: string[], seed: number): string {
  const ids = Object.keys(SPECIALTIES);
  const count = (id: string) => taken.filter((t) => t === id).length;
  const min = Math.min(...ids.map(count));
  return pick(seed >>> 0, ids.filter((id) => count(id) === min))[0];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What this player pays per unit at Hedwig's shop. */
export function shopPrice(state: GameState, material: string): number {
  const m = own(MATERIALS, material);
  if (!m) return Infinity;
  const v = state.village;
  let price = m.price;
  if (v?.specialty === material) price = Math.ceil(m.price * OWN_SPECIALTY_FACTOR);
  // basic clay stays affordable for everyone; colourants and wood are what you trade for
  else if (v && v.members >= 2 && own(SPECIALTIES, material) && (m.kind === 'colorant' || m.kind === 'fuel')) price = m.price * FOREIGN_SPECIALTY_FACTOR;
  if (material === 'ton' && v?.buildings.includes('tongrube')) price *= 0.8;
  return round2(price);
}

/** Always available, never blocked by an absent friend — but expensive. */
export function villageStorePrice(material: string): number {
  const m = own(MATERIALS, material);
  return m ? m.price * VILLAGE_STORE_FACTOR : Infinity;
}
