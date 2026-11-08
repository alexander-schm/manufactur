import { describe, expect, it } from 'vitest';
import { call, found } from './util';

describe('game api', () => {
  it('returns the state after founding', async () => {
    const f = await found();
    const r = await call('GET', '/api/state', undefined, f.cookie!);
    expect(r.status).toBe(200);
    expect(r.json.state.taler).toBe(100);
    expect(typeof r.json.serverNow).toBe('number');
  });
  it('an action bumps the version by 1', async () => {
    const f = await found();
    const s0 = (await call('GET', '/api/state', undefined, f.cookie!)).json.state;
    const r = await call('POST', '/api/action', { action: { type: 'buyMaterial', material: 'ton', amount: 5 }, version: s0.version }, f.cookie!);
    expect(r.status).toBe(200);
    expect(r.json.state.version).toBe(s0.version + 1);
    expect(r.json.state.materials.ton).toBe(35);
    expect(Array.isArray(r.json.events)).toBe(true);
  });
  it('[Review Focus 3] two actions with the same version: 200 then 409 with the fresh state', async () => {
    const f = await found();
    const s0 = (await call('GET', '/api/state', undefined, f.cookie!)).json.state;
    const a = { type: 'buyMaterial', material: 'ton', amount: 1 };
    const [r1, r2] = await Promise.all([
      call('POST', '/api/action', { action: a, version: s0.version }, f.cookie!),
      call('POST', '/api/action', { action: a, version: s0.version }, f.cookie!),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 409]);
    const conflict = r1.status === 409 ? r1 : r2;
    expect(conflict.json.error).toBe('Veraltet');
    expect(conflict.json.state.version).toBe(s0.version + 1);
    expect(conflict.json.state.materials.ton).toBe(31);
  });
  it('[Review Focus 4] rejects unknown actions, malformed JSON, oversized bodies and anonymous calls', async () => {
    const f = await found();
    const s0 = (await call('GET', '/api/state', undefined, f.cookie!)).json.state;
    const hack = await call('POST', '/api/action', { action: { type: 'hack' }, version: s0.version }, f.cookie!);
    expect(hack.status).toBe(400);
    expect(hack.json.error).toBe('Unbekannte Aktion');
    expect((await call('POST', '/api/action', '{oops', f.cookie!)).status).toBe(400);
    expect((await call('POST', '/api/action', { action: { type: 'ackAway' } }, f.cookie!)).status).toBe(400);
    const big = { action: { type: 'setStall', designIds: Array(5000).fill('d1234567') }, version: s0.version };
    expect((await call('POST', '/api/action', big, f.cookie!)).status).toBe(413);
    expect((await call('GET', '/api/state')).status).toBe(401);
    const after = (await call('GET', '/api/state', undefined, f.cookie!)).json.state;
    expect(after.version).toBe(s0.version);
  });
  it('invalid game action is a 400 with a German message and does not save', async () => {
    const f = await found();
    const s0 = (await call('GET', '/api/state', undefined, f.cookie!)).json.state;
    const r = await call('POST', '/api/action', { action: { type: 'buyMaterial', material: 'ton', amount: 999 }, version: s0.version }, f.cookie!);
    expect(r.status).toBe(400);
    expect(r.json.error).toBe('Nicht genug Taler');
  });
});

import { env } from 'cloudflare:test';
import { shiftTime } from '../../src/worker/dev';

describe('[Final review #4] long absence is caught up in bounded chunks', () => {
  it('GET reports catchingUp and repeated GETs finish the catch-up', async () => {
    const f = await found();
    const me = (await call('GET', '/api/me', undefined, f.cookie!)).json;
    const row = await env.DB.prepare('SELECT state FROM workshops WHERE player_id = ?').bind(me.playerId).first<{ state: string }>();
    const s = JSON.parse(row!.state);
    s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
    const old = shiftTime(s, 20 * 24 * 3_600_000);
    await env.DB.prepare('UPDATE workshops SET state = ? WHERE player_id = ?').bind(JSON.stringify(old), me.playerId).run();
    let r = await call('GET', '/api/state', undefined, f.cookie!);
    expect(r.status).toBe(200);
    expect(r.json.catchingUp).toBe(true);
    expect(r.json.state.lastTick).toBeLessThan(r.json.serverNow);
    let n = 1;
    while (r.json.catchingUp && n < 200) { r = await call('GET', '/api/state', undefined, f.cookie!); n++; }
    expect(r.json.catchingUp).toBe(false);
    expect(r.json.state.stats.made).toBeGreaterThan(1000);
    expect(r.json.state.away).not.toBeNull();
  });
  it('an action during catch-up gets a 409 with the partial state instead of a CPU blow-up', async () => {
    const f = await found();
    const me = (await call('GET', '/api/me', undefined, f.cookie!)).json;
    const row = await env.DB.prepare('SELECT state, version FROM workshops WHERE player_id = ?').bind(me.playerId).first<{ state: string; version: number }>();
    const s = JSON.parse(row!.state);
    s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
    await env.DB.prepare('UPDATE workshops SET state = ? WHERE player_id = ?').bind(JSON.stringify(shiftTime(s, 20 * 24 * 3_600_000)), me.playerId).run();
    const r = await call('POST', '/api/action', { action: { type: 'buyMaterial', material: 'ton', amount: 1 }, version: row!.version }, f.cookie!);
    expect(r.status).toBe(409);
    expect(r.json.catchingUp).toBe(true);
  });
});
