import type { Action } from '../../shared/actions';
import { appeal } from '../../shared/design';
import { EXTRA_COLORS, FORMS, bodyOf } from '../../shared/content';
import type { BodyId, Design, FiringSettings, GameState, GlazeRecipe, Order, ProfileParams } from '../../shared/types';
import { designDifficulty } from '../../shared/design';

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));

export function clampProfile(p: ProfileParams): ProfileParams {
  return { height: clamp01(p.height), belly: clamp01(p.belly), neck: clamp01(p.neck), foot: clamp01(p.foot), rim: clamp01(p.rim) };
}

export function saveActionFor(draft: Design): Extract<Action, { type: 'saveDesign' }> {
  return { type: 'saveDesign', design: { ...draft, name: draft.name.trim() || 'Ohne Namen', profile: clampProfile(draft.profile) } };
}

export type ExperimentForm = { base: GlazeRecipe['base']; colorant: string | null; colorantPct: number; temp: FiringSettings['temp']; atmosphere: FiringSettings['atmosphere']; cooling: FiringSettings['cooling']; body: BodyId };

export function experimentActionFor(f: ExperimentForm): Extract<Action, { type: 'experiment' }> {
  return {
    type: 'experiment',
    recipe: { base: f.base, body: f.body, colorant: f.colorant, colorantPct: f.colorant ? Math.round(f.colorantPct) : 0, firing: { temp: f.temp, atmosphere: f.atmosphere, cooling: f.cooling } },
  };
}

export function topFans(s: GameState, draft: Design): { order: Order; appeal: number }[] {
  const glaze = s.glazes.find((g) => g.id === draft.glazeId);
  return s.orders
    .map((order) => ({ order, appeal: appeal(draft, glaze, order.taste) * (order.form === draft.form ? 1 : 0.4) }))
    .filter((x) => x.appeal > 0)
    .sort((a, b) => b.appeal - a.appeal)
    .slice(0, 3);
}

export function difficultyLabel(d: Design): string {
  const v = designDifficulty(d);
  return v < 1.15 ? 'leicht' : v < 1.5 ? 'mittel' : 'knifflig';
}

export const PRESETS: { name: string; profile: (base: ProfileParams) => ProfileParams }[] = [
  { name: 'Klassisch', profile: (b) => ({ ...b }) },
  { name: 'Schlank', profile: (b) => clampProfile({ ...b, height: b.height + 0.25, belly: b.belly - 0.2, neck: b.neck - 0.1 }) },
  { name: 'Bauchig', profile: (b) => clampProfile({ ...b, height: b.height - 0.1, belly: b.belly + 0.3, neck: b.neck - 0.05 }) },
  { name: 'Keck', profile: (b) => clampProfile({ ...b, rim: b.rim + 0.35, foot: b.foot - 0.2, neck: b.neck - 0.15 }) },
];

export const PATTERN_COLORS = ['#fff8ec', '#2b2420', '#e9708d', '#4f9cc4', '#f2b84b', '#7fb85c', '#9a7ccf', '#d9674c'];

/** Pattern and mark colours: the basic set plus every colour won from the collection book. */
export function patternColorsFor(s: GameState): string[] {
  return [...PATTERN_COLORS, ...EXTRA_COLORS.filter((c) => s.unlocks.includes(c.unlock)).map((c) => c.color)];
}

/** Change the clay body of a draft; the glaze stays if it fits, else the first own glaze of that body. */
export function switchBody(s: GameState, draft: Design, body: BodyId): Design {
  const current = s.glazes.find((g) => g.id === draft.glazeId);
  if (current && bodyOf(current) === body) return { ...draft, body };
  const fitting = s.glazes.find((g) => bodyOf(g) === body);
  return { ...draft, body, glazeId: fitting ? fitting.id : draft.glazeId };
}

/** Change the form of a draft: its default profile, a handle only where allowed, and an animal for forms with variants (kept if still valid). */
export function switchForm(draft: Design, formId: string): Design {
  const f = FORMS[formId];
  const { variant, ...rest } = draft;
  const next: Design = { ...rest, form: f.id, profile: { ...f.profileDefaults }, handle: f.handleAllowed ? (draft.handle === 'none' ? 'round' : draft.handle) : 'none' };
  if (f.variants) next.variant = f.variants.some((v) => v.id === variant) ? variant : f.variants[0].id;
  return next;
}
