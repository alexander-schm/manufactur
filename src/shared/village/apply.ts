import { MATERIALS, own } from '../content';
import { MAX_DECOR_PLACED } from './decor';
import { addGoods } from '../market';
import type { Design, GameState, MakerMark } from '../types';
import { lendAHand } from './help';
import { completeJointOrder, contributeTo, ensureJointOrders, isComplete, maxContribution } from './joint';
import { addNews, validateVillageAction, vid } from './state';
import type { Delivery, Give, GiveRef, TransferStack, VillageAction, VillageState, WorkshopDelta } from './types';

export const ownDesigns = (s: GameState) => s.designs.filter((d) => !d.origin);
export const isForeign = (d: Design | undefined) => !!d?.origin;

const round2 = (n: number) => Math.round(n * 100) / 100;

function hash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function describeGive(g: Give | GiveRef): string {
  if (g.kind === 'taler') return `${g.amount} Taler`;
  if (g.kind === 'material') return `${g.count} ${own(MATERIALS, g.material)?.name ?? g.material}`;
  if ('stack' in g) return `${g.stack.count}× ${g.stack.design.name}`;
  return `${g.count} Stück`;
}

/** Remove a give from a workshop (mutates). Returns the travelling Give or a German error. */
export function take(s: GameState, ref: GiveRef, makerName: string, makerMark: MakerMark): Give | string {
  switch (ref.kind) {
    case 'taler':
      if (s.taler < ref.amount) return 'Dafür hast du nicht genug Taler';
      s.taler = round2(s.taler - ref.amount);
      return { kind: 'taler', amount: ref.amount };
    case 'material':
      if ((s.materials[ref.material] ?? 0) < ref.count) return `Du hast nicht genug ${own(MATERIALS, ref.material)?.name ?? 'Material'}`;
      s.materials[ref.material] -= ref.count;
      return { kind: 'material', material: ref.material, count: ref.count };
    case 'goods': {
      const stack = s.goods.find((g) => g.designId === ref.designId && g.quality === ref.quality && g.effect === ref.effect);
      if (!stack || stack.count < ref.count) return 'Davon hast du nicht genug im Regal';
      const design = s.designs.find((d) => d.id === ref.designId);
      if (!design) return 'Unbekannte Ware';
      stack.count -= ref.count;
      s.goods = s.goods.filter((g) => g.count > 0);
      const glaze = s.glazes.find((g) => g.id === design.glazeId);
      // pieces keep naming the person who made them, even when passed on again
      const maker = design.origin ? { name: design.origin.playerName, mark: design.origin.makerMark } : { name: makerName, mark: makerMark };
      const travelling: Design = { ...structuredClone(design), origin: { playerName: maker.name, makerMark: maker.mark, glazeColor: design.origin?.glazeColor ?? glaze?.color ?? '#e9c9a6' } };
      return { kind: 'goods', stack: { design: travelling, quality: ref.quality, effect: ref.effect, count: ref.count, makerName: maker.name, makerMark: maker.mark } };
    }
  }
}

/** Add incoming goods; finds or creates a read-only foreign design copy. */
export function importStack(s: GameState, t: TransferStack): void {
  const { id: _id, ...rest } = t.design;
  const key = 'f:' + hash(JSON.stringify({ ...rest, name: t.design.name, origin: t.design.origin }));
  if (!s.designs.some((d) => d.id === key)) s.designs.push({ ...structuredClone(t.design), id: key });
  addGoods(s, { designId: key, quality: t.quality, effect: t.effect, count: t.count });
}

export function put(s: GameState, g: Give): void {
  if (g.kind === 'taler') s.taler = round2(s.taler + g.amount);
  else if (g.kind === 'material') s.materials[g.material] = (s.materials[g.material] ?? 0) + g.count;
  else importStack(s, g.stack);
}

/** Apply a delivery to a workshop. Pure. Additive, so a retried delivery can be recomputed from a fresh read. */
export function applyDelta(state: GameState, d: WorkshopDelta): GameState {
  const s = structuredClone(state);
  if (d.taler) s.taler = round2(s.taler + d.taler);
  if (d.ruf) s.ruf += d.ruf;
  for (const [m, n] of Object.entries(d.materials ?? {})) s.materials[m] = (s.materials[m] ?? 0) + n;
  for (const t of d.goods ?? []) importStack(s, t);
  for (const id of d.decor ?? []) {
    if (s.decor.includes(id)) continue;
    s.decor.push(id);
    if (s.decorPlaced.length < MAX_DECOR_PLACED) s.decorPlaced.push(id); // show it off right away
  }
  if (d.helpBoostUntil !== undefined || d.village) {
    s.village ??= { villageId: d.village?.villageId ?? '', specialty: null, buildings: [], helpBoostUntil: 0, trickleCarry: 0, members: 1 };
    if (d.helpBoostUntil !== undefined) s.village.helpBoostUntil = Math.max(s.village.helpBoostUntil, d.helpBoostUntil);
    if (d.village) Object.assign(s.village, d.village);
  }
  return s;
}

function giveToDelta(g: Give): WorkshopDelta {
  if (g.kind === 'taler') return { taler: g.amount };
  if (g.kind === 'material') return { materials: { [g.material]: g.count } };
  return { goods: [g.stack] };
}

export type VillageResult = { v: VillageState; actor: GameState; deliveries: Delivery[]; events: string[] };

/** One village operation. Pure: returns the new village, the actor's new workshop and deliveries for others. */
export function applyVillageAction(v0: VillageState, actorId: string, actor0: GameState, a: VillageAction, now: number): VillageResult | string {
  const err = validateVillageAction(v0, actorId, a);
  if (err) return err;
  const v = structuredClone(v0);
  const actor = structuredClone(actor0);
  const me = v.members.find((m) => m.playerId === actorId)!;
  const name = (id: string) => v.members.find((m) => m.playerId === id)?.name ?? 'Jemand';
  const deliveries: Delivery[] = [];
  const events: string[] = [];
  me.lastSeen = now;
  switch (a.type) {
    case 'postOffer': {
      const g = take(actor, a.give, me.name, me.makerMark);
      if (typeof g === 'string') return g;
      v.offers.push({ id: vid(v, 'o'), from: actorId, give: g, want: a.want, createdAt: now });
      events.push('Dein Angebot hängt am Tauschbrett.');
      addNews(v, `${me.name} bietet ${describeGive(g)} gegen ${describeGive(a.want)}.`, null, now);
      break;
    }
    case 'cancelOffer': {
      const o = v.offers.find((x) => x.id === a.offerId);
      if (!o) return 'Dieses Angebot ist schon weg';
      if (o.from !== actorId) return 'Das ist nicht dein Angebot';
      v.offers = v.offers.filter((x) => x !== o);
      put(actor, o.give);
      events.push('Angebot zurückgezogen – du hast alles wieder.');
      break;
    }
    case 'acceptOffer': {
      const o = v.offers.find((x) => x.id === a.offerId);
      if (!o) return 'Dieses Angebot ist schon weg';
      if (o.from === actorId) return 'Das ist dein eigenes Angebot';
      const pay = take(actor, o.want, me.name, me.makerMark);
      if (typeof pay === 'string') return pay;
      v.offers = v.offers.filter((x) => x !== o);
      put(actor, o.give);
      deliveries.push({ to: o.from, delta: giveToDelta(pay) });
      events.push(`Getauscht! Du bekommst ${describeGive(o.give)}.`);
      addNews(v, `${me.name} hat dein Angebot angenommen: du bekommst ${describeGive(pay)}.`, o.from, now);
      break;
    }
    case 'gift': {
      const g = take(actor, a.give, me.name, me.makerMark);
      if (typeof g === 'string') return g;
      deliveries.push({ to: a.to, delta: giveToDelta(g) });
      events.push(`Geschenkt! ${name(a.to)} freut sich.`);
      addNews(v, `${me.name} hat dir ${describeGive(g)} geschenkt 🎁`, a.to, now);
      break;
    }
    case 'postRequest':
      v.requests.push({ id: vid(v, 'r'), from: actorId, material: a.material, count: a.count, createdAt: now });
      events.push('Dein Wunsch hängt am Brett.');
      break;
    case 'removeRequest': {
      const r = v.requests.find((x) => x.id === a.requestId);
      if (!r) return 'Diesen Wunsch gibt es nicht mehr';
      if (r.from !== actorId) return 'Das ist nicht dein Wunsch';
      v.requests = v.requests.filter((x) => x !== r);
      break;
    }
    case 'contribute': {
      const o = v.jointOrders.find((x) => x.id === a.jointId);
      if (!o) return 'Diesen Großauftrag gibt es nicht mehr';
      // a joint order is only possible together: the first person can't fill the very last unit
      if (a.count > maxContribution(o, a.part, actorId) && o.parts[a.part] && a.count <= o.parts[a.part].count - o.parts[a.part].filled) {
        return 'Lass den anderen etwas übrig – Großaufträge gehen nur gemeinsam!';
      }
      const pts = contributeTo(o, a.part, actor, a.count, a.source, { designId: a.designId, quality: a.quality, effect: a.effect });
      if (typeof pts === 'string') return pts;
      o.contributions[actorId] = Math.round(((o.contributions[actorId] ?? 0) + pts) * 100) / 100;
      events.push('Beigesteuert – danke!');
      if (isComplete(o)) {
        deliveries.push(...completeJointOrder(v, o, now));
        events.push(`Großauftrag „${o.title}“ geschafft! 🎉`);
      }
      break;
    }
    case 'help': {
      const out = lendAHand(v, actorId, a.target, a.sticker, now);
      if (typeof out === 'string') return out;
      deliveries.push(...out);
      events.push(`Du hast bei ${name(a.target)} mit angepackt – das geht jetzt schneller!`);
      break;
    }
    default:
      return 'Noch nicht verfügbar';
  }
  ensureJointOrders(v, now);
  // deliveries to yourself (e.g. your own payout share) land directly
  let me2 = actor;
  for (const d of deliveries.filter((x) => x.to === actorId)) me2 = applyDelta(me2, d.delta);
  v.version += 1;
  return { v, actor: me2, deliveries: deliveries.filter((x) => x.to !== actorId), events };
}
