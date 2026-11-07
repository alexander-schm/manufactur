import type { GlazeRecipe } from '../types';

export type RecipeInput = Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'>;

/** A single checkable condition, so hints can name the one that is off. */
export interface EffectCondition { label: string; test: (r: RecipeInput) => boolean }

export interface EffectDef {
  id: string;
  name: string;
  description: string;
  hint: string;
  /** sale value multiplier for pieces with this effect */
  valueMul: number;
  conditions: EffectCondition[];
}

const pct = (lo: number, hi: number) => (r: RecipeInput) => r.colorantPct >= lo && r.colorantPct <= hi;

export const EFFECTS: Record<string, EffectDef> = {
  craquele: {
    id: 'craquele', name: 'Craquelé', valueMul: 1.4,
    description: 'Ein feines Netz aus Haarrissen überzieht die Glasur.',
    hint: 'Greta murmelt: „Klare Glasur, und dann schnell abkühlen lassen – da knackt es schön.“',
    conditions: [
      { label: 'transparente Basis', test: (r) => r.base === 'transparent' },
      { label: 'schnelles Abkühlen', test: (r) => r.firing.cooling === 'schnell' },
    ],
  },
  seladon: {
    id: 'seladon', name: 'Seladon', valueMul: 1.8,
    description: 'Ein zartes, jadegrünes Leuchten wie in alten Tempeln.',
    hint: 'Greta erzählt: „Ein Hauch Eisen, heißes Feuer und wenig Luft – Reduktion nennt man das.“',
    conditions: [
      { label: 'wenig Eisenoxid (1–3 %)', test: (r) => r.colorant === 'eisenoxid' && pct(1, 3)(r) },
      { label: 'Reduktion', test: (r) => r.firing.atmosphere === 'reduzierend' },
      { label: 'hohe Temperatur', test: (r) => r.firing.temp === 'hoch' },
    ],
  },
  tenmoku: {
    id: 'tenmoku', name: 'Tenmoku', valueMul: 1.7,
    description: 'Tiefschwarz mit rostbraunen Kanten.',
    hint: 'Greta sagt: „Viel Eisen, sehr viel – und richtig heiß brennen.“',
    conditions: [
      { label: 'viel Eisenoxid (7–10 %)', test: (r) => r.colorant === 'eisenoxid' && pct(7, 10)(r) },
      { label: 'hohe Temperatur', test: (r) => r.firing.temp === 'hoch' },
    ],
  },
  kupferrot: {
    id: 'kupferrot', name: 'Kupferrot', valueMul: 2,
    description: 'Ein leuchtendes Ochsenblutrot – das Kupfer hat seine Farbe gewechselt!',
    hint: 'Greta flüstert: „Kupfer wird grün … außer man nimmt dem Feuer die Luft.“',
    conditions: [
      { label: 'wenig Kupferoxid (1–3 %)', test: (r) => r.colorant === 'kupferoxid' && pct(1, 3)(r) },
      { label: 'Reduktion', test: (r) => r.firing.atmosphere === 'reduzierend' },
    ],
  },
  kristall: {
    id: 'kristall', name: 'Kristallglasur', valueMul: 2.2,
    description: 'Eisblumenartige Kristalle wachsen in der Glasur.',
    hint: 'Greta grübelt: „Matte Glasur, heiß gebrannt, und dann gaaanz langsam abkühlen …“',
    conditions: [
      { label: 'matte Basis', test: (r) => r.base === 'matt' },
      { label: 'hohe Temperatur', test: (r) => r.firing.temp === 'hoch' },
      { label: 'langsames Abkühlen', test: (r) => r.firing.cooling === 'langsam' },
    ],
  },
};
