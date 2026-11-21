import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { fillUpAmount, KEEP_STOCK_STEPS, ShopPanel } from '../../src/client/panels/ShopPanel';
import { TierSection } from '../../src/client/panels/TierSection';
import { plainGame } from '../shared/helpers';

describe('shop and tier UI', () => {
  it('shop: big buttons, fill-up and keep-in-stock', () => {
    const s = plainGame(); s.taler = 5000;
    const html = render(<ShopPanel s={s} />);
    expect(html).toContain('+1000'); expect(html).toContain('auf 1000 auffüllen'); expect(html).toContain('Vorrat halten');
    expect(fillUpAmount(30.5)).toBe(970); expect(fillUpAmount(1200)).toBe(0);
    expect(KEEP_STOCK_STEPS).toEqual([0, 100, 500, 1000, 5000]);
  });
  it('tier section: gated by Ruf, then enabled', () => {
    const s = plainGame(); s.taler = 60000; s.ruf = 100;
    expect(render(<TierSection s={s} />)).toMatch(/<button[^>]*disabled[^>]*>[^<]*Zur Manufaktur aufsteigen/);
    expect(render(<TierSection s={s} />)).toContain('ab 300 Ruf');
    s.ruf = 300;
    expect(render(<TierSection s={s} />)).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Zur Manufaktur/);
  });
});
