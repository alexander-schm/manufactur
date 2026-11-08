import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Room } from '../../src/client/art/workshop/Room';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { JointOrderCard } from '../../src/client/panels/village/JointOrdersPanel';
import { OfferCard } from '../../src/client/panels/village/TradePanel';
import { newGame } from '../../src/shared/state';

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
  it('placed decor is drawn in the room', () => {
    const html = render(<svg><Room pins={[]} room2={false} decor={['laterne', 'blumenkasten']} /></svg>);
    expect(html).toContain('data-decor="laterne"');
    expect(html).toContain('data-decor="blumenkasten"');
  });
});
