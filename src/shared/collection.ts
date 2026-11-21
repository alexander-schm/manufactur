import { BODIES, EFFECTS, EXTRA_COLORS, FORMS, bodyOf, tierRank } from './content';
import type { BodyId, GameState, Tier } from './types';

export interface CollectionEntry { key: string; form: string; body: BodyId; effect: string | null; tier: Tier }

export const collectionKey = (form: string, body: BodyId, effect: string | null): string => `${form}|${body}|${effect ?? '-'}`;

let entries: CollectionEntry[] | null = null;
let keys: Set<string> | null = null;

function build(): CollectionEntry[] {
  if (entries) return entries;
  const out: CollectionEntry[] = [];
  const higher = (a: Tier, b: Tier): Tier => (tierRank(a) >= tierRank(b) ? a : b);
  for (const f of Object.values(FORMS)) {
    for (const b of Object.values(BODIES)) {
      const tier = higher(b.tier, f.tier ?? 'werkstatt');
      const effects: (string | null)[] = [null];
      for (const e of Object.values(EFFECTS)) if (!e.body || e.body === b.id) effects.push(e.id);
      for (const effect of effects) out.push({ key: collectionKey(f.id, b.id, effect), form: f.id, body: b.id, effect, tier });
    }
  }
  entries = out;
  keys = new Set(out.map((e) => e.key));
  return out;
}

export function collectionEntries(): CollectionEntry[] {
  return build();
}

export const rowId = (body: BodyId, form: string): string => `r|${body}|${form}`;
export const colId = (body: BodyId, effect: string | null): string => `c|${body}|${effect ?? '-'}`;

function complete(s: GameState, members: CollectionEntry[]): boolean {
  const have = new Set(s.collection);
  for (const m of members) if (!have.has(m.key)) return false;
  return true;
}

/** Once a row/column is complete: the next colour, or, when all colours are owned, a visual gold stamp (`stamp|<group>`). */
function award(s: GameState, group: string, members: CollectionEntry[]): void {
  if (s.collectionRewards.includes(group) || !complete(s, members)) return;
  s.collectionRewards.push(group);
  const next = EXTRA_COLORS.find((c) => !s.unlocks.includes(c.unlock));
  if (next) s.unlocks.push(next.unlock);
  else s.collectionRewards.push(`stamp|${group}`);
}

export function recordCollection(s: GameState, form: string, body: BodyId, effect: string | null): void {
  const all = build();
  const key = collectionKey(form, body, effect);
  if (!keys!.has(key) || s.collection.includes(key)) return;
  s.collection.push(key);
  award(s, rowId(body, form), all.filter((e) => e.body === body && e.form === form));
  award(s, colId(body, effect), all.filter((e) => e.body === body && e.effect === effect));
}

export function collectionPercent(s: GameState, body?: BodyId): number {
  const all = build();
  if (!body) return Math.floor((100 * s.collection.length) / all.length);
  let total = 0;
  let found = 0;
  const have = new Set(s.collection);
  for (const e of all) if (e.body === body) { total++; if (have.has(e.key)) found++; }
  return total ? Math.floor((100 * found) / total) : 0;
}

/** Records every goods stack of the player's own designs (used by the v2 to v3 migration). */
export function seedCollection(s: GameState): void {
  for (const g of s.goods) {
    const d = s.designs.find((x) => x.id === g.designId);
    if (d && !d.origin) recordCollection(s, d.form, bodyOf(d), g.effect);
  }
}
