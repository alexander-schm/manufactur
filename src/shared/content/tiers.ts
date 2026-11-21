import type { Tier } from '../types';

export interface TierDef { id: Tier; name: string; price: number; ruf: number; maxStationLevel: number }

export const TIER_ORDER: Tier[] = ['werkstatt', 'manufaktur', 'hofmanufaktur'];

export const TIERS: TierDef[] = [
  { id: 'werkstatt', name: 'Werkstatt', price: 0, ruf: 0, maxStationLevel: 5 },
  { id: 'manufaktur', name: 'Manufaktur', price: 50000, ruf: 300, maxStationLevel: 7 },
];

export const tierRank = (t: Tier): number => TIER_ORDER.indexOf(t);

export const tierAtLeast = (s: { tier: Tier }, t: Tier): boolean => tierRank(s.tier) >= tierRank(t);

export function getTier(t: Tier): TierDef {
  const d = TIERS.find((x) => x.id === t);
  if (!d) throw new Error(`Unbekannt: Stufe "${t}"`);
  return d;
}

/** The next tier that exists in TIERS, or null at the top. */
export function nextTier(s: { tier: Tier }): TierDef | null {
  const rank = tierRank(s.tier);
  return TIERS.find((x) => tierRank(x.id) > rank) ?? null;
}

/** First tier whose station cap reaches `level`. */
export const tierForLevel = (level: number): TierDef | undefined => TIERS.find((x) => x.maxStationLevel >= level);
