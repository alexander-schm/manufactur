import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { autoAssignPlan, bestDesignForOrder, bestStackForOrder, deliverActionFor, describeTaste } from '../../src/client/panels/logic';
import { OrderCard } from '../../src/client/panels/OrdersPanel';
import { advance } from '../../src/shared/advance';
import { manufakturGame } from '../shared/helpers';
import { newGame, rollWorker } from '../../src/shared/state';
import { T } from '../../src/client/strings';
import { getTier } from '../../src/shared/content';

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
  it('orders: body in the wish, and only stoneware is offered for delivery', () => {
    expect(describeTaste({}, 'teekanne', 4, 'steinzeug')).toBe('Ich hätte gern 4 Teekannen aus Steinzeug!');
    const s = manufakturGame();
    const o = { ...game().orders[0], form: 'becher', count: 2, body: 'steinzeug' as const, minQuality: 1 as const };
    s.designs[0].form = 'becher';
    s.goods = [{ designId: s.designs[0].id, quality: 3, effect: null, count: 5 }];
    expect(bestStackForOrder(s, o)).toBeNull();
    const html = render(<OrderCard state={s} order={o} onDeliver={() => {}} onProduce={() => {}} />);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Liefern/);
    expect(html).toContain('Steinzeug');
    s.designs[0].body = 'steinzeug';
    expect(bestStackForOrder(s, o)).not.toBeNull();
  });
  it('[Final fix #1] an order without a body is only offered earthenware', () => {
    const s = manufakturGame();
    const { body: _b, ...o } = { ...game().orders[0], form: 'becher', count: 2, minQuality: 1 as const };
    s.designs[0].form = 'becher';
    s.designs[0].body = 'steinzeug';
    s.goods = [{ designId: s.designs[0].id, quality: 3, effect: null, count: 5 }];
    expect(bestStackForOrder(s, o)).toBeNull();
    expect(bestDesignForOrder(s, o)).toBeNull();
    s.designs[0].body = 'irdenware';
    expect(bestStackForOrder(s, o)).toEqual(s.goods[0]);
    expect(bestDesignForOrder(s, o)?.id).toBe(s.designs[0].id);
  });
  it('[Final fix #3] the header names the current tier', () => {
    expect(T.workshopOf(getTier('werkstatt').name, 'Alex')).toBe('Werkstatt von Alex');
    expect(T.workshopOf(getTier('manufaktur').name, 'Alex')).toBe('Manufaktur von Alex');
    expect(T.workshopOf(getTier('hofmanufaktur').name, 'Alex')).toBe('Hofmanufaktur von Alex');
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
