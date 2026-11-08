import { describe, expect, it } from 'vitest';
import { addMember, MAX_MEMBERS, newVillage, validateVillageAction } from '../../../src/shared/village/state';
import type { Member, VillageAction } from '../../../src/shared/village/types';

const T0 = 1_800_000_000_000;
const member = (i: number): Omit<Member, 'specialty' | 'houseSlot'> => ({ playerId: `p${i}`, name: `Person${i}`, avatarSeed: i, makerMark: { shape: 'circle', letter: 'A', color: '#b44c36' }, joinedAt: T0, lastSeen: T0 });

describe('village state', () => {
  it('members get different specialties and houses', () => {
    let v = newVillage('v1', 'Tonhausen', 7);
    v = addMember(v, member(1)) as typeof v;
    v = addMember(v, member(2)) as typeof v;
    expect(v.members[0].specialty).not.toBe(v.members[1].specialty);
    expect(v.members[0].houseSlot).not.toBe(v.members[1].houseSlot);
  });
  it(`is full at ${MAX_MEMBERS}`, () => {
    let v = newVillage('v1', 'Tonhausen', 7);
    for (let i = 0; i < MAX_MEMBERS; i++) v = addMember(v, member(i)) as typeof v;
    expect(MAX_MEMBERS).toBe(10);
    expect(addMember(v, member(99))).toBe('Das Dorf ist voll (höchstens 10)');
  });
  it('adding the same player twice is a no-op', () => {
    let v = newVillage('v1', 'Tonhausen', 7);
    v = addMember(v, member(1)) as typeof v;
    expect((addMember(v, member(1)) as typeof v).members).toHaveLength(1);
  });
  it('validation rejects bad input in German', () => {
    let v = newVillage('v1', 'Tonhausen', 7);
    v = addMember(v, member(1)) as typeof v;
    v = addMember(v, member(2)) as typeof v;
    const bad: VillageAction[] = [
      { type: 'gift', to: 'p2', give: { kind: 'material', material: '__proto__', count: 1 } },
      { type: 'gift', to: 'p2', give: { kind: 'material', material: 'ton', count: -3 } },
      { type: 'gift', to: 'p1', give: { kind: 'material', material: 'ton', count: 3 } },
      { type: 'gift', to: 'nobody', give: { kind: 'material', material: 'ton', count: 3 } },
      { type: 'help', target: 'p2', sticker: 'bombe' },
      { type: 'help', target: 'p1', sticker: 'herz' },
      { type: 'postRequest', material: 'ton', count: 0 },
      { type: 'nope' } as unknown as VillageAction,
    ];
    for (const a of bad) {
      const e = validateVillageAction(v, 'p1', a);
      expect(e, JSON.stringify(a)).toMatch(/.{4,}/);
    }
    expect(validateVillageAction(v, 'p1', { type: 'gift', to: 'p2', give: { kind: 'material', material: 'ton', count: 3 } })).toBeNull();
    expect(validateVillageAction(v, 'stranger', { type: 'postRequest', material: 'ton', count: 3 })).toMatch(/.{4,}/);
  });
});
