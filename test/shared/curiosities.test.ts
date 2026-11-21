import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { ALBUM_PRIZES, CURIOSITIES, CURIOSITY_GROUPS } from '../../src/shared/content';
import { hashString } from '../../src/shared/rng';
import { DECOR, MAX_DECOR_PLACED } from '../../src/shared/village/decor';
import type { GameState } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

const NOW = T0 + 1000;

function ok(s: GameState, a: Action, now = NOW) {
  const r = applyAction(s, a, now);
  if (!r.ok) throw new Error(r.error);
  return r;
}

function expectRejected(s: GameState, a: Action, now = NOW) {
  const before = structuredClone(s);
  const r = applyAction(s, a, now);
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.length).toBeGreaterThan(3);
  expect(s).toEqual(before);
}

describe('curiosities', () => {
  it('a first discovery is recorded with its time, pays once and announces itself', () => {
    const r = ok(plainGame(), { type: 'discoverCuriosity', id: 'katze-streicheln' });
    expect(r.state.curiosities['katze-streicheln']).toBe(NOW);
    expect(r.state.taler).toBe(105);
    expect(r.events).toContainEqual({ kind: 'curiosity', id: 'katze-streicheln', text: 'Neu im Kuriositätenkabinett: Schnurrende Katze (+5 Taler)' });
    expectRejected(r.state, { type: 'discoverCuriosity', id: 'katze-streicheln' });
  });
  it('rejects unknown, prototype and server-only ids', () => {
    for (const id of ['quatsch', '__proto__', 'pflanze', 42]) expectRejected(plainGame(), { type: 'discoverCuriosity', id } as any);
  });
  it('a decor reward replaces the Taler and is set up while there is room', () => {
    const r = ok(plainGame(), { type: 'discoverCuriosity', id: 'drache' });
    expect(r.state.taler).toBe(100);
    expect(r.state.decorPlaced).toContain('drachenpluesch');
    expect(r.events.map((e) => e.text)).toContain('Neue Dekoration: Plüschdrache');
  });
  it('the mouse chain needs the previous step and three days', () => {
    const s = plainGame();
    expectRejected(s, { type: 'discoverCuriosity', id: 'maus-2' });
    const a = ok(s, { type: 'discoverCuriosity', id: 'maus-1' }).state;
    expectRejected(a, { type: 'discoverCuriosity', id: 'maus-2' }, NOW + 3 * 86_400_000 - 1);
    expect(ok(a, { type: 'discoverCuriosity', id: 'maus-2' }, NOW + 3 * 86_400_000).state.curiosities['maus-2']).toBeDefined();
  });
  it('the tenth entry brings the Ohrensessel', () => {
    const s = plainGame();
    const ids = Object.keys(CURIOSITIES).filter((id) => !CURIOSITIES[id].serverOnly && !CURIOSITIES[id].chain && !CURIOSITIES[id].decor);
    for (const id of ids.slice(0, 9)) s.curiosities[id] = T0;
    const r = ok(s, { type: 'discoverCuriosity', id: ids[9] });
    expect(r.state.decor).toContain('ohrensessel');
    expect(r.events.map((e) => e.text)).toContain('10 Kuriositäten entdeckt! Neue Dekoration: Ohrensessel');
  });
  it('content is consistent', () => {
    const total = Object.keys(CURIOSITIES).length;
    expect(total).toBeGreaterThanOrEqual(ALBUM_PRIZES[ALBUM_PRIZES.length - 1].at);
    for (const [key, c] of Object.entries(CURIOSITIES)) {
      expect(c.id).toBe(key);
      expect(c.caption.length && c.hint.length && c.name.length).toBeTruthy();
      if (c.decor) expect(DECOR[c.decor]).toBeDefined();
      if (c.chain) expect(CURIOSITIES[c.chain.prev]).toBeDefined();
      expect(CURIOSITY_GROUPS.map((g) => g.id)).toContain(c.group);
    }
    for (const p of ALBUM_PRIZES) { expect(DECOR[p.decor]).toBeDefined(); expect(p.at).toBeLessThanOrEqual(total); }
  });
  it('six decor items can stand at once', () => {
    const s = plainGame(); s.decor = Object.keys(DECOR).slice(0, 7); s.decorPlaced = s.decor.slice(0, 6);
    expect(MAX_DECOR_PLACED).toBe(6);
    expectRejected(s, { type: 'placeDecor', id: s.decor[6] });
  });
  it('hashString is a stable unsigned FNV-1a', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
    expect(hashString('p1:12')).toBe(hashString('p1:12'));
  });
});
