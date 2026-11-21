import { describe, expect, it } from 'vitest';
import { grant, parseGrant, shiftTime } from '../../src/worker/dev';
import { newGame } from '../../src/shared/state';
import { call, found } from './util';

describe('dev warp', () => {
  it('is not available unless DEV_FAST=1', async () => {
    const f = await found();
    const r = await call('POST', '/api/dev/warp', { minutes: 10 }, f.cookie!);
    expect(r.status).toBe(404);
  });
  it('grant is not available unless DEV_FAST=1', async () => {
    const f = await found();
    expect((await call('POST', '/api/dev/grant', { taler: 1 }, f.cookie!)).status).toBe(404);
  });
  it('shiftTime moves every timestamp into the past', () => {
    const s = newGame('p', 1, 1_000_000);
    s.batches.push({ id: 'b', designId: 'd', count: 1, stage: 'form', stationId: 's', startedAt: 999_000, durationMs: 10, quality: 50 });
    s.cooldowns.x = 1_200_000;
    const t = shiftTime(s, 60_000);
    expect(t.lastTick).toBe(940_000);
    expect(t.lastSeen).toBe(940_000);
    expect(t.lastOrderAt).toBe(940_000);
    expect(t.batches[0].startedAt).toBe(939_000);
    expect(t.cooldowns.x).toBe(1_140_000);
  });
  it('parseGrant accepts finite amounts 0…10 000 000 and nothing else', () => {
    expect(parseGrant({ taler: 60000, ruf: 320 })).toEqual({ taler: 60000, ruf: 320 });
    expect(parseGrant({ ruf: 5 })).toEqual({ taler: 0, ruf: 5 });
    expect(parseGrant({})).toEqual({ taler: 0, ruf: 0 });
    expect(parseGrant({ taler: 10_000_000 })).toEqual({ taler: 10_000_000, ruf: 0 });
    for (const bad of [{ taler: -1 }, { ruf: 10_000_001 }, { taler: '5' }, { ruf: null }, { taler: Infinity }]) expect(parseGrant(bad), JSON.stringify(bad)).toBeNull();
    expect(parseGrant({ taler: NaN })).toBeNull();
  });
  it('grant adds Taler and Ruf without touching the original', () => {
    const s = newGame('p', 1, 1_000_000);
    const t = grant(s, { taler: 60000, ruf: 320 });
    expect(t.taler).toBe(60100);
    expect(t.ruf).toBe(320);
    expect(s.taler).toBe(100);
    expect(s.ruf).toBe(0);
  });
});
