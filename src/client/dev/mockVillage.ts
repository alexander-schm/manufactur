import { ensureJointOrders } from '../../shared/village/joint';
import { addMember, newVillage } from '../../shared/village/state';
import type { VillageState, VillageView } from '../../shared/village/types';

const NAMES = ['Anna', 'Ben', 'Cleo', 'Dora', 'Emil', 'Fiete', 'Greta', 'Hanno', 'Ida', 'Jule'];
const COLORS = ['#b44c36', '#4f7fc4', '#7fb85c', '#9a7ccf', '#e9708d', '#f2b84b', '#4f9cc4', '#c8784c', '#55708c', '#d9674c'];
const T0 = 1_800_000_000_000;

/** A believable village for dev pages and tests. */
export function mockVillage(n: number, buildings: string[], now = T0): VillageView {
  let v: VillageState = newVillage('dev', 'Tonhausen', 42);
  for (let i = 0; i < n; i++) {
    const r = addMember(v, { playerId: `p${i + 1}`, name: NAMES[i], avatarSeed: 1000 + i * 7919, makerMark: { shape: (['heart', 'star', 'leaf', 'circle'] as const)[i % 4], letter: NAMES[i][0], color: COLORS[i] }, joinedAt: now - 86_400_000, lastSeen: now - (i % 3) * 3_600_000 });
    if (typeof r !== 'string') v = r;
  }
  v.buildings = buildings;
  v.completedJoint = buildings.length * 2 + 1;
  ensureJointOrders(v, now);
  v.offers = n > 1 ? [{ id: 'o1', from: 'p2', give: { kind: 'material', material: 'kobalt', count: 10 }, want: { kind: 'material', material: 'holz', count: 30 }, createdAt: now }] : [];
  v.requests = n > 2 ? [{ id: 'r1', from: 'p3', material: 'holz', count: 20, createdAt: now }] : [];
  v.guestbooks = { p1: [{ from: 'p2', fromName: 'Ben', sticker: 'herz', at: now - 600_000 }] };
  const { helpsGiven: _h, rng: _r, nextId: _n, helpBoostUntil: _b, ...rest } = v;
  return { ...rest, helpsLeft: Object.fromEntries(v.members.map((m) => [m.playerId, 3])) };
}
