import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { autoAssignPlan, bestStackForOrder, deliverActionFor, describeTaste } from '../../src/client/panels/logic';
import { OrderCard } from '../../src/client/panels/OrdersPanel';
import { advance } from '../../src/shared/advance';
import { newGame, rollWorker } from '../../src/shared/state';

const T0 = 1_800_000_000_000;
function game() {
  const s = advance(newGame('p', 9, T0), T0 + 1000);
  s.unlocks.push('orders');
  return s;
}

describe('orders panel', () => {
  it('Liefern is disabled without matching goods', () => {
    const s = game();
    const o = s.orders[0];
    expect(bestStackForOrder(s, o)).toBeNull();
    expect(deliverActionFor(s, o)).toBeNull();
    const html = render(<OrderCard state={s} order={o} onDeliver={() => {}} onProduce={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Liefern/);
  });
  it('with matching goods it delivers the best stack', () => {
    const s = game();
    const o = s.orders[0];
    s.designs[0].form = o.form;
    s.goods = [
      { designId: s.designs[0].id, quality: 1, effect: null, count: o.count + 5 },
      { designId: s.designs[0].id, quality: 3, effect: null, count: o.count },
      { designId: s.designs[0].id, quality: 2, effect: null, count: o.count - 1 },
    ];
    expect(deliverActionFor(s, o)).toEqual({ type: 'deliverOrder', orderId: o.id, designId: s.designs[0].id, quality: 3, effect: null });
    const html = render(<OrderCard state={s} order={o} onDeliver={() => {}} onProduce={() => {}} />);
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Liefern/);
  });
  it('describes tastes in German', () => {
    expect(describeTaste({ form: 'vase', tall: true, colorFamily: 'blau', pattern: 'dots' }, 'vase', 4)).toBe('Ich hätte gern 4 Vasen, schön hoch, in Blau, mit Punkten!');
    expect(describeTaste({ simple: true }, 'becher', 3)).toBe('Ich hätte gern 3 Becher, ganz schlicht!');
  });
});

describe('workers panel', () => {
  it('auto-assign only moves unassigned workers', () => {
    const s = game();
    s.workers.push(rollWorker(s), rollWorker(s));
    const plan = autoAssignPlan(s);
    expect(plan.length).toBe(2);
    for (const a of plan) {
      expect(a.type).toBe('assign');
      expect(s.workers.find((w) => w.id === a.workerId)!.stationId).toBeNull();
      expect(a.stationId).not.toBeNull();
    }
  });
});
