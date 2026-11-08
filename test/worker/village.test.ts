import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { call, found, uniqueName } from './util';

async function join(code: string, name = uniqueName('Gast')) {
  const r = await call('POST', '/api/join', { inviteCode: code, name, password: 'geheim123' });
  return { ...r, name };
}
const state = async (cookie: string) => (await call('GET', '/api/state', undefined, cookie)).json.state;
const vact = (cookie: string, action: unknown) => call('POST', '/api/village/action', { action }, cookie);
const me = async (cookie: string) => (await call('GET', '/api/me', undefined, cookie)).json;

describe('village API', () => {
  it('founding + joining: two members, different specialties, snapshots in both workshops', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const v = await call('GET', '/api/village', undefined, a.cookie!);
    expect(v.status).toBe(200);
    expect(v.json.village.members).toHaveLength(2);
    const [m1, m2] = v.json.village.members;
    expect(m1.specialty).not.toBe(m2.specialty);
    const sa = await state(a.cookie!), sb = await state(b.cookie!);
    expect(sa.village.specialty).toBe(m1.specialty);
    expect(sb.village.specialty).toBe(m2.specialty);
    expect(sa.village.members).toBe(2);
    expect(v.json.village.jointOrders.length).toBe(2);
  });
  it('a gift moves materials between the two workshops', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const idB = (await me(b.cookie!)).playerId;
    const r = await vact(a.cookie!, { type: 'gift', to: idB, give: { kind: 'material', material: 'ton', count: 5 } });
    expect(r.status).toBe(200);
    expect(r.json.state.materials.ton).toBe(25);
    const sb = await state(b.cookie!);
    expect(sb.materials.ton).toBeGreaterThanOrEqual(35);
  });
  it('[Review Focus 1] two players accepting the same offer: exactly one wins', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const c = await join(a.json.inviteCode);
    const post = await vact(a.cookie!, { type: 'postOffer', give: { kind: 'material', material: 'ton', count: 10 }, want: { kind: 'taler', amount: 5 } });
    expect(post.status).toBe(200);
    const offerId = post.json.village.offers[0].id;
    const [rb, rc] = await Promise.all([vact(b.cookie!, { type: 'acceptOffer', offerId }), vact(c.cookie!, { type: 'acceptOffer', offerId })]);
    expect([rb.status, rc.status].sort()).toEqual([200, 400]);
    const loser = rb.status === 400 ? rb : rc;
    expect(loser.json.error).toBe('Dieses Angebot ist schon weg');
    const tb = (await state(b.cookie!)).materials.ton, tc = (await state(c.cookie!)).materials.ton;
    expect(tb + tc).toBeGreaterThanOrEqual(70); // 30 + 30 + 10 escrow, plus specialty trickle at most
    expect([tb, tc].filter((t) => t >= 40).length).toBe(1);
    expect((await state(a.cookie!)).taler).toBe(105);
  });
  it('[Review Focus 2] a delivery and the recipient’s own action both survive', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const idB = (await me(b.cookie!)).playerId;
    const sb0 = await state(b.cookie!);
    const [g, own] = await Promise.all([
      vact(a.cookie!, { type: 'gift', to: idB, give: { kind: 'material', material: 'glasurbasis', count: 4 } }),
      call('POST', '/api/action', { action: { type: 'buyMaterial', material: 'ton', amount: 3 }, version: sb0.version }, b.cookie!),
    ]);
    expect(g.status).toBe(200);
    if (own.status === 409) {
      const fresh = await state(b.cookie!);
      expect((await call('POST', '/api/action', { action: { type: 'buyMaterial', material: 'ton', amount: 3 }, version: fresh.version }, b.cookie!)).status).toBe(200);
    } else expect(own.status).toBe(200);
    const sb = await state(b.cookie!);
    expect(sb.materials.glasurbasis).toBe(sb0.materials.glasurbasis + 4);
    expect(sb.materials.ton).toBeGreaterThanOrEqual(sb0.materials.ton + 3);
  });
  it('[Review Focus 5] visits stay inside the village and leak nothing secret', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const other = await found();
    const idB = (await me(b.cookie!)).playerId;
    const idOther = (await me(other.cookie!)).playerId;
    const ok = await call('GET', `/api/village/visit/${idB}`, undefined, a.cookie!);
    expect(ok.status).toBe(200);
    expect(ok.json.state.playerId).toBe(idB);
    expect(JSON.stringify(ok.json)).not.toMatch(/pw_hash|pw_salt|password|token/);
    expect((await call('GET', `/api/village/visit/${idOther}`, undefined, a.cookie!)).status).toBe(404);
    expect((await call('GET', '/api/village/visit/nobody', undefined, a.cookie!)).status).toBe(404);
  });
  it('helping a friend boosts their workshop and signs the guestbook', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const idB = (await me(b.cookie!)).playerId;
    const r = await vact(a.cookie!, { type: 'help', target: idB, sticker: 'herz' });
    expect(r.status).toBe(200);
    const sb = await state(b.cookie!);
    expect(sb.village.helpBoostUntil).toBeGreaterThan(Date.now());
    const v = await call('GET', '/api/village', undefined, b.cookie!);
    expect(v.json.village.guestbooks[idB][0].sticker).toBe('herz');
  });
  it('the village is full at 10', async () => {
    const a = await found();
    for (let i = 0; i < 9; i++) expect((await join(a.json.inviteCode)).status).toBe(201);
    const late = await join(a.json.inviteCode);
    expect(late.status).toBe(409);
    expect(late.json.error).toBe('Das Dorf ist voll (höchstens 10)');
  });
  it('rejects malformed village actions', async () => {
    const a = await found();
    expect((await vact(a.cookie!, { type: 'hack' })).status).toBe(400);
    expect((await call('POST', '/api/village/action', '{nope', a.cookie!)).status).toBe(400);
    expect((await call('GET', '/api/village')).status).toBe(401);
  });
});

import { runInDurableObject } from 'cloudflare:test';

const villageStub = async (cookie: string) => {
  const m = await (await import('./util')).call('GET', '/api/me', undefined, cookie);
  const row = await env.DB.prepare('SELECT village_id FROM players WHERE id = ?').bind(m.json.playerId).first<{ village_id: string }>();
  return env.VILLAGE.get(env.VILLAGE.idFromName(row!.village_id));
};

describe('[Final review #2/#3/#4] village consistency', () => {
  it('two simultaneous joins into a village of 9: one gets in, the other gets 409 and no account', async () => {
    const a = await found();
    for (let i = 0; i < 8; i++) expect((await join(a.json.inviteCode)).status).toBe(201);
    const [x, y] = await Promise.all([join(a.json.inviteCode), join(a.json.inviteCode)]);
    expect([x.status, y.status].sort()).toEqual([201, 409]);
    const loser = x.status === 409 ? x : y;
    expect((await call('POST', '/api/login', { name: loser.name, password: 'geheim123' })).status).toBe(401);
    const v = await call('GET', '/api/village', undefined, a.cookie!);
    expect(v.json.village.members).toHaveLength(10);
  });
  it('a half-finished operation (village saved, workshop not) is rolled back', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const idA = (await me(a.cookie!)).playerId;
    const stub = await villageStub(a.cookie!);
    await runInDurableObject(stub, async (_inst: unknown, state: DurableObjectState) => {
      const prev = await state.storage.get<any>('state');
      const broken = structuredClone(prev);
      broken.offers.push({ id: 'ghost', from: idA, give: { kind: 'material', material: 'ton', count: 99 }, want: { kind: 'taler', amount: 1 }, createdAt: Date.now() });
      await state.storage.put({ state: broken, pending: { opId: 'never-written', playerId: idA, prev } });
    });
    const v = await call('GET', '/api/village', undefined, b.cookie!);
    expect(v.json.village.offers.find((o: any) => o.id === 'ghost')).toBeUndefined();
  });
  it('a queued delivery is applied exactly once, even if drained twice', async () => {
    const a = await found();
    const b = await join(a.json.inviteCode);
    const idB = (await me(b.cookie!)).playerId;
    const before = (await state(b.cookie!)).materials.holz ?? 0;
    const stub = await villageStub(a.cookie!);
    await runInDurableObject(stub, async (_inst: unknown, s: DurableObjectState) => {
      await s.storage.put('outbox', [{ key: 'manual:0', to: idB, delta: { materials: { holz: 7 } } }]);
    });
    await call('GET', '/api/village', undefined, a.cookie!);
    await runInDurableObject(stub, async (_inst: unknown, s: DurableObjectState) => {
      await s.storage.put('outbox', [{ key: 'manual:0', to: idB, delta: { materials: { holz: 7 } } }]);
    });
    await call('GET', '/api/village', undefined, a.cookie!);
    const after = (await state(b.cookie!)).materials.holz ?? 0;
    expect(after - before).toBeGreaterThanOrEqual(7);
    expect(after - before).toBeLessThan(14);
  });
  it('a new maker’s mark shows up in the village', async () => {
    const a = await found();
    await join(a.json.inviteCode);
    const s = await state(a.cookie!);
    const r = await call('POST', '/api/action', { action: { type: 'setMakerMark', mark: { shape: 'circle', letter: 'Q', color: '#2a4f9a' } }, version: s.version }, a.cookie!);
    expect(r.status).toBe(200);
    const v = await call('GET', '/api/village', undefined, a.cookie!);
    const idA = (await me(a.cookie!)).playerId;
    expect(v.json.village.members.find((m: any) => m.playerId === idA).makerMark.letter).toBe('Q');
  });
});
