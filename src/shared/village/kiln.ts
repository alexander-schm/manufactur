import { EFFECTS, FORMS, GREAT_KILN_EFFECTS } from '../content';
import { fmtTaler } from '../format';
import { batchMaterials, batchQuality, missingMaterialCost, productionWorkers, qualityTier, useMaterials } from '../production';
import { MASTERWORK_QUALITY_BONUS, payMasterwork } from '../masterwork';
import { nextRandom } from '../rng';
import { buyError } from '../shop';
import type { Design, GameState } from '../types';
import { addNews, emptyKiln, vid } from './state';
import type { Delivery, GreatKiln, KilnFiringReport, KilnReturn, Member, VillageState } from './types';

import { GREAT_KILN_CAPACITY, KILN_FIRING_MS, KILN_MEMBER_SHARE, KILN_QUALITY_BONUS, KILN_WAIT_MS, KILN_WOOD_MAX, KILN_WOOD_MIN } from './kilnRules';

export { GREAT_KILN_CAPACITY, KILN_FIRING_MS, KILN_MEMBER_SHARE, KILN_QUALITY_BONUS, KILN_WAIT_MS, KILN_WOOD_MAX, KILN_WOOD_MIN };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** More people and more wood make a hotter fire. */
export function heatFor(contributors: number, wood: number, pieces: number): number {
  const woodPart = pieces > 0 ? clamp01((wood / pieces - KILN_WOOD_MIN) / (KILN_WOOD_MAX - KILN_WOOD_MIN)) : 0;
  return Math.min(1, 0.15 + 0.2 * Math.min(contributors, 4) + 0.25 * woodPart);
}

export const kilnPieces = (k: GreatKiln): number => k.loads.reduce((n, l) => n + l.count, 0);

export function shareLeft(k: GreatKiln, playerId: string): number {
  return KILN_MEMBER_SHARE - k.loads.filter((l) => l.playerId === playerId).reduce((n, l) => n + l.count, 0);
}

/** What loading `pieces` of `design` with `wood` costs: materials taken and Taler for what is missing. */
export function kilnCost(s: GameState, design: Design, pieces: number, wood: number): { need: Record<string, number>; taler: number } | string {
  const need = batchMaterials(s, design, pieces);
  need.holz = (need.holz ?? 0) + wood;
  for (const [m, n] of Object.entries(need)) {
    if ((s.materials[m] ?? 0) >= n) continue;
    const err = buyError(s, m);
    if (err) return err;
  }
  return { need, taler: missingMaterialCost(s, need) };
}

/** Whether the kiln stands and is open for loading; a German error or null. */
function kilnClosed(v: VillageState): string | null {
  if (!v.buildings.includes('gemeinschaftsofen')) return 'Den Gemeinschaftsofen gibt es erst, wenn jemand im Dorf die Manufaktur erreicht hat';
  if (v.greatKiln.doneAt !== null) return 'Der Ofen brennt gerade – danach kannst du wieder einräumen';
  return null;
}

/** Whether `count` more pieces of this member fit into the kiln; a German error or null. */
function roomError(v: VillageState, me: Member, count: number): string | null {
  const k = v.greatKiln;
  const mine = shareLeft(k, me.playerId);
  if (count > mine) return `Dein Platz im Ofen reicht noch für ${Math.max(0, mine)} Stück`;
  const room = GREAT_KILN_CAPACITY - kilnPieces(k);
  if (count > room) return `Der Ofen hat nur noch Platz für ${room} Stück`;
  return null;
}

/** Add a paid load and start (or bring forward) the wait until the kiln is lit. */
function pushLoad(v: VillageState, actor: GameState, me: Member, design: Design, count: number, wood: number, qualityScore: number, now: number, masterwork: boolean): void {
  const k = v.greatKiln;
  const { origin: _origin, ...travelling } = structuredClone(design);
  const glazeColor = actor.glazes.find((g) => g.id === design.glazeId)?.color ?? '#e9c9a6';
  k.loads.push({
    playerId: me.playerId, design: travelling, glazeColor, count, wood, qualityScore, makerName: me.name, makerMark: me.makerMark,
    ...(masterwork ? { masterwork: true } : {}),
  });
  if (k.firesAt === null) k.firesAt = now + KILN_WAIT_MS;
  if (kilnPieces(k) === GREAT_KILN_CAPACITY) k.firesAt = now;
}

/** Put pieces into the great kiln, paying everything up front. Mutates both states. */
export function loadKiln(v: VillageState, actor: GameState, me: Member, designId: string, count: number, wood: number, now: number): string | null {
  const closed = kilnClosed(v);
  if (closed) return closed;
  const design = actor.designs.find((d) => d.id === designId);
  if (!design) return 'Diesen Entwurf gibt es nicht';
  if (design.origin) return 'Geschenkte Stücke kannst du nicht nachmachen';
  const room = roomError(v, me, count);
  if (room) return room;
  if (wood < count * KILN_WOOD_MIN || wood > count * KILN_WOOD_MAX) return `Pro Stück braucht es ${KILN_WOOD_MIN} bis ${KILN_WOOD_MAX} Holz`;
  const cost = kilnCost(actor, design, count, wood);
  if (typeof cost === 'string') return cost;
  if (cost.taler > actor.taler) return `Dafür brauchst du ${fmtTaler(cost.taler)} Taler`;
  actor.taler = Math.round((actor.taler - cost.taler) * 100) / 100;
  useMaterials(actor, cost.need);
  pushLoad(v, actor, me, design, count, wood, batchQuality(actor, design, productionWorkers(actor)), now, false);
  addNews(v, `${me.name} hat ${count} ${FORMS[design.form]?.plural ?? 'Stücke'} in den Gemeinschaftsofen geräumt.`, null, now);
  return null;
}

/**
 * Put the commission's masterwork into the great kiln instead of the workshop: fee, materials and wood are paid
 * up front, the fire decides its effect. It still counts as the one masterwork under way. Mutates both states.
 */
export function loadKilnMasterwork(v: VillageState, actor: GameState, me: Member, designId: string, wood: number, now: number): string | null {
  const closed = kilnClosed(v);
  if (closed) return closed;
  const design = actor.designs.find((d) => d.id === designId);
  if (!design) return 'Diesen Entwurf gibt es nicht';
  const room = roomError(v, me, 1);
  if (room) return room;
  if (wood < KILN_WOOD_MIN || wood > KILN_WOOD_MAX) return `Ein Meisterstück braucht ${KILN_WOOD_MIN} bis ${KILN_WOOD_MAX} Holz`;
  const err = payMasterwork(actor, design, { holz: wood });
  if (err) return err;
  pushLoad(v, actor, me, design, 1, wood, batchQuality(actor, design, productionWorkers(actor)) + MASTERWORK_QUALITY_BONUS, now, true);
  actor.kilnMasterwork = { designId: design.id, firingId: v.greatKiln.firingId };
  addNews(v, `${me.name} hat ein Meisterstück in den Gemeinschaftsofen gestellt.`, null, now);
  return null;
}

const KILN_EFFECT_WEIGHTS: Record<(typeof GREAT_KILN_EFFECTS)[number], (heat: number) => number> = {
  ascheanflug: () => 5,
  flammenspur: () => 3,
  ascheglasur: (heat) => 6 * heat * heat,
};

/** One piece's roll. Returns the effect (or null) and the next rng state. */
export function rollKilnEffect(rng: number, heat: number, masterwork: boolean): [string | null, number] {
  const [chance, r1] = nextRandom(rng);
  if (chance >= (masterwork ? 0.4 : 0.2) + 0.6 * heat) return [null, r1];
  const weights = GREAT_KILN_EFFECTS.map((id) => KILN_EFFECT_WEIGHTS[id](heat));
  const [roll, r2] = nextRandom(r1);
  let x = roll * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return [GREAT_KILN_EFFECTS[i], r2];
  }
  return [GREAT_KILN_EFFECTS[GREAT_KILN_EFFECTS.length - 1], r2];
}

const valueMulOf = (effect: string | null) => (effect ? EFFECTS[effect]?.valueMul ?? 1 : 1);

/** Light the kiln when it is due and hand out the pieces once it has cooled. Mutates. */
export function tickGreatKiln(v: VillageState, now: number): Delivery[] {
  const k = v.greatKiln;
  if (k.doneAt === null && k.firesAt !== null && k.firesAt <= now) {
    k.heat = heatFor(new Set(k.loads.map((l) => l.playerId)).size, k.loads.reduce((n, l) => n + l.wood, 0), kilnPieces(k));
    k.doneAt = k.firesAt + KILN_FIRING_MS;
    addNews(v, 'Der Gemeinschaftsofen brennt! In zwei Stunden ist er abgekühlt.', null, k.firesAt);
  }
  if (k.doneAt === null || k.doneAt > now) return [];
  const heat = k.heat ?? 0;
  const byPlayer = new Map<string, KilnReturn[]>();
  let best: { report: NonNullable<KilnFiringReport['best']>; maker: string } | null = null;
  const deliveries: Delivery[] = [];
  for (const load of k.loads) {
    // a masterwork is judged in its owner's workshop, with whatever the fire gave it
    if (load.masterwork) {
      const [effect, rng] = rollKilnEffect(v.rng, heat, true);
      v.rng = rng;
      const qualityScore = Math.min(100, load.qualityScore + KILN_QUALITY_BONUS * heat);
      deliveries.push({ to: load.playerId, delta: { kilnMasterwork: { design: load.design, qualityScore, effect, at: k.doneAt } } });
      continue;
    }
    const quality = qualityTier(Math.min(100, load.qualityScore + KILN_QUALITY_BONUS * heat));
    const counts = new Map<string | null, number>();
    for (let i = 0; i < load.count; i++) {
      const [effect, rng] = rollKilnEffect(v.rng, heat, false);
      v.rng = rng;
      counts.set(effect, (counts.get(effect) ?? 0) + 1);
    }
    const list = byPlayer.get(load.playerId) ?? [];
    byPlayer.set(load.playerId, list);
    for (const [effect, count] of counts) {
      list.push({ design: load.design, glazeColor: load.glazeColor, quality, effect, count, makerName: load.makerName, makerMark: load.makerMark });
      const b = best?.report;
      if (!b || valueMulOf(effect) > valueMulOf(b.effect) || (valueMulOf(effect) === valueMulOf(b.effect) && quality > b.quality)) {
        best = { report: { playerId: load.playerId, designName: load.design.name, form: load.design.form, effect, quality }, maker: load.makerName };
      }
    }
  }
  const contributors = [...new Set(k.loads.map((l) => l.playerId))];
  const pieces = kilnPieces(k);
  deliveries.push(...[...byPlayer].map(([to, kilnGoods]) => ({ to, delta: { kilnGoods } })));
  let text = `Der Gemeinschaftsofen ist abgekühlt: ${pieces} Stücke von ${contributors.length} Leuten.`;
  if (best) {
    const { report, maker } = best;
    const formName = FORMS[report.form]?.name ?? 'Stück';
    text += report.effect ? ` Schönstes Stück: ${maker}s ${formName} mit ${EFFECTS[report.effect]?.name ?? report.effect}!` : ` Schönstes Stück: ${maker}s ${formName}.`;
  }
  v.lastFiring = { firingId: k.firingId, at: k.doneAt, heat, contributors, pieces, best: best?.report ?? null };
  addNews(v, text, null, k.doneAt);
  v.greatKiln = emptyKiln(vid(v, 'k'));
  return deliveries;
}

/** When the kiln next needs a tick, or null if it is idle. */
export function nextKilnWake(v: VillageState): number | null {
  return v.greatKiln.doneAt ?? v.greatKiln.firesAt;
}
