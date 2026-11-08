import { MATERIALS, own } from '../content';
import { assignSpecialty } from './specialties';
import { STICKERS, VILLAGE_ACTION_TYPES, type GiveRef, type Member, type VillageAction, type VillageState } from './types';

/** Balanced for 6, room for up to 10 (owner's call). */
export const DESIGN_MEMBERS = 6;
export const MAX_MEMBERS = 10;
export const MAX_OFFERS = 30;
export const MAX_REQUESTS = 20;
/** per person, so nobody's absence can block the board for everyone */
export const MAX_OFFERS_PER_MEMBER = 5;
export const MAX_REQUESTS_PER_MEMBER = 3;
export const MAX_NEWS = 100;
export const MAX_GUESTBOOK = 50;
export const MAX_COUNT = 10_000;

export function newVillage(villageId: string, name: string, seed: number): VillageState {
  return {
    schemaVersion: 1, version: 0, villageId, name, nextId: 1, rng: seed >>> 0,
    members: [], offers: [], requests: [], jointOrders: [], completedJoint: 0, buildings: [], news: [], guestbooks: {}, helpsGiven: {}, helpBoostUntil: {},
  };
}

export function vid(v: VillageState, prefix: string): string {
  return `${prefix}${v.nextId++}`;
}

export function addMember(v: VillageState, m: Omit<Member, 'specialty' | 'houseSlot'>): VillageState | string {
  if (v.members.some((x) => x.playerId === m.playerId)) return v;
  if (v.members.length >= MAX_MEMBERS) return `Das Dorf ist voll (höchstens ${MAX_MEMBERS})`;
  const out = structuredClone(v);
  const used = new Set(out.members.map((x) => x.houseSlot));
  let slot = 0;
  while (used.has(slot)) slot++;
  out.members.push({ ...m, specialty: assignSpecialty(out.members.map((x) => x.specialty), (out.rng + out.members.length * 7919) >>> 0), houseSlot: slot });
  addNews(out, `${m.name} ist ins Dorf gezogen – willkommen!`, null, m.joinedAt);
  return out;
}

export function addNews(v: VillageState, text: string, forId: string | null, at: number): void {
  v.news.push({ id: vid(v, 'n'), at, text, for: forId });
  if (v.news.length > MAX_NEWS) v.news.splice(0, v.news.length - MAX_NEWS);
}

const isCount = (n: unknown, max = MAX_COUNT) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= max;

function checkGive(g: GiveRef | undefined, allowGoods: boolean): string | null {
  if (!g || typeof g !== 'object') return 'Was denn?';
  switch (g.kind) {
    case 'material': {
      const m = own(MATERIALS, g.material);
      if (!m || m.locked) return 'Unbekanntes Material';
      return isCount(g.count) ? null : 'Ungültige Menge';
    }
    case 'taler':
      return isCount(g.amount, 1_000_000) ? null : 'Ungültiger Betrag';
    case 'goods':
      if (!allowGoods) return 'Ware geht hier nicht';
      if (typeof g.designId !== 'string' || ![1, 2, 3].includes(g.quality)) return 'Unbekannte Ware';
      if (g.effect !== null && typeof g.effect !== 'string') return 'Unbekannte Ware';
      return isCount(g.count) ? null : 'Ungültige Menge';
    default:
      return 'Was denn?';
  }
}

/** Structural validation; game-state checks (enough stock etc.) happen in apply. */
export function validateVillageAction(v: VillageState, actorId: string, a: VillageAction): string | null {
  if (!v.members.some((m) => m.playerId === actorId)) return 'Du wohnst nicht in diesem Dorf';
  if (!a || typeof a !== 'object' || !VILLAGE_ACTION_TYPES.includes(a.type)) return 'Unbekannte Aktion';
  const isMember = (id: unknown) => typeof id === 'string' && v.members.some((m) => m.playerId === id);
  switch (a.type) {
    case 'postOffer': {
      if (v.offers.length >= MAX_OFFERS) return 'Das Tauschbrett ist voll';
      if (v.offers.filter((o) => o.from === actorId).length >= MAX_OFFERS_PER_MEMBER) return `Du hast schon ${MAX_OFFERS_PER_MEMBER} Angebote am Brett – höchstens ${MAX_OFFERS_PER_MEMBER} gehen gleichzeitig`;
      return checkGive(a.give, true) ?? (a.want?.kind === 'material' || a.want?.kind === 'taler' ? checkGive(a.want, false) : 'Was möchtest du dafür?');
    }
    case 'cancelOffer':
    case 'acceptOffer':
      return typeof a.offerId === 'string' ? null : 'Unbekanntes Angebot';
    case 'gift':
      if (!isMember(a.to)) return 'Diese Person wohnt nicht im Dorf';
      if (a.to === actorId) return 'Dir selbst kannst du nichts schenken';
      return checkGive(a.give, true);
    case 'postRequest':
      if (v.requests.length >= MAX_REQUESTS) return 'Das Brett ist voll';
      if (v.requests.filter((r) => r.from === actorId).length >= MAX_REQUESTS_PER_MEMBER) return `Du hast schon ${MAX_REQUESTS_PER_MEMBER} Wünsche am Brett – höchstens ${MAX_REQUESTS_PER_MEMBER} gehen gleichzeitig`;
      return checkGive({ kind: 'material', material: a.material, count: a.count }, false);
    case 'removeRequest':
      return typeof a.requestId === 'string' ? null : 'Unbekannter Wunsch';
    case 'contribute':
      if (typeof a.jointId !== 'string' || !Number.isInteger(a.part) || a.part < 0) return 'Unbekannter Großauftrag';
      if (a.source !== 'own' && a.source !== 'store') return 'Woher denn?';
      return isCount(a.count) ? null : 'Ungültige Menge';
    case 'help':
      if (!isMember(a.target)) return 'Diese Person wohnt nicht im Dorf';
      if (a.target === actorId) return 'Bei dir selbst packst du ja sowieso mit an';
      return (STICKERS as readonly string[]).includes(a.sticker) ? null : 'Unbekannter Sticker';
  }
}
