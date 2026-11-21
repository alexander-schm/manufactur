import { CUSTOMERS, MATERIALS, own } from '../content';
import { tierAtLeast } from '../content';
import { fmtTaler } from '../format';
import { nextRandom, pick } from '../rng';
import type { GameState, Tier } from '../types';
import { RATHAUS_COUNT_MUL, RATHAUS_REWARD_MUL, levelOf } from './benefits';
import { SUBSTITUTE_FACTOR, takeGoods } from './goods';
import { levelBonus, noteLevelUp, villageLevel } from './level';
import { BUILDING_ORDER, BUILDINGS } from './buildings';
import { DESIGN_MEMBERS, addNews, maxMemberTier, vid } from './state';
import { villageStorePrice } from './specialties';
import type { Delivery, JointOrder, JointPart, VillageState } from './types';

export interface JointTemplate { id: string; title: string; client: string; parts: JointPart[]; reward: { taler: number; ruf: number; decor: string }; /** 1 = doable by brand-new players (cups + raw materials) */ tier?: 1; /** only offered once a member can make it / the village has the building */ needs?: { tier?: Tier; building?: string } }

/** Base sizes are for a village of ~3; scaled by member count (balanced up to 6). */
export const JOINT_TEMPLATES: JointTemplate[] = [
  { id: 'dorffest', title: 'Becher fürs erste Dorffest', client: 'Der Dorfrat', tier: 1,
    parts: [{ kind: 'goods', form: 'becher', count: 20, minQuality: 1 }, { kind: 'material', material: 'ton', count: 60 }, { kind: 'material', material: 'holz', count: 40 }],
    reward: { taler: 500, ruf: 35, decor: 'wimpelkette' } },
  { id: 'feuerwehr', title: 'Kaffeebecher für die Feuerwehr', client: 'Hauptmann Brandt', tier: 1,
    parts: [{ kind: 'goods', form: 'becher', count: 24, minQuality: 1 }, { kind: 'material', material: 'holz', count: 50 }, { kind: 'material', material: 'eisenoxid', count: 8 }],
    reward: { taler: 550, ruf: 35, decor: 'laterne' } },
  { id: 'schule', title: 'Trinkbecher für die Dorfschule', client: 'Lehrer Brösel', tier: 1,
    parts: [{ kind: 'goods', form: 'becher', count: 18, minQuality: 1 }, { kind: 'material', material: 'ton', count: 80 }, { kind: 'material', material: 'kupferoxid', count: 6 }],
    reward: { taler: 500, ruf: 30, decor: 'blumenkasten' } },
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
  { id: 'bierkeller', title: 'Steinzeugkrüge für den Bierkeller', client: 'Braumeister Hopfinger', needs: { tier: 'manufaktur' },
    parts: [{ kind: 'goods', form: 'krug', count: 12, minQuality: 1, body: 'steinzeug' }, { kind: 'material', material: 'holz', count: 80 }, { kind: 'material', material: 'salz', count: 20 }],
    reward: { taler: 4000, ruf: 80, decor: 'steinzeugtopf' } },
  { id: 'teestube', title: 'Teeservice für die Teestube', client: 'Frau Kamille', needs: { tier: 'manufaktur' },
    parts: [{ kind: 'goods', form: 'teekanne', count: 6, minQuality: 1, body: 'steinzeug' }, { kind: 'goods', form: 'becher', count: 24, minQuality: 1, body: 'steinzeug' }, { kind: 'material', material: 'kobalt', count: 20 }],
    reward: { taler: 6000, ruf: 100, decor: 'glasurproben' } },
  { id: 'kurhaus', title: 'Porzellan fürs Kurhaus', client: 'Kurdirektor Sprudel', needs: { tier: 'hofmanufaktur' },
    parts: [{ kind: 'goods', form: 'teller', count: 24, minQuality: 2, body: 'porzellan' }, { kind: 'goods', form: 'schale', count: 12, minQuality: 1, body: 'porzellan' }, { kind: 'material', material: 'kaolin', count: 40 }],
    reward: { taler: 15000, ruf: 160, decor: 'porzellanvoegel' } },
  { id: 'badehaus', title: 'Fliesen fürs Badehaus', client: 'Bademeisterin Welle', needs: { tier: 'hofmanufaktur' },
    parts: [{ kind: 'goods', form: 'fliese', count: 160, minQuality: 1 }, { kind: 'material', material: 'kobalt', count: 30 }, { kind: 'material', material: 'holz', count: 100 }],
    reward: { taler: 12000, ruf: 140, decor: 'teppich-blau' } },
  { id: 'herbstmarkt', title: 'Aschekrüge für den Herbstmarkt', client: 'Marktmeister Korb', needs: { building: 'gemeinschaftsofen' },
    parts: [{ kind: 'goods', form: 'krug', count: 6, minQuality: 1, effect: 'ascheanflug' }, { kind: 'goods', form: 'becher', count: 20, minQuality: 1 }, { kind: 'material', material: 'holz', count: 120 }],
    reward: { taler: 8000, ruf: 120, decor: 'laterne' } },
];

export const BASE_SHARE = 0.4;
export const OPEN_JOINT_ORDERS = 2;
export const COMPLETIONS_PER_BUILDING = 2;

const scale = (members: number) => 0.6 + 0.2 * Math.min(members, DESIGN_MEMBERS);

const needsMet = (t: JointTemplate, v: VillageState): boolean =>
  (!t.needs?.tier || tierAtLeast({ tier: maxMemberTier(v) }, t.needs.tier)) && (!t.needs?.building || v.buildings.includes(t.needs.building));

export function generateJointOrder(v: VillageState, now: number): JointOrder {
  const open = v.jointOrders.map((o) => o.templateId);
  // the first ones must be doable right after founding: cups and raw materials only
  const pool = v.completedJoint < COMPLETIONS_PER_BUILDING ? JOINT_TEMPLATES.filter((t) => t.tier === 1) : JOINT_TEMPLATES.filter((t) => !t.tier && needsMet(t, v));
  const choices = pool.filter((t) => !open.includes(t.id));
  let r = v.rng;
  let t: JointTemplate; [t, r] = pick(r, choices.length ? choices : pool);
  let seedV; [seedV, r] = nextRandom(r);
  v.rng = r;
  const f = scale(v.members.length);
  const rathaus = levelOf(v.projects.levels, 'rathaus');
  const countMul = rathaus ? RATHAUS_COUNT_MUL[rathaus - 1] : 1, rewardMul = rathaus ? RATHAUS_REWARD_MUL[rathaus - 1] : 1;
  return {
    id: vid(v, 'j'), templateId: t.id, title: t.title, client: t.client, clientSeed: Math.floor(seedV * 0xffffffff) >>> 0,
    parts: t.parts.map((p) => ({ ...p, count: Math.max(1, Math.ceil(Math.max(1, Math.ceil(p.count * f)) * countMul)), filled: 0 })),
    contributions: {}, reward: { taler: Math.round(t.reward.taler * f * rewardMul), ruf: Math.round(t.reward.ruf * f * rewardMul), decor: t.reward.decor }, createdAt: now,
  };
}

/** Joint orders exist only where there is someone to do them with. Mutates and returns v. */
export function ensureJointOrders(v: VillageState, now: number): VillageState {
  if (v.members.length < 2) return v;
  while (v.jointOrders.length < OPEN_JOINT_ORDERS) v.jointOrders.push(generateJointOrder(v, now));
  return v;
}

/** How many units of this part the actor may give without finishing the whole order alone (substitutes count 3 pieces per unit). */
export function maxContribution(o: JointOrder, partIndex: number, actorId: string): number {
  const p = o.parts[partIndex];
  if (!p) return 0;
  const left = p.count - p.filled;
  const others = Object.keys(o.contributions).some((id) => id !== actorId);
  if (others) return left;
  const leftElsewhere = o.parts.reduce((n, q, i) => n + (i === partIndex ? 0 : q.count - q.filled), 0);
  return leftElsewhere > 0 ? left : Math.max(0, left - 1);
}

export const isComplete = (o: JointOrder) => o.parts.every((p) => p.filled >= p.count) && Object.keys(o.contributions).length >= 2;

/** Everyone gets the base share; the rest by contribution. Absent members are never left out. */
export function payout(v: VillageState, o: JointOrder): Delivery[] {
  const bonus = (v.buildings.includes('gildenhaus') ? 1.2 : 1) * levelBonus(v);
  const taler = o.reward.taler * bonus, ruf = o.reward.ruf * bonus;
  const totalPts = Object.values(o.contributions).reduce((a, b) => a + b, 0) || 1;
  const n = v.members.length;
  return v.members.map((m) => {
    const share = BASE_SHARE / n + (1 - BASE_SHARE) * ((o.contributions[m.playerId] ?? 0) / totalPts);
    return { to: m.playerId, delta: { taler: Math.round(taler * share), ruf: Math.max(1, Math.round(ruf * share)), decor: [o.reward.decor] } };
  });
}

/** Take a contribution from the actor (mutates actor + order). Returns value points or a German error. */
export function contributeTo(o: JointOrder, partIndex: number, actor: GameState, count: number, source: 'own' | 'store' | 'substitute', ref: { designId?: string; quality?: 1 | 2 | 3; effect?: string | null }): number | string {
  const p = o.parts[partIndex];
  if (!p) return 'Diesen Teil gibt es nicht';
  const left = p.count - p.filled;
  if (left <= 0) return 'Dieser Teil ist schon fertig';
  const units = source === 'substitute' ? Math.floor(count / SUBSTITUTE_FACTOR) : count;
  if (units > left) return `Es fehlen nur noch ${left}`;
  if (p.kind === 'material') {
    if (source === 'substitute') return 'Dafür gibt es keinen Ersatz';
    const base = own(MATERIALS, p.material)!.price;
    if (source === 'store') {
      const cost = villageStorePrice(p.material) * count;
      if (actor.taler < cost) return `Im Dorfladen kostet das ${fmtTaler(cost)} Taler – so viel hast du nicht`;
      actor.taler = Math.round((actor.taler - cost) * 100) / 100;
    } else {
      if ((actor.materials[p.material] ?? 0) < count) return `Du hast nicht genug ${own(MATERIALS, p.material)!.name}`;
      actor.materials[p.material] -= count;
    }
    p.filled += count;
    return base * count;
  }
  if (source === 'store') return 'Ware gibt es nicht im Dorfladen – die musst du selbst töpfern';
  const taken = takeGoods(actor, p, ref, count, source === 'substitute');
  if (typeof taken === 'string') return taken;
  p.filled += taken.units;
  return taken.points;
}

/** Finish a complete order: payouts, buildings, news. Mutates v; returns deliveries. */
export function completeJointOrder(v: VillageState, o: JointOrder, now: number): Delivery[] {
  const out = payout(v, o);
  v.jointOrders = v.jointOrders.filter((x) => x !== o);
  const levelBefore = villageLevel(v);
  v.completedJoint += 1;
  noteLevelUp(v, levelBefore, now);
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
