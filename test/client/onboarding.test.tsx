import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { AwaySummary } from '../../src/client/panels/AwaySummary';
import { onboardingStep, ONBOARDING } from '../../src/client/panels/Onboarding';
import { applyAction } from '../../src/shared/actions';
import { newGame } from '../../src/shared/state';

const T0 = 1_800_000_000_000;

describe('onboarding', () => {
  it('moves from step 1 to step 2 after buying clay', () => {
    const s = newGame('p', 1, T0);
    expect(onboardingStep(s)).toBe(0);
    const r = applyAction(s, { type: 'buyMaterial', material: 'ton', amount: 10 }, T0 + 1);
    expect(r.ok && onboardingStep(r.state)).toBe(1);
  });
  it('has ten steps, all in German', () => {
    expect(ONBOARDING).toHaveLength(10);
    for (const st of ONBOARDING) expect(st.text.length).toBeGreaterThan(15);
  });
  it('is finished once everything has been tried', () => {
    const s = newGame('p', 1, T0);
    Object.assign(s.stats, { made: 6, sold: 1, ordersDone: 1, designsSaved: 1, experiments: 1 });
    s.materials.ton = 40;
    expect(onboardingStep(s, { villageOpened: true, gaveOrHelped: true })).toBe(ONBOARDING.length);
  });
});

describe('away summary', () => {
  it('renders what happened while away and the boost line', () => {
    const html = render(<AwaySummary away={{ since: T0, made: 42, sold: 30, talerEarned: 123.5, discoveries: [] }} boosted onClose={() => {}} />);
    expect(html).toContain('Während du weg warst');
    expect(html).toContain('42');
    expect(html).toContain('30');
    expect(html).toContain('123');
    expect(html).toContain('doppeltes Tempo');
  });
});

describe('[Plan 2] village onboarding and news', () => {
  const doneSolo = () => {
    const s = newGame('p', 1, T0);
    Object.assign(s.stats, { made: 6, sold: 1, ordersDone: 1, designsSaved: 1, experiments: 1 });
    s.materials.ton = 40;
    return s;
  };
  it('after the solo steps, opening the village completes step 9 and giving/helping completes step 10', () => {
    const s = doneSolo();
    s.village = { villageId: 'v', specialty: 'ton', buildings: [], helpBoostUntil: 0, trickleCarry: 0, members: 2 };
    expect(ONBOARDING.length).toBe(10);
    expect(onboardingStep(s, { villageOpened: false, gaveOrHelped: false })).toBe(8);
    expect(onboardingStep(s, { villageOpened: true, gaveOrHelped: false })).toBe(9);
    expect(onboardingStep(s, { villageOpened: true, gaveOrHelped: true })).toBe(10);
  });
  it('the away summary lists village news for me', () => {
    const html = render(<AwaySummary away={{ since: T0, made: 1, sold: 1, talerEarned: 1, discoveries: [] }} boosted={false} onClose={() => {}}
      news={[{ id: 'n1', at: T0 + 5, text: 'Ben hat dir 10 Brennholz geschenkt 🎁', for: 'p1' }]} />);
    expect(html).toContain('Ben hat dir 10 Brennholz geschenkt');
  });
});
