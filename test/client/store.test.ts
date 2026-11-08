import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/shared/state';
import type { GameState } from '../../src/shared/types';

const T0 = 1_800_000_000_000;
type Reply = { status: number; body: unknown };

function mockFetch(replies: Reply[]) {
  const calls: { url: string; body: any }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const r = replies.shift() ?? { status: 500, body: { error: 'keine Antwort' } };
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

async function freshStore() {
  vi.resetModules();
  return await import('../../src/client/store');
}

describe('store', () => {
  let state: GameState;
  beforeEach(() => { state = newGame('p', 3, T0); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('[Review Focus 2] a client clock 5 minutes ahead does not make the view run ahead of the server', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0 + 5 * 60_000);
    mockFetch([{ status: 200, body: { state, serverNow: T0 } }]);
    const store = await freshStore();
    await store.loadState();
    store.tick();
    expect(store.clockOffset.value).toBe(-5 * 60_000);
    expect(store.view.value!.lastTick).toBe(T0);
  });

  it('[Review Focus 3] a 409 adopts the server state, retries once with the new version, and ends equal to the server', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    const newer = { ...structuredClone(state), version: 5, taler: 500 };
    const final = { ...structuredClone(newer), version: 6, taler: 490, materials: { ...newer.materials, ton: 40 } };
    const calls = mockFetch([
      { status: 200, body: { state, serverNow: T0 } },
      { status: 409, body: { error: 'Veraltet', state: newer, serverNow: T0 } },
      { status: 200, body: { state: final, events: [], serverNow: T0 } },
    ]);
    const store = await freshStore();
    await store.loadState();
    await store.dispatch({ type: 'buyMaterial', material: 'ton', amount: 10 });
    expect(calls[1].body.version).toBe(0);
    expect(calls[2].body.version).toBe(5);
    expect(store.serverState.value).toEqual(final);
  });

  it('a 400 rolls back the optimistic state and shows a toast', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    mockFetch([
      { status: 200, body: { state, serverNow: T0 } },
      { status: 400, body: { error: 'Nicht genug Taler' } },
    ]);
    const store = await freshStore();
    const { toasts } = await import('../../src/client/ui/Toast');
    await store.loadState();
    const before = structuredClone(store.serverState.value);
    await store.dispatch({ type: 'buyMaterial', material: 'ton', amount: 10 });
    expect(store.serverState.value).toEqual(before);
    expect(toasts.value.some((t) => t.text === 'Nicht genug Taler' && t.kind === 'error')).toBe(true);
  });

  it('applies the action optimistically before the server answers', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    mockFetch([{ status: 200, body: { state, serverNow: T0 } }]);
    const store = await freshStore();
    await store.loadState();
    let resolve!: (r: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { resolve = r; })));
    const p = store.dispatch({ type: 'buyMaterial', material: 'ton', amount: 10 });
    await Promise.resolve();
    expect(store.view.value!.materials.ton).toBe(40);
    const confirmed = { ...structuredClone(state), version: 1, materials: { ...state.materials, ton: 40 }, taler: 90 };
    resolve(new Response(JSON.stringify({ state: confirmed, events: [], serverNow: T0 }), { status: 200 }));
    await p;
    expect(store.serverState.value!.version).toBe(1);
  });
});

describe('[Final review #4] client follows a chunked catch-up', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('loadState keeps fetching while the server is catching up', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    const s0 = newGame('p', 3, T0 - 1000);
    const partial = { ...structuredClone(s0), lastTick: T0 - 500 };
    const done = { ...structuredClone(s0), lastTick: T0 };
    const calls = mockFetch([
      { status: 200, body: { state: partial, serverNow: T0, catchingUp: true } },
      { status: 200, body: { state: partial, serverNow: T0, catchingUp: true } },
      { status: 200, body: { state: done, serverNow: T0, catchingUp: false } },
    ]);
    const store = await freshStore();
    await store.loadState();
    expect(calls.length).toBe(3);
    expect(store.serverState.value!.lastTick).toBe(T0);
  });
  it('a 409 "catching up" during an action finishes loading, then retries the action', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    const s0 = newGame('p', 3, T0);
    const after = { ...structuredClone(s0), version: 1, taler: 90, materials: { ...s0.materials, ton: 40 } };
    const calls = mockFetch([
      { status: 200, body: { state: s0, serverNow: T0, catchingUp: false } },
      { status: 409, body: { error: 'Deine Werkstatt holt noch auf', state: s0, serverNow: T0, catchingUp: true } },
      { status: 200, body: { state: s0, serverNow: T0, catchingUp: false } },
      { status: 200, body: { state: after, events: [], serverNow: T0 } },
    ]);
    const store = await freshStore();
    await store.loadState();
    await store.dispatch({ type: 'buyMaterial', material: 'ton', amount: 10 });
    expect(calls.map((c) => c.url)).toEqual(['/api/state', '/api/action', '/api/state', '/api/action']);
    expect(store.serverState.value).toEqual(after);
  });
});

describe('[Final review #5] an idle tab does not re-simulate ever-longer spans', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('tick rebases the local state once it is more than 2 minutes behind', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(T0);
    const s0 = newGame('p', 3, T0);
    mockFetch([{ status: 200, body: { state: s0, serverNow: T0 } }]);
    const store = await freshStore();
    await store.loadState();
    now.mockReturnValue(T0 + 60_000);
    store.tick();
    expect(store.serverState.value!.lastTick).toBe(T0);
    now.mockReturnValue(T0 + 5 * 60_000);
    store.tick();
    expect(store.serverState.value!.lastTick).toBe(T0 + 5 * 60_000);
    expect(store.serverState.value!.version).toBe(s0.version);
  });
});
