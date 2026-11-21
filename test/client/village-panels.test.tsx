import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Room } from '../../src/client/art/workshop/Room';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { JointOrderCard, storePurchase } from '../../src/client/panels/village/JointOrdersPanel';
import { OfferCard } from '../../src/client/panels/village/TradePanel';
import { fmtTaler } from '../../src/shared/format';
import { newGame } from '../../src/shared/state';
import { maxContribution } from '../../src/shared/village/joint';
import { villageStorePrice } from '../../src/shared/village/specialties';

const T0 = 1_800_000_000_000;

describe('village panels', () => {
  it('Annehmen is disabled when you cannot pay what the offer wants', () => {
    const v = mockVillage(2, []);
    const s = newGame('p1', 1, T0);
    s.materials.holz = 0;
    const offer = v.offers[0]; // wants 30 holz
    const html = render(<OfferCard v={v} s={s} meId="p1" offer={offer} onAccept={() => {}} onCancel={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Annehmen/);
    s.materials.holz = 40;
    const ok = render(<OfferCard v={v} s={s} meId="p1" offer={offer} onAccept={() => {}} onCancel={() => {}} />);
    expect(ok).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Annehmen/);
  });
  it('the village store is offered only for material parts', () => {
    const v = mockVillage(2, []);
    const s = newGame('p1', 1, T0);
    const o = v.jointOrders[0];
    const html = render(<JointOrderCard v={v} s={s} meId="p1" order={o} onContribute={() => {}} />);
    const materialParts = o.parts.filter((p) => p.kind === 'material').length;
    expect((html.match(/Im Dorfladen kaufen/g) ?? []).length).toBe(materialParts);
    expect(html).toContain('Nur gemeinsam');
  });
  it('the village-store button says how many it buys and the total before the tap', () => {
    expect(storePurchase(40, 10_000, 15)).toEqual({ count: 40, cost: 600, affordable: true });
    expect(storePurchase(40, 100, 15)).toEqual({ count: 6, cost: 90, affordable: true });
    expect(storePurchase(40, 10, 15)).toEqual({ count: 1, cost: 15, affordable: false });
    expect(storePurchase(3, 0.29, 0.1)).toEqual({ count: 2, cost: 0.2, affordable: true });
    const v = mockVillage(2, []);
    const s = newGame('p1', 1, T0);
    const o = v.jointOrders[0];
    const i = o.parts.findIndex((p) => p.kind === 'material');
    const p = o.parts[i] as Extract<typeof o.parts[number], { kind: 'material' }>;
    const price = villageStorePrice(p.material);
    s.taler = price * 3 + 1;
    const want = Math.min(3, maxContribution(o, i, 'p1'));
    const html = render(<JointOrderCard v={v} s={s} meId="p1" order={o} onContribute={() => {}} />);
    expect(html).toContain(`Im Dorfladen kaufen: ${want}× · ${fmtTaler(price * want)} Taler`);
    s.taler = 0;
    const poor = render(<JointOrderCard v={v} s={s} meId="p1" order={o} onContribute={() => {}} />);
    expect(poor).toMatch(new RegExp(`<button[^>]*disabled[^>]*>Im Dorfladen kaufen: 1× · ${fmtTaler(price)} Taler`));
  });
  it('a joint body part offers the substitute button', () => {
    const v = mockVillage(2, []);
    const s = newGame('p1', 1, T0); // d12: an earthenware Becher
    s.goods.push({ designId: 'd12', quality: 2, effect: null, count: 10 });
    const order = { ...v.jointOrders[0], parts: [{ kind: 'goods' as const, form: 'becher', count: 20, minQuality: 1 as const, body: 'steinzeug' as const, effect: 'ascheanflug', filled: 2 }], contributions: { p2: 10 } };
    const html = render(<JointOrderCard v={v} s={s} meId="p1" order={order} onContribute={() => {}} />);
    expect(html).toContain('20 Becher aus Steinzeug mit Ascheanflug');
    expect(html).toContain('Ersatz: 9× Becher aus Irdenware');
    expect(html).not.toMatch(/>\d+× Erster Becher</); // earthenware is no stoneware
  });
  it('placed decor is drawn in the room', () => {
    const html = render(<svg><Room pins={[]} room2={false} tier="werkstatt" decor={['laterne', 'blumenkasten']} /></svg>);
    expect(html).toContain('data-decor="laterne"');
    expect(html).toContain('data-decor="blumenkasten"');
  });
});

describe('[Final review #5] gifted designs stay out of production pickers', () => {
  it('bestDesignForOrder never suggests a gifted design', async () => {
    const { bestDesignForOrder } = await import('../../src/client/panels/logic');
    const s = newGame('p1', 1, T0);
    const foreign = { ...s.designs[0], id: 'f:x', name: 'Geschenkt', origin: { playerName: 'Ben', makerMark: s.makerMark, glazeColor: '#3f6fb5' } };
    s.designs = [foreign];
    expect(bestDesignForOrder(s, { ...s.orders[0], form: foreign.form })).toBeNull();
  });
  it('the wheel’s design picker lists only own designs', async () => {
    const { StationPanel } = await import('../../src/client/panels/StationPanel');
    const s = newGame('p1', 1, T0);
    s.designs.push({ ...s.designs[0], id: 'f:x', name: 'GeschenktVonBen', origin: { playerName: 'Ben', makerMark: s.makerMark, glazeColor: '#3f6fb5' } });
    const wheel = s.stations.find((x) => x.kind === 'wheel')!;
    const html = render(<StationPanel s={s} stationId={wheel.id} onOpen={() => {}} />);
    expect(html).not.toContain('GeschenktVonBen');
  });
});
