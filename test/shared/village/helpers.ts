import { newGame } from '../../../src/shared/state';
import type { GameState, Tier } from '../../../src/shared/types';
import { applyDelta, applyVillageAction } from '../../../src/shared/village/apply';
import { addMember, newVillage } from '../../../src/shared/village/state';
import type { VillageAction, VillageState } from '../../../src/shared/village/types';

export const T0 = 1_800_000_000_000;

export function village(n = 2): { v: VillageState; ws: Record<string, GameState> } {
  let v = newVillage('v1', 'Tonhausen', 7);
  const ws: Record<string, GameState> = {};
  const names = ['Anna', 'Ben', 'Cleo', 'Dora', 'Emil', 'Fiete'];
  for (let i = 0; i < n; i++) {
    const id = `p${i + 1}`;
    v = addMember(v, { playerId: id, name: names[i], avatarSeed: i, makerMark: { shape: 'heart', letter: names[i][0], color: '#b44c36' }, joinedAt: T0, lastSeen: T0 }) as VillageState;
    const g = newGame(id, 10 + i, T0);
    g.village = { villageId: 'v1', specialty: v.members[i].specialty, buildings: [], helpBoostUntil: 0, trickleCarry: 0, members: n };
    g.taler = 1000;
    g.materials = { ton: 50, glasurbasis: 20, holz: 10 };
    g.goods = [{ designId: g.designs[0].id, quality: 2, effect: null, count: 12 }];
    g.unlocks.push('studio');
    ws[id] = g;
  }
  return { v, ws };
}

export function runAction(v: VillageState, ws: Record<string, GameState>, actor: string, a: VillageAction, now = T0 + 1000) {
  const r = applyVillageAction(v, actor, ws[actor], a, now);
  if (typeof r === 'string') return { v, ws, error: r as string | null, events: [] as string[] };
  const next = { ...ws, [actor]: r.actor };
  for (const d of r.deliveries) next[d.to] = applyDelta(next[d.to], d.delta);
  return { v: r.v, ws: next, error: null as string | null, events: r.events as string[] };
}

/** Set a member's tier in both the workshop and the village roster. */
export function setTier(v: VillageState, ws: Record<string, GameState>, id: string, tier: Tier) {
  ws[id].tier = tier;
  const m = v.members.find((x) => x.playerId === id);
  if (m) m.tier = tier;
}
