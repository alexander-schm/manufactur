import { tierAtLeast } from '../content';
import { pick } from '../rng';
import type { Tier } from '../types';
import {
  BRUNNEN_RUF_PER_DAY, KAOLIN_PRICE_FACTOR, MARKET_DAY_FACTOR, MARKET_DAY_HOURS, MUSEUM_MAX_COUNTED, RATHAUS_COUNT_MUL, RATHAUS_REWARD_MUL,
} from './benefits';
import { levelBonus } from './level';
import { maxMemberTier } from './state';
import type { ActivePart, ActiveProject, ProjectPart, VillageState } from './types';

export interface StageDef { name: string; parts: ProjectPart[] }
export interface ProjectDef { id: string; name: string; description: string; tier: Tier; decor: string; stages: StageDef[]; benefit: (level: number) => string }

export const ROMAN = ['I', 'II', 'III'];
export const MAX_PROJECT_LEVEL = 3;
export const LEVEL_COUNT_MUL = [1, 1.5, 2];
export const LEVEL_TALER_MUL = [1, 4, 12];
export const MAX_STAGE_SHARE = 0.7;
export const MIN_STAGE_CONTRIBUTORS = 2;
export const PROJECT_ORDER = ['glockenturm', 'museum', 'rathaus', 'dorfbrunnen', 'kaolingrube'];
const MAX_OFFERED = 2;

const mat = (material: string, count: number): ProjectPart => ({ kind: 'material', material, count });
const goods = (form: string, body: 'irdenware' | 'steinzeug' | 'porzellan' | null, count: number, extra: { q2?: boolean; colorFamily?: string; effect?: string } = {}): ProjectPart => ({
  kind: 'goods', form, count, minQuality: extra.q2 ? 2 : 1,
  ...(body ? { body } : {}), ...(extra.colorFamily ? { colorFamily: extra.colorFamily } : {}), ...(extra.effect ? { effect: extra.effect } : {}),
});
const taler = (amount: number): ProjectPart => ({ kind: 'taler', amount });
const master = (count: number, minPrestige: 'bronze' | 'silver' | 'gold'): ProjectPart => ({ kind: 'masterwork', count, minPrestige });

export const PROJECTS: Record<string, ProjectDef> = {
  glockenturm: {
    id: 'glockenturm', name: 'Glockenturm', tier: 'manufaktur', decor: 'tischglocke',
    description: 'Ein Turm mit Glocke, die jeden Samstag den Markttag einläutet.',
    stages: [
      { name: 'Fundament', parts: [mat('ton', 400), mat('holz', 300), goods('krug', 'steinzeug', 12), taler(30000)] },
      { name: 'Turmschaft', parts: [mat('steinzeugton', 300), goods('becher', 'steinzeug', 40), mat('eisenoxid', 60), taler(50000)] },
      { name: 'Glockenstuhl', parts: [mat('holz', 600), goods('vase', 'steinzeug', 15, { q2: true }), mat('kupferoxid', 60), taler(80000)] },
      { name: 'Glocke und Dach', parts: [goods('teekanne', 'steinzeug', 10), master(1, 'bronze'), mat('kobalt', 40), taler(120000)] },
    ],
    benefit: (L) => `Jeden Samstagvormittag ist Markttag: ${MARKET_DAY_HOURS[L - 1]} Stunden lang verkaufen die Marktstände zu ${Math.round(MARKET_DAY_FACTOR[L - 1] * 100)} % des Werts.`,
  },
  museum: {
    id: 'museum', name: 'Museum', tier: 'manufaktur', decor: 'museumsplakat',
    description: 'Ein kleines Museum für die Meisterstücke des ganzen Dorfs.',
    stages: [
      { name: 'Grundmauern', parts: [mat('ton', 500), mat('steinzeugton', 200), goods('teller', 'steinzeug', 30), taler(40000)] },
      { name: 'Ausstellungshalle', parts: [mat('holz', 400), goods('vase', 'steinzeug', 20, { q2: true }), master(1, 'bronze'), taler(60000)] },
      { name: 'Vitrinen', parts: [mat('glasurbasis', 300), goods('schale', 'steinzeug', 40), goods('vase', null, 4, { effect: 'ascheanflug' }), taler(90000)] },
      { name: 'Eröffnung', parts: [master(2, 'silver'), goods('krug', 'steinzeug', 15, { q2: true }), mat('kobalt', 50), taler(120000)] },
    ],
    benefit: (L) => `Zeigt die Meisterstücke aller im Dorf. Besucher bringen jeden Tag ${L} Ruf pro eigenem Meisterstück (bis zu ${MUSEUM_MAX_COUNTED}).`,
  },
  rathaus: {
    id: 'rathaus', name: 'Rathaus', tier: 'manufaktur', decor: 'ratssiegel',
    description: 'Das Herz des Dorfs: Hier werden die großen Aufträge vergeben.',
    stages: [
      { name: 'Bauplatz', parts: [mat('ton', 600), mat('holz', 500), mat('eisenoxid', 80), taler(40000)] },
      { name: 'Mauern', parts: [mat('steinzeugton', 400), goods('becher', 'steinzeug', 60), mat('kupferoxid', 60), taler(70000)] },
      { name: 'Ratssaal', parts: [goods('teller', 'steinzeug', 40, { q2: true }), goods('teekanne', 'steinzeug', 12), mat('glasurbasis', 300), taler(100000)] },
      { name: 'Turm und Uhr', parts: [goods('vase', 'steinzeug', 25, { q2: true }), mat('kobalt', 60), mat('holz', 800), taler(150000)] },
      { name: 'Festsaal', parts: [master(2, 'silver'), goods('krug', 'steinzeug', 20, { q2: true }), goods('becher', null, 10, { effect: 'flammenspur' }), taler(250000)] },
    ],
    benefit: (L) => `Großaufträge werden ${Math.round((RATHAUS_COUNT_MUL[L - 1] - 1) * 100)} % größer und zahlen ${Math.round((RATHAUS_REWARD_MUL[L - 1] - 1) * 100)} % mehr.`,
  },
  dorfbrunnen: {
    id: 'dorfbrunnen', name: 'Dorfbrunnen', tier: 'hofmanufaktur', decor: 'brunnenfliese',
    description: 'Ein gefliester Brunnen mitten im Dorf, an dem sich alle treffen.',
    stages: [
      { name: 'Becken', parts: [mat('ton', 500), goods('fliese', null, 120), mat('steinzeugton', 200), taler(60000)] },
      { name: 'Brunnenrand', parts: [goods('fliese', null, 200, { colorFamily: 'blau' }), mat('kobalt', 80), goods('schale', 'steinzeug', 30), taler(100000)] },
      { name: 'Brunnenfigur', parts: [goods('figur', 'porzellan', 6, { q2: true }), goods('fliese', null, 150), master(1, 'silver'), taler(150000)] },
    ],
    benefit: (L) => `Jeden Tag ${BRUNNEN_RUF_PER_DAY[L - 1]} Ruf für alle im Dorf.`,
  },
  kaolingrube: {
    id: 'kaolingrube', name: 'Kaolingrube', tier: 'hofmanufaktur', decor: 'kaolinbrocken',
    description: 'Eine eigene Grube für weiße Porzellanerde – nie wieder teures Kaolin.',
    stages: [
      { name: 'Stollen', parts: [mat('holz', 800), mat('eisenoxid', 100), goods('krug', 'steinzeug', 20), taler(80000)] },
      { name: 'Schlämmbecken', parts: [mat('kaolin', 300), goods('schale', 'porzellan', 30), mat('glasurbasis', 300), taler(120000)] },
      { name: 'Förderturm', parts: [goods('vase', 'porzellan', 15, { q2: true }), goods('figur', 'porzellan', 6), master(1, 'gold'), taler(200000)] },
    ],
    benefit: (L) => `Kaolin kostet für alle im Dorf ${Math.round((1 - KAOLIN_PRICE_FACTOR[L - 1]) * 100)} % weniger.`,
  },
};

/** Stage size grows with the active members (2..6 count). */
export const projectScale = (active: number): number => (3 + Math.min(Math.max(active, 2), 6)) / 5;
/** Ceiling that shrugs off float noise (600 × 1.2 must be 720, not 721). */
const up = (x: number): number => Math.ceil(x - 1e-9);

export function instantiateStage(def: ProjectDef, level: 1 | 2 | 3, stage: number, active: number): ActivePart[] {
  const scale = projectScale(active), cm = LEVEL_COUNT_MUL[level - 1], tm = LEVEL_TALER_MUL[level - 1];
  return def.stages[stage].parts.map((p): ActivePart => {
    const start = { filled: 0, by: {} };
    switch (p.kind) {
      case 'taler': return { ...p, amount: Math.round((p.amount * tm * scale) / 1000) * 1000, ...start };
      case 'masterwork': return { ...p, count: up(p.count * cm), ...start };
      case 'goods': return { ...p, count: Math.max(1, up(p.count * cm * scale)), ...(level === 3 ? { minQuality: Math.min(3, p.minQuality + 1) as 1 | 2 | 3 } : {}), ...start };
      default: return { ...p, count: Math.max(1, up(p.count * cm * scale)), ...start };
    }
  });
}

export const partSize = (p: ProjectPart): number => (p.kind === 'taler' ? p.amount : p.count);

/**
 * Each part weighs 1/n of the stage ("70 % of a stage's value" is the builder's call:
 * equal-weight parts, so a part's fill fraction is directly comparable across materials, goods and Taler).
 */
export function stageShares(a: ActiveProject): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of a.parts) {
    const size = partSize(p);
    for (const [id, n] of Object.entries(p.by)) out[id] = (out[id] ?? 0) + n / size / a.parts.length;
  }
  return out;
}

/** How many more units of a part this actor may give without passing the 70 % share cap. Never negative. */
export function maxProjectUnits(a: ActiveProject, part: number, actorId: string): number {
  const p = a.parts[part];
  if (!p) return 0;
  const size = partSize(p), left = Math.max(0, size - p.filled);
  const share = stageShares(a)[actorId] ?? 0;
  return Math.max(0, Math.min(left, Math.floor((MAX_STAGE_SHARE - share) * size * a.parts.length + 1e-9)));
}

export function isStageComplete(a: ActiveProject): boolean {
  if (!a.parts.every((p) => p.filled >= partSize(p))) return false;
  const who = new Set<string>();
  for (const p of a.parts) for (const [id, n] of Object.entries(p.by)) if (n > 0) who.add(id);
  return who.size >= MIN_STAGE_CONTRIBUTORS;
}

export function stageReward(v: VillageState, a: ActiveProject): { taler: number; ruf: number } {
  const tp = a.parts.find((p) => p.kind === 'taler');
  const talerAmount = tp && tp.kind === 'taler' ? tp.amount : 0, bonus = levelBonus(v);
  return {
    taler: Math.round((0.25 * talerAmount + 2000 * (a.stage + 1)) * bonus),
    ruf: Math.round((25 + 10 * a.stage + 25 * (a.level - 1)) * bonus),
  };
}

const qualifies = (v: VillageState, id: string): boolean => {
  const def = PROJECTS[id];
  return !!def && (v.projects.levels[id] ?? 0) < MAX_PROJECT_LEVEL && tierAtLeast({ tier: maxMemberTier(v) }, def.tier);
};

/** While nothing is being built, keep up to two qualifying projects on offer. Mutates; true when anything changed. */
export function ensureProjectOffers(v: VillageState): boolean {
  const pr = v.projects;
  if (pr.active !== null) return false;
  let changed = false;
  const kept = pr.offered.filter((id) => qualifies(v, id));
  if (kept.length !== pr.offered.length) { pr.offered = kept; changed = true; }
  while (pr.offered.length < MAX_OFFERED) {
    const pool = PROJECT_ORDER.filter((id) => !pr.offered.includes(id) && qualifies(v, id));
    if (!pool.length) break;
    let id: string; [id, v.rng] = pick(v.rng, pool);
    pr.offered.push(id);
    changed = true;
  }
  return changed;
}
