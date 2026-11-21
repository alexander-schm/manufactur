import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { WorkshopScene, SHELF_VISIBLE_MAX } from '../../src/client/art/workshop/WorkshopScene';
import { advance } from '../../src/shared/advance';
import { newGame } from '../../src/shared/state';
import { mockEndgame } from '../../src/client/dev/mockEndgame';
import { Celebration } from '../../src/client/panels/Celebration';
import { Plinths } from '../../src/client/art/workshop/Plinth';
import type { VNode } from 'preact';

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
  it('endgame scene: sign, two pots on the wheel, plinths, masterwork marker, decor', () => {
    const s = mockEndgame(T0);
    const html = render(<WorkshopScene state={advance(s, T0)} now={T0} onStation={() => {}} onWorker={() => {}} />);
    expect(html).toContain('data-tier-sign="manufaktur"');
    const wheel = html.split('data-station="wheel"')[1].split('data-station=')[0];
    expect((wheel.match(/class="progress"/g) ?? []).length).toBe(2);
    expect((html.match(/data-plinth/g) ?? []).length).toBe(3);
    expect(html).toContain('data-masterwork');
    expect(html).toContain('data-kiln-level="7"');
    expect(html).toContain('data-body="steinzeug"');
    for (const d of ['steinzeugtopf', 'glasurproben', 'papierlampions', 'meisterbrief']) expect(html).toContain(`data-decor="${d}"`);
    expect(html).not.toMatch(/NaN|undefined/);
  });
  it('Hofmanufaktur scene', () => {
    const s = mockEndgame(T0, 'hofmanufaktur');
    expect(s.milestonesAcked).toEqual(s.milestonesDone);
    expect(s.designs.some((d) => d.form === 'figur' && d.body === 'porzellan' && d.variant)).toBe(true);
    expect(s.designs.some((d) => d.form === 'fliese' && d.body === 'porzellan')).toBe(true);
    const html = render(<WorkshopScene state={advance(s, T0)} now={T0} onStation={() => {}} onWorker={() => {}} />);
    expect(html).toContain('data-tier-sign="hofmanufaktur"');
    expect(html).toContain('data-kiln-level="8"');
    expect(html).toContain('data-kiln-crest');
    expect(html).toContain('data-sign-crown');
    expect(html).toContain('data-body="porzellan"');
    expect(html).toContain('data-glow');
    for (const d of ['porzellanvoegel', 'kronleuchter']) expect(html).toContain(`data-decor="${d}"`);
    const wheel = html.split('data-station="wheel"')[1].split('data-station=')[0];
    expect((wheel.match(/class="progress"/g) ?? []).length).toBe(3);
    expect(html).not.toMatch(/NaN|undefined/);
    // the Manufaktur keeps its plain sign and kiln
    const manu = render(<WorkshopScene state={advance(mockEndgame(T0), T0)} now={T0} onStation={() => {}} onWorker={() => {}} />);
    expect(manu).not.toContain('data-kiln-crest');
    expect(manu).not.toContain('data-sign-crown');
  });
  it('a Werkstatt shows the Werkstatt sign and no plinths', () => {
    const html = render(<WorkshopScene state={newGame('p', 4, T0)} now={T0} onStation={() => {}} onWorker={() => {}} />);
    expect(html).toContain('data-tier-sign="werkstatt"');
    expect(html).not.toContain('data-plinth');
    expect(html).toContain('data-kiln-level="1"');
  });
  it('plinths show the newest three masterworks with short plaques', () => {
    const s = mockEndgame(T0);
    s.masterworks.push({ ...s.masterworks[0], id: 'mw-new', design: { ...s.masterworks[0].design, name: 'Ein sehr langer Name' }, prestige: 'gold' });
    const html = render(<WorkshopScene state={s} now={T0} onStation={() => {}} onWorker={() => {}} />);
    expect((html.match(/data-plinth/g) ?? []).length).toBe(3);
    expect(html).toContain('Ein sehr la…');
    expect(html).not.toContain('Ein sehr langer');
  });
  it('[Final fix #12] clickable plinths are focusable and open on Enter or Space', () => {
    const s = mockEndgame(T0);
    let opened = 0;
    const html = render(<WorkshopScene state={s} now={T0} onStation={() => {}} onWorker={() => {}} onMasterwork={() => { opened++; }} />);
    expect((html.match(/<g[^>]*data-plinth[^>]*tabindex="0"/gi) ?? []).length).toBe(3);
    expect(render(<Plinths records={s.masterworks} />)).not.toMatch(/tabindex/i);
    const group = Plinths({ records: s.masterworks, onClick: () => { opened++; } }) as VNode<{ children: VNode[] }>;
    const first = group.props.children[0];
    const g = (first.type as (p: unknown) => VNode<{ onKeyDown: (e: unknown) => void }>)(first.props);
    const key = (k: string) => g.props.onKeyDown({ key: k, preventDefault() {}, stopPropagation() {} });
    key('Enter'); key(' '); key('a');
    expect(opened).toBe(2);
  });
  it('mockEndgame has every milestone done and acknowledged', () => {
    const s = mockEndgame(T0);
    expect(s.tier).toBe('manufaktur');
    expect(s.milestonesDone).toContain('tierManufaktur');
    expect(s.milestonesAcked).toEqual(s.milestonesDone);
    expect(s.decorPlaced).toEqual(['steinzeugtopf', 'glasurproben', 'papierlampions', 'meisterbrief']);
    expect(s.masterworks.map((m) => m.prestige)).toEqual(['bronze', 'silver', 'gold']);
  });
});

describe('Celebration', () => {
  it('a tier milestone shows the new sign and "Neuer Rang!"', () => {
    const html = render(<Celebration milestoneId="tierManufaktur" onClose={() => {}} />);
    expect(html).toContain('Neuer Rang!');
    expect(html).toContain('data-tier-sign="manufaktur"');
    expect(html).not.toContain('Freigeschaltet!');
  });
  it('a decor milestone lists its decoration', () => {
    const html = render(<Celebration milestoneId="firstMasterwork" onClose={() => {}} />);
    expect(html).toContain('Freigeschaltet!');
    expect(html).toContain('Neue Dekoration: Meisterbrief');
    expect(html).not.toContain('data-tier-sign');
  });
});
