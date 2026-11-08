import { render } from 'preact-render-to-string';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { newGame } from '../../src/shared/state';

const T0 = 1_800_000_000_000;

function mockFetch(replies: { status: number; body: unknown }[]) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    const r = replies.shift() ?? { status: 500, body: { error: 'x' } };
    return new Response(JSON.stringify(r.body), { status: r.status });
  }));
  return calls;
}

describe('village client', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

  it('villageDispatch adopts both the village and the actor’s workshop', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(T0);
    const v = mockVillage(2, []);
    const s = { ...newGame('p1', 1, T0), version: 7 };
    mockFetch([{ status: 200, body: { village: v, state: s, events: ['Geschenkt!'], serverNow: T0 } }]);
    const vs = await import('../../src/client/villageStore');
    const store = await import('../../src/client/store');
    await vs.villageDispatch({ type: 'gift', to: 'p2', give: { kind: 'material', material: 'ton', count: 1 } });
    expect(vs.village.value).toEqual(v);
    expect(store.serverState.value!.version).toBe(7);
  });

  it('unreadNews counts only news for me or everyone that is newer than last seen', async () => {
    const vs = await import('../../src/client/villageStore');
    const store = await import('../../src/client/store');
    store.me.value = { playerId: 'p1', name: 'Anna', villageName: 'T', inviteCode: 'X' };
    const v = mockVillage(2, []);
    v.news = [
      { id: 'n1', at: T0 - 10, text: 'alt', for: null },
      { id: 'n2', at: T0 + 10, text: 'für mich', for: 'p1' },
      { id: 'n3', at: T0 + 20, text: 'für Ben', for: 'p2' },
      { id: 'n4', at: T0 + 30, text: 'für alle', for: null },
    ];
    vs.village.value = v;
    vs.newsSeenAt.value = T0;
    expect(vs.unreadNews.value).toBe(2);
  });

  it('a visit renders the friend’s workshop read-only', async () => {
    const { VisitView } = await import('../../src/client/panels/village/VisitView');
    const v = mockVillage(2, []);
    const html = render(<VisitView village={v} meId="p1" member={v.members[1]} state={newGame('p2', 2, T0)} now={T0} onHelp={() => {}} />);
    expect(html).toContain('data-readonly');
    expect(html).toContain('Mit anpacken');
    expect(html).not.toMatch(/NaN|undefined/);
  });
});
