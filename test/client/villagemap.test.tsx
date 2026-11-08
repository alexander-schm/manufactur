import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { VillageMap } from '../../src/client/art/village/VillageMap';
import { mockVillage } from '../../src/client/dev/mockVillage';

describe('VillageMap', () => {
  it('3 members: 3 houses and 3 free plots in the core ring; built buildings are marked', () => {
    const v = mockVillage(3, ['tongrube']);
    const html = render(<VillageMap village={v} meId="p1" now={1_800_000_000_000} onHouse={() => {}} onBuilding={() => {}} />);
    expect((html.match(/data-house=/g) ?? []).length).toBe(3);
    expect((html.match(/data-plot-free/g) ?? []).length).toBe(3);
    expect(html).toContain('data-building="tongrube"');
    expect(html).toContain('data-building-site="markthalle"');
    expect(html).not.toMatch(/NaN|undefined/);
  });
  it('8 members use the outer ring too', () => {
    const html = render(<VillageMap village={mockVillage(8, [])} meId="p1" now={1_800_000_000_000} onHouse={() => {}} onBuilding={() => {}} />);
    expect((html.match(/data-house=/g) ?? []).length).toBe(8);
    expect((html.match(/data-plot-free/g) ?? []).length).toBe(0);
  });
});
