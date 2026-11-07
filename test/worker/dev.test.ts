import { describe, expect, it } from 'vitest';
import { shiftTime } from '../../src/worker/dev';
import { newGame } from '../../src/shared/state';
import { call, found } from './util';

describe('dev warp', () => {
  it('is not available unless DEV_FAST=1', async () => {
    const f = await found();
    const r = await call('POST', '/api/dev/warp', { minutes: 10 }, f.cookie!);
    expect(r.status).toBe(404);
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
});
