import { colId, collectionEntries, rowId } from '../../shared/collection';
import { BODIES, EFFECTS, EXTRA_COLORS, FORMS, getTier, tierRank } from '../../shared/content';
import { discoveredEffects } from '../../shared/discovery';
import type { BodyId, Design, GameState } from '../../shared/types';

export interface CollectionCell {
  key: string;
  found: boolean;
  title: string;
  look: { design: Pick<Design, 'form' | 'profile' | 'handle' | 'rim' | 'pattern' | 'patternColor' | 'body' | 'variant'>; glazeColor: string; effect: string | null };
}

const defaultLook = (form: string, body: BodyId): CollectionCell['look']['design'] =>
  ({ form, profile: { ...FORMS[form].profileDefaults }, handle: 'none', rim: 'plain', pattern: 'none', patternColor: '#fff8ec', body, ...(FORMS[form].variants ? { variant: FORMS[form].variants![0].id } : {}) });

/** One page of the book: rows are forms, columns are "no effect" plus every effect possible on that body. */
export function collectionGrid(s: GameState, body: BodyId): { forms: string[]; effects: (string | null)[]; effectLabels: string[]; cells: CollectionCell[][] } {
  const page = collectionEntries().filter((e) => e.body === body);
  const forms = [...new Set(page.map((e) => e.form))];
  const effects = [...new Set(page.map((e) => e.effect))];
  const known = discoveredEffects(s);
  const effectLabels = effects.map((e) => (e === null ? 'ohne' : known.includes(e) ? EFFECTS[e].name : '?'));
  const have = new Set(s.collection);
  const own = s.designs.filter((d) => !d.origin && (d.body ?? 'irdenware') === body);
  const glazes = s.glazes.filter((g) => (g.body ?? 'irdenware') === body);
  const cells = forms.map((form) => effects.map((effect): CollectionCell => {
    const entry = page.find((e) => e.form === form && e.effect === effect)!;
    if (!have.has(entry.key)) {
      const title = tierRank(entry.tier) > tierRank(s.tier) ? `Braucht: ${getTier(entry.tier).name}` : 'Noch nicht gefunden';
      return { key: entry.key, found: false, title, look: { design: defaultLook(form, body), glazeColor: BODIES[body].clearColor, effect: null } };
    }
    const d = own.filter((x) => x.form === form).at(-1);
    const glaze = [...glazes].reverse().find((g) => g.effect === effect);
    const design = d ? { form, profile: d.profile, handle: d.handle, rim: d.rim, pattern: d.pattern, patternColor: d.patternColor, body, variant: d.variant } : defaultLook(form, body);
    const title = `${FORMS[form].name} · ${effect ? EFFECTS[effect].name : 'ohne Effekt'}`;
    return { key: entry.key, found: true, title, look: { design, glazeColor: glaze?.color ?? BODIES[body].clearColor, effect } };
  }));
  return { forms, effects, effectLabels, cells };
}

/** Row label: the form's name once the player can make it, else "?". */
export const formLabel = (s: GameState, form: string): string => (s.unlocks.includes(FORMS[form].unlock) ? FORMS[form].name : '?');

export type GroupPrize = { kind: 'ribbon'; color: string } | { kind: 'stamp' };

/**
 * The prize each completed row/column won, keyed by group id. Colours are only ever won here and in
 * EXTRA_COLORS order, so the n-th group without a stamp won the n-th colour.
 */
export function groupPrizes(s: GameState): Map<string, GroupPrize> {
  const out = new Map<string, GroupPrize>();
  let n = 0;
  for (const g of s.collectionRewards) {
    if (g.startsWith('stamp|')) continue;
    if (s.collectionRewards.includes(`stamp|${g}`)) out.set(g, { kind: 'stamp' });
    else out.set(g, { kind: 'ribbon', color: EXTRA_COLORS[n++]?.color ?? '#d4a531' });
  }
  return out;
}

export const rowPrize = (prizes: Map<string, GroupPrize>, body: BodyId, form: string) => prizes.get(rowId(body, form));
export const colPrize = (prizes: Map<string, GroupPrize>, body: BodyId, effect: string | null) => prizes.get(colId(body, effect));
