import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../src/shared/types';
import { applyDelta, applyVillageAction } from '../../../src/shared/village/apply';
import { HELPS_PER_DAY } from '../../../src/shared/village/help';
import type { VillageAction, VillageState } from '../../../src/shared/village/types';
import { T0, village } from './helpers';

const MIN = 60_000;
function run(v: VillageState, ws: Record<string, GameState>, actor: string, a: VillageAction, now: number) {
  const r = applyVillageAction(v, actor, ws[actor], a, now);
  if (typeof r === 'string') return { v, ws, error: r };
  const next = { ...ws, [actor]: r.actor };
  for (const d of r.deliveries) next[d.to] = applyDelta(next[d.to], d.delta);
  return { v: r.v, ws: next, error: null as string | null };
}

describe('helping hands', () => {
  it('extends the boost by 15 min, capped at 60 min ahead, and writes the guestbook', () => {
    let { v, ws } = village(3);
    let r = run(v, ws, 'p1', { type: 'help', target: 'p2', sticker: 'herz' }, T0);
    expect(r.ws.p2.village!.helpBoostUntil).toBe(T0 + 15 * MIN);
    expect(r.v.guestbooks.p2[0]).toMatchObject({ from: 'p1', fromName: 'Anna', sticker: 'herz' });
    expect(r.ws.p1.ruf).toBe(ws.p1.ruf + 1);
    for (const h of ['p3', 'p3', 'p3', 'p1', 'p1']) { const x = run(r.v, r.ws, h, { type: 'help', target: 'p2', sticker: 'stern' }, T0); if (!x.error) r = x; }
    expect(r.ws.p2.village!.helpBoostUntil).toBe(T0 + 60 * MIN);
  });
  it(`allows ${HELPS_PER_DAY} helps per friend per day`, () => {
    let { v, ws } = village(2);
    for (let i = 0; i < HELPS_PER_DAY; i++) { const r = run(v, ws, 'p1', { type: 'help', target: 'p2', sticker: 'blume' }, T0 + i); expect(r.error).toBeNull(); v = r.v; ws = r.ws; }
    expect(run(v, ws, 'p1', { type: 'help', target: 'p2', sticker: 'blume' }, T0 + 10).error).toMatch(/morgen wieder/);
    expect(run(v, ws, 'p1', { type: 'help', target: 'p2', sticker: 'blume' }, T0 + 24 * 60 * MIN).error).toBeNull();
  });
  it('keeps at most 50 guestbook entries', () => {
    let { v, ws } = village(2);
    for (let d = 0; d < 20; d++) for (let i = 0; i < 3; i++) { const r = run(v, ws, 'p1', { type: 'help', target: 'p2', sticker: 'katze' }, T0 + d * 24 * 60 * MIN + i); v = r.v; ws = r.ws; }
    expect(v.guestbooks.p2.length).toBe(50);
  });
});
