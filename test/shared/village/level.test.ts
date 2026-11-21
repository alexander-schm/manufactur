import { describe, expect, it } from 'vitest';
import { decorationsFor, levelBonus, noteLevelUp, villageLevel } from '../../../src/shared/village/level';
import { activeMembers, ACTIVE_MEMBER_MS } from '../../../src/shared/village/state';
import { T0, village } from './helpers';

const at = (completedJoint: number, stagesDone = 0) => ({ completedJoint, stagesDone });

describe('village level', () => {
  it('is completed joint orders plus finished stages', () => {
    expect(villageLevel(at(9, 3))).toBe(12);
  });
  it('bonus is 1 at level 0, grows 2% per level and caps at 1.4', () => {
    expect(levelBonus(at(0))).toBe(1);
    expect(levelBonus(at(10))).toBeCloseTo(1.2, 10);
    expect(levelBonus(at(20))).toBeCloseTo(1.4, 10);
    expect(levelBonus(at(30, 5))).toBeCloseTo(1.4, 10);
  });
  it('decorations unlock at 5, 10, ... 30', () => {
    expect(decorationsFor(4)).toEqual([]);
    expect(decorationsFor(12)).toEqual(['blumenbeete', 'laternen']);
  });
  it('announces a level-up, naming new decorations', () => {
    const { v } = village(1);
    v.completedJoint = 5;
    noteLevelUp(v, 4, T0);
    expect(v.news.at(-1)!.text).toBe('Das Dorf ist jetzt auf Stufe 5! Neu auf dem Dorfplatz: Blumenbeete.');
    v.completedJoint = 6;
    noteLevelUp(v, 5, T0);
    expect(v.news.at(-1)!.text).toBe('Das Dorf ist jetzt auf Stufe 6!');
    const n = v.news.length;
    noteLevelUp(v, 6, T0);
    expect(v.news).toHaveLength(n);
  });
  it('active members were seen within 7 days', () => {
    const { v } = village(2);
    v.members[0].lastSeen = T0 - ACTIVE_MEMBER_MS;
    v.members[1].lastSeen = T0 - ACTIVE_MEMBER_MS - 1;
    expect(activeMembers(v, T0).map((m) => m.playerId)).toEqual(['p1']);
  });
});
