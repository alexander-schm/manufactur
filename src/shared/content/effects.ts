import type { BodyId, GlazeRecipe } from '../types';

/** A glaze recipe as entered by the player; a missing body means irdenware. */
export type RecipeInput = Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'> & { body?: BodyId };

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
  /** only found on this clay body; counts as one extra condition when ranking */
  body?: BodyId;
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
  oelfleck: {
    id: 'oelfleck', name: 'Ölfleck', valueMul: 2.6, body: 'steinzeug',
    description: 'Silbrige Tropfen schwimmen auf tiefschwarzer Glasur.',
    hint: 'Greta raunt: „Auf Steinzeug, mit ganz viel Eisen, heiß – und dann lass dem Ofen Zeit beim Abkühlen.“',
    conditions: [
      { label: 'viel Eisenoxid (7–10 %)', test: (r) => r.colorant === 'eisenoxid' && pct(7, 10)(r) },
      { label: 'hohe Temperatur', test: (r) => r.firing.temp === 'hoch' },
      { label: 'langsames Abkühlen', test: (r) => r.firing.cooling === 'langsam' },
    ],
  },
  hasenfell: {
    id: 'hasenfell', name: 'Hasenfell', valueMul: 2.4, body: 'steinzeug',
    description: 'Feine braune Streifen, wie das Fell eines Hasen.',
    hint: 'Greta lächelt: „Nicht zu wenig Eisen, nicht zu viel – und nimm dem Feuer die Luft. Auf Steinzeug, versteht sich.“',
    conditions: [
      { label: 'mittel Eisenoxid (4–6 %)', test: (r) => r.colorant === 'eisenoxid' && pct(4, 6)(r) },
      { label: 'Reduktion', test: (r) => r.firing.atmosphere === 'reduzierend' },
    ],
  },
  shino: {
    id: 'shino', name: 'Shino', valueMul: 2.3, body: 'steinzeug',
    description: 'Milchig-weiß mit warmen, rötlichen Flecken.',
    hint: 'Greta erzählt: „Matt und ganz ohne Farbe, langsam abkühlen – das Steinzeug malt dann selbst.“',
    conditions: [
      { label: 'matte Basis', test: (r) => r.base === 'matt' },
      { label: 'kein Farbkörper', test: (r) => r.colorant === null },
      { label: 'langsames Abkühlen', test: (r) => r.firing.cooling === 'langsam' },
    ],
  },
  salzglasur: {
    id: 'salzglasur', name: 'Salzglasur', valueMul: 2.5, body: 'steinzeug',
    description: 'Eine Haut wie Orangenschale, glänzend und genarbt.',
    hint: 'Greta flüstert: „Wirf Salz ins heiße Feuer, wenn Steinzeug drin steht – klare Glasur drunter.“',
    conditions: [
      { label: 'Salz als Zusatz', test: (r) => r.colorant === 'salz' },
      { label: 'transparente Basis', test: (r) => r.base === 'transparent' },
    ],
  },
  blancdechine: {
    id: 'blancdechine', name: 'Blanc de Chine', valueMul: 3, body: 'porzellan',
    description: 'Ein warmes, cremiges Weiß wie Elfenbein.',
    hint: 'Greta schwärmt: „Deckend und ganz ohne Farbe, auf Porzellan – mehr braucht es nicht.“',
    conditions: [
      { label: 'deckende Basis', test: (r) => r.base === 'opak' },
      { label: 'kein Farbkörper', test: (r) => r.colorant === null },
    ],
  },
  blauweiss: {
    id: 'blauweiss', name: 'Blau-Weiß', valueMul: 3.2, body: 'porzellan',
    description: 'Feine kobaltblaue Malerei unter klarer Glasur.',
    hint: 'Greta zeigt auf eine alte Tasse: „Klare Glasur und nur ein Hauch Kobalt – auf Porzellan.“',
    conditions: [
      { label: 'transparente Basis', test: (r) => r.base === 'transparent' },
      { label: 'wenig Kobalt (1–2 %)', test: (r) => r.colorant === 'kobalt' && pct(1, 2)(r) },
    ],
  },
  ochsenblut: {
    id: 'ochsenblut', name: 'Ochsenblut', valueMul: 3.6, body: 'porzellan',
    description: 'Ein tiefes, sattes Rot, das von innen zu glühen scheint.',
    hint: 'Greta wird ernst: „Mehr Kupfer als fürs Kupferrot, wenig Luft und viel Geduld beim Abkühlen. Nur auf Porzellan.“',
    conditions: [
      { label: 'Kupferoxid (3–5 %)', test: (r) => r.colorant === 'kupferoxid' && pct(3, 5)(r) },
      { label: 'Reduktion', test: (r) => r.firing.atmosphere === 'reduzierend' },
      { label: 'langsames Abkühlen', test: (r) => r.firing.cooling === 'langsam' },
    ],
  },
  eierschale: {
    id: 'eierschale', name: 'Eierschale', valueMul: 3, body: 'porzellan',
    description: 'So dünn und matt, dass das Licht hindurchschimmert.',
    hint: 'Greta flüstert: „Matt, heiß und schnell abkühlen – das Porzellan wird fast durchsichtig.“',
    conditions: [
      { label: 'matte Basis', test: (r) => r.base === 'matt' },
      { label: 'schnelles Abkühlen', test: (r) => r.firing.cooling === 'schnell' },
    ],
  },
};
