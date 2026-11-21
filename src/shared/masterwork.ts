import { recordCollection } from './collection';
import { BODIES, EFFECTS, FORMS, PATRONS, bodyAvailable, bodyOf, getBody, getForm, isGreatKilnEffect, tierAtLeast } from './content';
import { COLOR_FAMILY_NAMES, PATTERN_TEXT, PATTERN_UNLOCK, colorFamily, glazeForDesign, isTall, patternUnlocked, type ColorFamily } from './design';
import { newId } from './ids';
import { batchMaterials, batchQuality, missingMaterialCost, productionWorkers, qualityTier, useMaterials } from './production';
import { nextRandom } from './rng';
import { buyError } from './shop';
import type { Batch, BodyId, Commission, Design, GameState, MasterworkCriterion, PatternKind, Prestige } from './types';
import { fmtTaler } from './format';
import type { KilnMasterworkResult } from './village/types';

export const MASTERWORK_QUALITY_BONUS = 10;
export const MASTERWORK_MATERIAL_PIECES = 12;
export const COMMISSION_SWAP_COST = 250;
export const PRESTIGE_MUL: Record<Prestige, number> = { bronze: 0.5, silver: 0.8, gold: 1 };
export const PRESTIGE_RANK: Record<Prestige, number> = { bronze: 1, silver: 2, gold: 3 };
export const PRESTIGE_NAME: Record<Prestige, string> = { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' };

const CRITERION_ORDER: MasterworkCriterion['kind'][] = ['body', 'form', 'tall', 'effect', 'pattern', 'color'];

export function masterworkInProgress(s: GameState): Batch | undefined {
  return s.batches.find((b) => b.masterwork);
}

/** A masterwork is under way, in the workshop or in the village's great kiln. Only one at a time. */
export function masterworkBusy(s: GameState): boolean {
  return !!masterworkInProgress(s) || !!s.kilnMasterwork;
}

/** Great-kiln effects this player has already found (from the collection book), in book order. */
function foundKilnEffects(s: GameState): string[] {
  const found = new Set(s.collection.map((k) => k.split('|')[2]).filter((e) => isGreatKilnEffect(e)));
  return Object.keys(EFFECTS).filter((e) => found.has(e));
}

/** Draws a value in [0, 1) from the state's rng. */
function roll(s: GameState): number {
  const [v, r] = nextRandom(s.rng);
  s.rng = r;
  return v;
}

function choose<T>(s: GameState, arr: readonly T[]): T {
  return arr[Math.floor(roll(s) * arr.length)];
}

/** A commission built from the player's own bodies, glazes, forms and patterns, so it can always be met. Advances s.rng. */
export function generateCommission(s: GameState): Commission {
  const done = s.masterworks.length;
  const bodies = Object.values(BODIES).filter((b) => bodyAvailable(s, b.id) && s.glazes.some((g) => bodyOf(g) === b.id));
  const body: BodyId = bodies.length > 0 ? choose(s, bodies).id : 'irdenware';
  let glazes = s.glazes.filter((g) => bodyOf(g) === body);
  if (done >= 3 && glazes.some((g) => g.effect)) glazes = glazes.filter((g) => g.effect);
  const glaze = glazes.length > 0 ? choose(s, glazes) : undefined;
  const forms = Object.values(FORMS).filter((f) => s.unlocks.includes(f.unlock));
  const form = forms.length > 0 ? choose(s, forms) : getForm('becher');
  const patterns = (Object.keys(PATTERN_UNLOCK) as PatternKind[]).filter((p) => p !== 'none' && patternUnlocked(s, p));
  const pattern = choose(s, patterns);
  const tall = form.flat ? null : roll(s) < 0.5;
  // with a great kiln in the village, a patron sometimes wishes for a kiln effect the player has already found.
  // Only then is anything rolled, so commissions without a kiln come out exactly as before.
  let effect = glaze?.effect ?? null;
  const kilnEffects = done >= 3 && s.village?.buildings.includes('gemeinschaftsofen') ? foundKilnEffects(s) : [];
  if (kilnEffects.length > 0) {
    const x = roll(s);
    if (x < 0.25) effect = kilnEffects[Math.floor((x / 0.25) * kilnEffects.length)];
  }

  const candidates: MasterworkCriterion[] = [];
  if (body !== 'irdenware') candidates.push({ kind: 'body', body });
  candidates.push({ kind: 'form', form: form.id });
  if (tall !== null) candidates.push({ kind: 'tall', tall });
  if (effect) candidates.push({ kind: 'effect', effect });
  candidates.push({ kind: 'pattern', pattern });
  if (glaze) candidates.push({ kind: 'color', colorFamily: colorFamily(glaze.color) });

  const n = Math.min(candidates.length, done >= 2 ? 4 : 3);
  const criteria: MasterworkCriterion[] = [];
  const effectAt = candidates.findIndex((c) => c.kind === 'effect');
  if (done >= 3 && effectAt >= 0) criteria.push(...candidates.splice(effectAt, 1));
  while (criteria.length < n) criteria.push(...candidates.splice(Math.floor(roll(s) * candidates.length), 1));
  criteria.sort((a, b) => CRITERION_ORDER.indexOf(a.kind) - CRITERION_ORDER.indexOf(b.kind));

  let valueMul = 1;
  for (const c of criteria) if (c.kind === 'body') valueMul = Math.max(valueMul, getBody(c.body).valueMul);
  const patron = choose(s, PATRONS);
  const patronSeed = Math.floor(roll(s) * 0xffffffff) >>> 0;
  return {
    id: newId(s, 'c'), patronSeed, patronName: patron.name, patronJob: patron.job, criteria,
    costTaler: 3000 + 1500 * done,
    rewardTaler: Math.round((10000 + 4000 * done) * valueMul),
    rewardRuf: 30 + 5 * done,
  };
}

/** Which wishes the design meets. A piece from the great kiln also meets an effect wish with the effect the fire gave it. */
export function criteriaMet(s: GameState, design: Design, c: Commission, kilnEffect: string | null = null): boolean[] {
  const glaze = glazeForDesign(s, design);
  return c.criteria.map((x) => {
    switch (x.kind) {
      case 'body': return bodyOf(design) === x.body;
      case 'form': return design.form === x.form;
      case 'tall': return isTall(design) === x.tall;
      case 'effect': return glaze?.effect === x.effect || kilnEffect === x.effect;
      case 'pattern': return design.pattern === x.pattern;
      case 'color': return !!glaze && colorFamily(glaze.color) === x.colorFamily;
    }
  });
}

export function prestigeFor(met: number, total: number, quality: 1 | 2 | 3): Prestige {
  if (met >= total && quality === 3) return 'gold';
  if ((met >= total && quality === 2) || (met === total - 1 && quality === 3)) return 'silver';
  return 'bronze';
}

/** The quality score (0..100) a masterwork of this design starts with. */
export function masterworkQuality(s: GameState, design: Design): number {
  return Math.min(100, batchQuality(s, design, productionWorkers(s)) + MASTERWORK_QUALITY_BONUS);
}

export function predictMasterwork(s: GameState, design: Design): { met: boolean[]; quality: 1 | 2 | 3; prestige: Prestige } {
  const met = s.commission ? criteriaMet(s, design, s.commission) : [];
  const quality = qualityTier(masterworkQuality(s, design));
  return { met, quality, prestige: prestigeFor(met.filter(Boolean).length, met.length, quality) };
}

/**
 * The checks and payment for a masterwork: fee, materials for MASTERWORK_MATERIAL_PIECES plus `extra` (missing ones bought).
 * Mutates s only when everything is fine; returns a German error or null.
 */
export function payMasterwork(s: GameState, design: Design, extra: Record<string, number>): string | null {
  if (!tierAtLeast(s, 'manufaktur')) return 'Meisterstücke gibt es ab der Manufaktur';
  const c = s.commission;
  if (!c) return 'Gerade wartet kein Gönner';
  if (masterworkBusy(s)) return 'Es entsteht schon ein Meisterstück';
  if (design.origin) return 'Geschenkte Stücke kannst du nicht nachmachen';
  const need = batchMaterials(s, design, MASTERWORK_MATERIAL_PIECES);
  for (const [m, n] of Object.entries(extra)) need[m] = (need[m] ?? 0) + n;
  for (const m in need) {
    if (need[m] > (s.materials[m] ?? 0)) {
      const err = buyError(s, m);
      if (err) return err;
    }
  }
  const total = c.costTaler + missingMaterialCost(s, need);
  if (total > s.taler) return `Dafür brauchst du ${fmtTaler(total)} Taler`;
  s.taler = Math.round((s.taler - total) * 100) / 100;
  useMaterials(s, need);
  return null;
}

/** Pays the fee and materials and puts the masterwork into the workshop. Mutates s; returns a German error or null. */
export function startMasterwork(s: GameState, design: Design): string | null {
  const err = payMasterwork(s, design, {});
  if (err) return err;
  s.batches.push({
    id: newId(s, 'b'), designId: design.id, count: 1, stage: 'prepare', stationId: null, startedAt: null, durationMs: 0,
    quality: masterworkQuality(s, design), masterwork: true,
  });
  return null;
}

/** The masterwork leaves the kiln: judge it, pay the patron's reward, record it and bring the next commission. */
export function finishMasterwork(s: GameState, b: Batch, t: number): void {
  s.batches = s.batches.filter((x) => x !== b);
  const design = s.designs.find((d) => d.id === b.designId);
  // without its design there is nothing to show; still keep a patron waiting
  if (!design) { s.commission ??= generateCommission(s); return; }
  recordMasterwork(s, design, b.quality, null, t);
}

/** A masterwork came back from the great kiln: judge and record it like one from the workshop. */
export function finishKilnMasterwork(s: GameState, r: KilnMasterworkResult): void {
  s.kilnMasterwork = null;
  // the workshop's own design if it is still the one that was fired; edited or deleted meanwhile, the fired one counts
  const own = s.designs.find((d) => d.id === r.design.id && !d.origin && JSON.stringify({ ...d, id: '' }) === JSON.stringify({ ...r.design, id: '' }));
  recordMasterwork(s, own ?? r.design, r.qualityScore, r.effect, r.at);
}

/** Judge a finished masterwork against the commission, pay the reward, record it and bring the next commission. Mutates. */
export function recordMasterwork(s: GameState, design: Design, qualityScore: number, kilnEffect: string | null, t: number): void {
  const c = s.commission;
  const metList = c ? criteriaMet(s, design, c, kilnEffect) : [];
  const met = metList.filter(Boolean).length;
  const quality = qualityTier(qualityScore);
  // no patron to judge it (should not happen): the piece is kept, but earns nothing
  const prestige = c ? prestigeFor(met, metList.length, quality) : 'bronze';
  const reward = c ? { taler: Math.round(c.rewardTaler * PRESTIGE_MUL[prestige]), ruf: Math.round(c.rewardRuf * PRESTIGE_MUL[prestige]) } : undefined;
  if (reward) {
    s.taler += reward.taler;
    s.ruf += reward.ruf;
  }
  const glaze = glazeForDesign(s, design);
  // a masterwork always shows its glaze's effect (no chance roll), unless the great kiln gave it one of its own
  const effect = kilnEffect ?? glaze?.effect ?? null;
  s.masterworks.push({
    id: newId(s, 'mw'), commissionId: c?.id ?? '', patronName: c?.patronName ?? '', design: structuredClone(design),
    glazeColor: glaze?.color ?? getBody(bodyOf(design)).clearColor, effect, quality, met, total: metList.length, prestige, finishedAt: t, acked: false,
    ...(reward ? { reward } : {}),
  });
  recordCollection(s, design.form, bodyOf(design), effect);
  s.stats.made += 1;
  if (s.away) s.away.made += 1;
  s.commission = generateCommission(s);
}

export function describeCriterion(c: MasterworkCriterion): string {
  switch (c.kind) {
    case 'body': return `aus ${getBody(c.body).name}`;
    case 'form': return `als ${getForm(c.form).name}`;
    case 'tall': return c.tall ? 'schön hoch' : 'eher niedrig';
    case 'effect': return `mit ${EFFECTS[c.effect].name}`;
    case 'pattern': return PATTERN_TEXT[c.pattern];
    case 'color': return `in ${COLOR_FAMILY_NAMES[c.colorFamily as ColorFamily]}`;
  }
}
