import { EFFECTS, MATERIALS, own, type RecipeInput } from './content';
import { COLOR_FAMILY_NAMES, colorFamily } from './design';
import { newId } from './ids';
import type { GameState, GlazeRecipe } from './types';

const BASE_COLOR: Record<GlazeRecipe['base'], string> = { transparent: '#e9c9a6', matt: '#e6dcc6', opak: '#f4efe4' };
const BASE_LABEL: Record<GlazeRecipe['base'], string> = { transparent: 'transparent', matt: 'matt', opak: 'deckend' };

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const x = parse(a), y = parse(b);
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Colour ramps: [light, deep] reached at 1 % and 10 %. */
function colorantColor(r: RecipeInput): string | null {
  const p = r.colorantPct;
  if (!r.colorant || p <= 0) return null;
  const t = (p - 1) / 9;
  const reduced = r.firing.atmosphere === 'reduzierend';
  switch (r.colorant) {
    case 'kobalt': return mix('#8fb6e3', '#1d3478', t);
    case 'kupferoxid': return reduced ? mix('#d8606c', '#7c1622', t) : mix('#86c79a', '#22663e', t);
    case 'eisenoxid':
      if (p <= 3) return reduced ? mix('#b9d6b0', '#8fb89a', t * 3) : mix('#e2c27a', '#c99a4a', t * 3);
      if (p <= 6) return mix('#a8673a', '#6e3a1e', (p - 4) / 2);
      return mix('#3a271d', '#1e1612', (p - 7) / 3);
    default: return null;
  }
}

export function glazeColor(r: RecipeInput): string {
  const base = BASE_COLOR[r.base];
  const c = colorantColor(r);
  if (!c) return r.firing.temp === 'hoch' && r.base === 'transparent' ? '#e3bf98' : base;
  if (r.base === 'opak') return mix(c, '#ffffff', 0.12);
  if (r.base === 'matt') return mix(c, '#d9d2c4', 0.22);
  return c;
}

/** The most specific effect whose conditions all hold. */
export function matchEffect(r: RecipeInput): string | null {
  const all = Object.values(EFFECTS).sort((a, b) => b.conditions.length - a.conditions.length);
  for (const e of all) if (e.conditions.every((c) => c.test(r))) return e.id;
  return null;
}

export function discoveredEffects(state: GameState): string[] {
  return [...new Set(state.glazes.map((g) => g.effect).filter((e): e is string => !!e))];
}

/** A German hint toward the closest undiscovered effect. */
export function hintFor(r: RecipeInput, state: GameState): string | null {
  const known = discoveredEffects(state);
  let best: { name: string; hint: string; missing: string[]; matched: number } | null = null;
  for (const e of Object.values(EFFECTS)) {
    if (known.includes(e.id)) continue;
    const missing = e.conditions.filter((c) => !c.test(r)).map((c) => c.label);
    if (missing.length === 0) continue;
    const matched = e.conditions.length - missing.length;
    // fewest missing wins; on a tie, the one the player is already more invested in
    if (!best || missing.length < best.missing.length || (missing.length === best.missing.length && matched > best.matched)) {
      best = { name: e.name, hint: e.hint, missing, matched };
    }
  }
  if (!best) return null;
  if (best.missing.length === 1) return `So nah dran! Für ${best.name} fehlt nur noch: ${best.missing[0]}.`;
  return best.hint;
}

export function glazeName(r: RecipeInput, effect: string | null): string {
  if (effect) return EFFECTS[effect].name;
  const fam = COLOR_FAMILY_NAMES[colorFamily(glazeColor(r))];
  const mat = r.colorant ? `${MATERIALS[r.colorant].name} ${r.colorantPct} %` : 'ohne Farbe';
  return `${fam} (${BASE_LABEL[r.base]}, ${mat})`;
}

export const EXPERIMENT_COST = { glasurbasis: 2, colorant: 1 };

const sameRecipe = (a: RecipeInput, b: RecipeInput) =>
  a.base === b.base && a.colorant === b.colorant && (a.colorant === null || a.colorantPct === b.colorantPct) &&
  a.firing.temp === b.firing.temp && a.firing.atmosphere === b.firing.atmosphere && a.firing.cooling === b.firing.cooling;

export type ExperimentOutcome = { glaze: GlazeRecipe; isNew: boolean; newEffect: string | null; hint: string | null };

/** Validate input; returns a German error message or null. */
export function validateRecipe(r: RecipeInput, state: GameState): string | null {
  if (!r || typeof r !== 'object') return 'Ungültiges Rezept';
  if (!['transparent', 'matt', 'opak'].includes(r.base)) return 'Unbekannte Glasurbasis';
  if (r.colorant !== null) {
    const m = own(MATERIALS, r.colorant);
    if (!m || m.kind !== 'colorant' || m.locked) return 'Das ist kein Farbkörper';
    if (m.unlock && !state.unlocks.includes(m.unlock)) return `${m.name} hast du noch nicht`;
  }
  if (typeof r.colorantPct !== 'number' || !Number.isInteger(r.colorantPct) || r.colorantPct < 0 || r.colorantPct > 10) return 'Der Anteil muss zwischen 0 und 10 % liegen';
  const f = r.firing;
  if (!f || !['niedrig', 'mittel', 'hoch'].includes(f.temp) || !['oxidierend', 'reduzierend'].includes(f.atmosphere) || !['schnell', 'langsam'].includes(f.cooling)) return 'Ungültige Brenneinstellung';
  if (f.atmosphere === 'reduzierend' && !state.unlocks.includes('reduktion')) return 'Den Reduktionsbrand beherrschst du noch nicht';
  const kiln = state.stations.find((s) => s.kind === 'kiln');
  if (f.temp === 'hoch' && (!kiln || kiln.level < 2)) return 'Für hohe Temperaturen braucht der Ofen Stufe 2';
  return null;
}

/** Fire a test tile. Mutates state (materials, glazes, stats). Assumes validated input and paid cost. */
export function runExperiment(state: GameState, input: RecipeInput): ExperimentOutcome {
  const r: RecipeInput = {
    base: input.base, colorant: input.colorant, colorantPct: input.colorant ? input.colorantPct : 0,
    firing: { temp: input.firing.temp, atmosphere: input.firing.atmosphere, cooling: input.firing.cooling },
  };
  state.stats.experiments += 1;
  const existing = state.glazes.find((g) => sameRecipe(g, r));
  if (existing) return { glaze: existing, isNew: false, newEffect: null, hint: existing.effect ? null : hintFor(r, state) };
  const effect = matchEffect(r);
  const newEffect = effect && !discoveredEffects(state).includes(effect) ? effect : null;
  const glaze: GlazeRecipe = { id: newId(state, 'g'), name: glazeName(r, effect), ...r, color: glazeColor(r), effect };
  state.glazes.push(glaze);
  if (newEffect) state.stats.effectsFound += 1;
  return { glaze, isNew: true, newEffect, hint: effect ? null : hintFor(r, state) };
}
