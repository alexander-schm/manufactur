import { CUSTOMERS, MATERIALS, own } from '../content';
import { colorFamily } from '../design';
import { pieceValue } from '../market';
import { nextRandom, pick } from '../rng';
import type { GameState } from '../types';
import { BUILDING_ORDER, BUILDINGS } from './buildings';
import { DESIGN_MEMBERS, addNews, vid } from './state';
import { villageStorePrice } from './specialties';
import type { Delivery, JointOrder, JointPart, VillageState } from './types';

export interface JointTemplate { id: string; title: string; client: string; parts: JointPart[]; reward: { taler: number; ruf: number; decor: string } }

/** Base sizes are for a village of ~3; scaled by member count (balanced up to 6). */
export const JOINT_TEMPLATES: JointTemplate[] = [
  { id: 'hochzeit', title: 'Hochzeitsgeschirr für die Müllerstochter', client: 'Familie Mahlzahn',
    parts: [{ kind: 'goods', form: 'teller', count: 18, minQuality: 2, colorFamily: 'blau' }, { kind: 'goods', form: 'becher', count: 18, minQuality: 1 }, { kind: 'material', material: 'kobalt', count: 30 }, { kind: 'material', material: 'holz', count: 60 }],
    reward: { taler: 900, ruf: 60, decor: 'wandteller' } },
  { id: 'brunnenfest', title: 'Krüge für das Brunnenfest', client: 'Bürgermeisterin Quellmann',
    parts: [{ kind: 'goods', form: 'krug', count: 10, minQuality: 1 }, { kind: 'goods', form: 'becher', count: 30, minQuality: 1 }, { kind: 'material', material: 'kupferoxid', count: 25 }, { kind: 'material', material: 'holz', count: 50 }],
    reward: { taler: 800, ruf: 50, decor: 'wimpelkette' } },
  { id: 'kloster', title: 'Schalen für die Klosterküche', client: 'Schwester Agathe',
    parts: [{ kind: 'goods', form: 'schale', count: 30, minQuality: 1 }, { kind: 'material', material: 'eisenoxid', count: 30 }, { kind: 'material', material: 'ton', count: 150 }],
    reward: { taler: 700, ruf: 45, decor: 'haengekorb' } },
  { id: 'gasthaus', title: 'Neues Geschirr für den „Goldenen Krug“', client: 'Herr Krummbein',
    parts: [{ kind: 'goods', form: 'becher', count: 24, minQuality: 1, colorFamily: 'braun' }, { kind: 'goods', form: 'teller', count: 24, minQuality: 1 }, { kind: 'material', material: 'eisenoxid', count: 20 }, { kind: 'material', material: 'holz', count: 40 }],
    reward: { taler: 850, ruf: 55, decor: 'laterne' } },
  { id: 'schloss', title: 'Prunkvasen fürs Schloss', client: 'Baronin von Tüpfel',
    parts: [{ kind: 'goods', form: 'vase', count: 8, minQuality: 2 }, { kind: 'material', material: 'kobalt', count: 20 }, { kind: 'material', material: 'kupferoxid', count: 20 }],
    reward: { taler: 1000, ruf: 70, decor: 'grosse-vase' } },
  { id: 'erntedank', title: 'Erntedank-Tafel auf dem Dorfplatz', client: 'Der Dorfrat',
    parts: [{ kind: 'goods', form: 'schale', count: 20, minQuality: 1, colorFamily: 'gruen' }, { kind: 'goods', form: 'krug', count: 8, minQuality: 1 }, { kind: 'material', material: 'ton', count: 120 }, { kind: 'material', material: 'kupferoxid', count: 15 }],
    reward: { taler: 750, ruf: 50, decor: 'blumenkasten' } },
  { id: 'vogelfreunde', title: 'Futterschalen für den Vogelverein', client: 'Frau Spatz',
    parts: [{ kind: 'goods', form: 'schale', count: 16, minQuality: 1 }, { kind: 'material', material: 'holz', count: 80 }, { kind: 'material', material: 'eisenoxid', count: 15 }],
    reward: { taler: 650, ruf: 40, decor: 'vogelhaus' } },
  { id: 'seemann', title: 'Blaue Becher für die Seemannsrunde', client: 'Käpt’n Seegras',
    parts: [{ kind: 'goods', form: 'becher', count: 30, minQuality: 1, colorFamily: 'blau' }, { kind: 'material', material: 'kobalt', count: 25 }, { kind: 'material', material: 'holz', count: 30 }],
    reward: { taler: 700, ruf: 45, decor: 'teppich-blau' } },
];

export const BASE_SHARE = 0.4;
export const OPEN_JOINT_ORDERS = 2;
export const COMPLETIONS_PER_BUILDING = 2;

const scale = (members: number) => 0.6 + 0.2 * Math.min(members, DESIGN_MEMBERS);

export function generateJointOrder(v: VillageState, now: number): JointOrder {
  const open = v.jointOrders.map((o) => o.templateId);
  const choices = JOINT_TEMPLATES.filter((t) => !open.includes(t.id));
  let r = v.rng;
  let t: JointTemplate; [t, r] = pick(r, choices.length ? choices : JOINT_TEMPLATES);
  let seedV; [seedV, r] = nextRandom(r);
  v.rng = r;
  const f = scale(v.members.length);
  return {
    id: vid(v, 'j'), templateId: t.id, title: t.title, client: t.client, clientSeed: Math.floor(seedV * 0xffffffff) >>> 0,
    parts: t.parts.map((p) => ({ ...p, count: Math.max(1, Math.ceil(p.count * f)), filled: 0 })),
    contributions: {}, reward: { taler: Math.round(t.reward.taler * f), ruf: Math.round(t.reward.ruf * f), decor: t.reward.decor }, createdAt: now,
  };
}

/** Joint orders exist only where there is someone to do them with. Mutates and returns v. */
export function ensureJointOrders(v: VillageState, now: number): VillageState {
  if (v.members.length < 2) return v;
  while (v.jointOrders.length < OPEN_JOINT_ORDERS) v.jointOrders.push(generateJointOrder(v, now));
  return v;
}

export const isComplete = (o: JointOrder) => o.parts.every((p) => p.filled >= p.count) && Object.keys(o.contributions).length >= 2;

/** Everyone gets the base share; the rest by contribution. Absent members are never left out. */
export function payout(v: VillageState, o: JointOrder): Delivery[] {
  const bonus = v.buildings.includes('gildenhaus') ? 1.2 : 1;
  const taler = o.reward.taler * bonus, ruf = o.reward.ruf * bonus;
  const totalPts = Object.values(o.contributions).reduce((a, b) => a + b, 0) || 1;
  const n = v.members.length;
  return v.members.map((m) => {
    const share = BASE_SHARE / n + (1 - BASE_SHARE) * ((o.contributions[m.playerId] ?? 0) / totalPts);
    return { to: m.playerId, delta: { taler: Math.round(taler * share), ruf: Math.max(1, Math.round(ruf * share)), decor: [o.reward.decor] } };
  });
}

/** Take a contribution from the actor (mutates actor + order). Returns value points or a German error. */
export function contributeTo(o: JointOrder, partIndex: number, actor: GameState, count: number, source: 'own' | 'store', ref: { designId?: string; quality?: 1 | 2 | 3; effect?: string | null }): number | string {
  const p = o.parts[partIndex];
  if (!p) return 'Diesen Teil gibt es nicht';
  const left = p.count - p.filled;
  if (left <= 0) return 'Dieser Teil ist schon fertig';
  if (count > left) return `Es fehlen nur noch ${left}`;
  if (p.kind === 'material') {
    const base = own(MATERIALS, p.material)!.price;
    if (source === 'store') {
      const cost = villageStorePrice(p.material) * count;
      if (actor.taler < cost) return `Im Dorfladen kostet das ${cost} Taler – so viel hast du nicht`;
      actor.taler = Math.round((actor.taler - cost) * 100) / 100;
    } else {
      if ((actor.materials[p.material] ?? 0) < count) return `Du hast nicht genug ${own(MATERIALS, p.material)!.name}`;
      actor.materials[p.material] -= count;
    }
    p.filled += count;
    return base * count;
  }
  if (source === 'store') return 'Ware gibt es nicht im Dorfladen – die musst du selbst töpfern';
  const d = actor.designs.find((x) => x.id === ref.designId);
  const stack = actor.goods.find((g) => g.designId === ref.designId && g.quality === ref.quality && g.effect === (ref.effect ?? null));
  if (!d || !stack || stack.count < count) return 'Davon hast du nicht genug im Regal';
  if (d.form !== p.form) return 'Das ist die falsche Form';
  if (stack.quality < p.minQuality) return 'Die Qualität reicht nicht';
  if (p.colorFamily) {
    const color = d.origin?.glazeColor ?? actor.glazes.find((g) => g.id === d.glazeId)?.color ?? '#e9c9a6';
    if (colorFamily(color) !== p.colorFamily) return 'Die Farbe passt nicht';
  }
  const points = pieceValue(actor, stack) * count;
  stack.count -= count;
  actor.goods = actor.goods.filter((g) => g.count > 0);
  p.filled += count;
  return points;
}

/** Finish a complete order: payouts, buildings, news. Mutates v; returns deliveries. */
export function completeJointOrder(v: VillageState, o: JointOrder, now: number): Delivery[] {
  const out = payout(v, o);
  v.jointOrders = v.jointOrders.filter((x) => x !== o);
  v.completedJoint += 1;
  addNews(v, `Großauftrag geschafft: „${o.title}“! Alle bekommen ihren Anteil.`, null, now);
  if (v.completedJoint % COMPLETIONS_PER_BUILDING === 0) {
    const next = BUILDING_ORDER.find((b) => !v.buildings.includes(b));
    if (next) {
      v.buildings.push(next);
      addNews(v, `Das Dorf hat jetzt: ${BUILDINGS[next].name}! ${BUILDINGS[next].description}`, null, now);
    }
  }
  for (const d of out) d.delta.village = { buildings: [...v.buildings] };
  ensureJointOrders(v, now);
  return out;
}

export const customerFor = (seed: number) => CUSTOMERS[seed % CUSTOMERS.length];
