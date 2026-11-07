import { describe, expect, it } from 'vitest';
import { call, found, uniqueName } from './util';

describe('accounts', () => {
  it('found → me works with the session cookie', async () => {
    const f = await found();
    expect(f.status).toBe(201);
    expect(f.json.inviteCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(f.cookie).toMatch(/^mf_session=/);
    const me = await call('GET', '/api/me', undefined, f.cookie!);
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ name: f.name, villageName: 'Tonhausen', inviteCode: f.json.inviteCode });
  });
  it('session cookie is HttpOnly, Secure, SameSite=Lax', async () => {
    const res = await (await import('cloudflare:test')).SELF.fetch('https://x/api/found', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ villageName: 'Dorf', name: uniqueName(), password: 'geheim123' }),
    });
    const c = res.headers.get('set-cookie')!;
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/Secure/i);
    expect(c).toMatch(/SameSite=Lax/i);
    expect(c).toMatch(/Max-Age=7776000/);
  });
  it('join with the invite code works; wrong code is 404', async () => {
    const f = await found();
    const j = await call('POST', '/api/join', { inviteCode: f.json.inviteCode.toLowerCase(), name: uniqueName('Gast'), password: 'geheim123' });
    expect(j.status).toBe(201);
    const bad = await call('POST', '/api/join', { inviteCode: 'ZZZZZZ', name: uniqueName(), password: 'geheim123' });
    expect(bad.status).toBe(404);
    expect(bad.json.error).toBe('Einladungscode unbekannt');
  });
  it('duplicate name in any case is 409', async () => {
    const f = await found();
    const dup = await call('POST', '/api/found', { villageName: 'Xdorf', name: f.name.toUpperCase(), password: 'geheim123' });
    expect(dup.status).toBe(409);
    expect(dup.json.error).toBe('Name schon vergeben');
  });
  it('login: right password 200, wrong password 401', async () => {
    const f = await found();
    const ok = await call('POST', '/api/login', { name: f.name, password: 'geheim123' });
    expect(ok.status).toBe(200);
    expect(ok.cookie).toMatch(/^mf_session=/);
    const bad = await call('POST', '/api/login', { name: f.name, password: 'falsch!!' });
    expect(bad.status).toBe(401);
    expect(bad.json.error).toBe('Name oder Passwort falsch');
  });
  it('logout ends the session', async () => {
    const f = await found();
    expect((await call('POST', '/api/logout', undefined, f.cookie!)).status).toBe(204);
    expect((await call('GET', '/api/me', undefined, f.cookie!)).status).toBe(401);
  });
  it('validates names and passwords', async () => {
    expect((await call('POST', '/api/found', { villageName: 'X', name: 'A', password: 'geheim123' })).status).toBe(400);
    const short = await call('POST', '/api/found', { villageName: 'X', name: uniqueName(), password: '123' });
    expect(short.status).toBe(400);
    expect(short.json.error).toBe('Passwort zu kurz (mind. 6 Zeichen)');
    expect((await call('POST', '/api/found', '{not json')).status).toBe(400);
  });
});
