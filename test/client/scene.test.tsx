import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { WorkshopScene, SHELF_VISIBLE_MAX } from '../../src/client/art/workshop/WorkshopScene';
import { advance } from '../../src/shared/advance';
import { newGame } from '../../src/shared/state';

const T0 = 1_800_000_000_000;

function mockState(goodsCount: number) {
  let s = newGame('p', 4, T0);
  s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
  s = advance(s, T0 + 100_000); // something is in progress
  s.goods = [{ designId: s.designs[0].id, quality: 2, effect: null, count: goodsCount }];
  return s;
}

describe('WorkshopScene', () => {
  it('renders all seven station kinds', () => {
    const html = render(<WorkshopScene state={mockState(3)} now={T0 + 100_000} onStation={() => {}} onWorker={() => {}} />);
    for (const k of ['prepBench', 'wheel', 'dryingRack', 'kiln', 'glazeTable', 'shelf', 'marketStall']) expect(html).toContain(`data-station="${k}"`);
    expect(html).toContain('data-character');
    expect(html).not.toMatch(/NaN|undefined/);
  });
  it('the shelf shows one pot per piece up to the visible max', () => {
    const small = render(<WorkshopScene state={mockState(5)} now={T0 + 100_000} onStation={() => {}} onWorker={() => {}} />);
    const shelf = (html: string) => html.split('data-station="shelf"')[1].split('data-station=')[0];
    expect((shelf(small).match(/data-pot/g) ?? []).length).toBe(5);
    const big = render(<WorkshopScene state={mockState(200)} now={T0 + 100_000} onStation={() => {}} onWorker={() => {}} />);
    expect((shelf(big).match(/data-pot/g) ?? []).length).toBe(SHELF_VISIBLE_MAX);
    expect(shelf(big)).toContain(`+${200 - SHELF_VISIBLE_MAX}`);
  });
});
