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
  it('has eight steps, all in German', () => {
    expect(ONBOARDING).toHaveLength(8);
    for (const st of ONBOARDING) expect(st.text.length).toBeGreaterThan(15);
  });
  it('is finished once everything has been tried', () => {
    const s = newGame('p', 1, T0);
    Object.assign(s.stats, { made: 6, sold: 1, ordersDone: 1, designsSaved: 1, experiments: 1 });
    s.materials.ton = 40;
    expect(onboardingStep(s)).toBe(ONBOARDING.length);
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
