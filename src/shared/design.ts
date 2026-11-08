import { FORMS, own } from './content';
import { designDifficultyOf } from './production';
import type { Design, GameState, GlazeRecipe, Taste } from './types';

export type ColorFamily = 'rot' | 'blau' | 'gruen' | 'gelb' | 'braun' | 'weiss' | 'schwarz' | 'lila';

export const COLOR_FAMILY_NAMES: Record<ColorFamily, string> = {
  rot: 'Rot', blau: 'Blau', gruen: 'Grün', gelb: 'Gelb', braun: 'Braun', weiss: 'Weiß', schwarz: 'Schwarz', lila: 'Lila',
};

export const designDifficulty = designDifficultyOf;

function hexToHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0.5];
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, s, l];
}

export function colorFamily(css: string): ColorFamily {
  const [h, s, l] = hexToHsl(css);
  if (l > 0.88 || (s < 0.2 && l > 0.75)) return 'weiss';
  if (l < 0.15 || (s < 0.2 && l < 0.3)) return 'schwarz';
  if (s < 0.2) return 'braun';
  if (h < 15 || h >= 335) return 'rot';
  if (h < 42) return l < 0.6 ? 'braun' : 'gelb';
  if (h < 70) return 'gelb';
  if (h < 170) return 'gruen';
  if (h < 255) return 'blau';
  if (h < 335) return 'lila';
  return 'rot';
}

export const isTall = (d: Design) => d.profile.height > 0.6;
export const isSimple = (d: Design) => d.pattern === 'none' && d.rim === 'plain' && (d.handle === 'none' || d.handle === 'round');

/** 0..1: share of the customer's wishes this design meets. */
export function appeal(d: Design, glaze: GlazeRecipe | undefined, taste: Taste): number {
  let total = 0, hit = 0;
  const check = (cond: boolean) => { total++; if (cond) hit++; };
  if (taste.form !== undefined) check(d.form === taste.form);
  if (taste.colorFamily !== undefined) check(!!glaze && colorFamily(glaze.color) === taste.colorFamily);
  if (taste.pattern !== undefined) check(d.pattern === taste.pattern);
  if (taste.tall !== undefined) check(isTall(d) === taste.tall);
  if (taste.simple !== undefined) check(isSimple(d) === taste.simple);
  return total === 0 ? 0.5 : hit / total;
}

const HEX = /^#[0-9a-f]{6}$/i;
const PROFILE_KEYS = ['height', 'belly', 'neck', 'foot', 'rim'] as const;

export function validateDesign(d: Design, state: GameState): string | null {
  if (!d || typeof d !== 'object') return 'Ungültiger Entwurf';
  if (typeof d.name !== 'string' || d.name.trim().length < 1 || d.name.length > 30) return 'Der Name muss 1–30 Zeichen lang sein';
  const form = own(FORMS, d.form);
  if (!form) return 'Unbekannte Form';
  if (!state.unlocks.includes(form.unlock)) return `${form.plural} sind noch nicht freigeschaltet`;
  if (!d.profile) return 'Profil fehlt';
  for (const k of PROFILE_KEYS) {
    const v = d.profile[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) return 'Die Formregler müssen zwischen 0 und 1 liegen';
  }
  if (!['none', 'round', 'ear', 'loop'].includes(d.handle)) return 'Unbekannter Henkel';
  if (d.handle !== 'none' && !form.handleAllowed) return `${form.plural} haben keinen Henkel`;
  if (!['plain', 'rolled', 'flared'].includes(d.rim)) return 'Unbekannter Rand';
  if ((d.handle === 'ear' || d.handle === 'loop' || d.rim !== 'plain') && !state.unlocks.includes('formdetails')) return 'Diese Henkel und Ränder sind noch nicht freigeschaltet';
  if (!state.glazes.some((g) => g.id === d.glazeId)) return 'Diese Glasur kennst du noch nicht';
  if (!['none', 'stripes', 'dots', 'waves', 'leaves'].includes(d.pattern)) return 'Unbekanntes Muster';
  if ((d.pattern === 'waves' || d.pattern === 'leaves') && !state.unlocks.includes('patterns2')) return 'Dieses Muster ist noch nicht freigeschaltet';
  if (!HEX.test(d.patternColor)) return 'Ungültige Musterfarbe';
  return null;
}
