import type { BodyId, GlazeRecipe, Tier } from '../types';
import { tierAtLeast } from './tiers';

export interface BodyDef {
  id: BodyId;
  name: string;
  material: string;
  tier: Tier;
  valueMul: number;
  difficultyAdd: number;
  glazeFireMul: number;
  mustFireHot: boolean;
  rufBonus: number;
  clearColor: string;
  /** multiplies every worker's contribution to batch quality (default 1) */
  skillMul?: number;
  starterGlaze: GlazeRecipe | null;
  description: string;
}

const own = (id: unknown): BodyDef | undefined => (typeof id === 'string' && Object.hasOwn(BODIES, id) ? BODIES[id] : undefined);

export const BODIES: Record<string, BodyDef> = {
  irdenware: {
    id: 'irdenware', name: 'Irdenware', material: 'ton', tier: 'werkstatt', valueMul: 1, difficultyAdd: 0, glazeFireMul: 1,
    mustFireHot: false, rufBonus: 0, clearColor: '#e9c9a6', starterGlaze: null,
    description: 'Roter Töpferton: weich, warm und verzeihend.',
  },
  steinzeug: {
    id: 'steinzeug', name: 'Steinzeug', material: 'steinzeugton', tier: 'manufaktur', valueMul: 1.8, difficultyAdd: 0.2, glazeFireMul: 1.5,
    mustFireHot: true, rufBonus: 2, clearColor: '#d3c7b4',
    starterGlaze: {
      id: 'klar-steinzeug', name: 'Klare Steinzeugglasur', base: 'transparent', colorant: null, colorantPct: 0,
      firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#d3c7b4', effect: null, body: 'steinzeug',
    },
    description: 'Grauer Ton, heiß gebrannt, steinhart – und wertvoller.',
  },
  porzellan: {
    id: 'porzellan', name: 'Porzellan', material: 'kaolin', tier: 'hofmanufaktur', valueMul: 3.2, difficultyAdd: 0.5, glazeFireMul: 2,
    mustFireHot: true, rufBonus: 4, clearColor: '#f3f1ec', skillMul: 1.5,
    starterGlaze: {
      id: 'klar-porzellan', name: 'Klare Porzellanglasur', base: 'transparent', colorant: null, colorantPct: 0,
      firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#f3f1ec', effect: null, body: 'porzellan',
    },
    description: 'Weiß, fein und kostbar – aber launisch im Feuer und nur für geübte Hände.',
  },
};

export const getBody = (id: string): BodyDef => {
  const b = own(id);
  if (!b) throw new Error(`Unbekannt: Tonkörper "${id}"`);
  return b;
};

export const bodyOf = (d: { body?: BodyId }): BodyId => d.body ?? 'irdenware';

export const bodyAvailable = (s: { tier: Tier }, id: BodyId): boolean => {
  const b = own(id);
  return !!b && tierAtLeast(s, b.tier);
};
