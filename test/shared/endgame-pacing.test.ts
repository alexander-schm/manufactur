import { describe, expect, it } from 'vitest';
import { getForm } from '../../src/shared/content';
import { matchEffect } from '../../src/shared/discovery';
import { validateDesign } from '../../src/shared/design';
import { newId } from '../../src/shared/ids';
import { MILESTONES } from '../../src/shared/progression';
import type { Design, GameState, GlazeRecipe } from '../../src/shared/types';
import { endgameBot } from './endgameBot';
import { plainGame } from './helpers';

/** Every unlock the milestones up to 72 Ruf hand out. */
const MIDGAME_UNLOCKS = ['orders', 'studio', 'schale', 'hiring', 'recipes', 'upgrades', 'teller', 'farbkoerper', 'vase', 'formdetails', 'krug', 'patterns2', 'kobalt', 'reduktion', 'room2', 'zeichen'];

const SELADON: GlazeRecipe = {
  id: 'g-seladon', name: 'Seladon', base: 'transparent', colorant: 'eisenoxid', colorantPct: 2,
  firing: { temp: 'hoch', atmosphere: 'reduzierend', cooling: 'langsam' }, color: '#9cc3a4', effect: 'seladon', body: 'irdenware',
};

/** A mid-game workshop: all unlocks up to ruf72, every station at level 5, 220 Ruf, 5000 Taler, 4 workers, vase/krug/schale designs incl. an effect glaze. */
function midGame(): GameState {
  const s = plainGame(7);
  for (const u of MIDGAME_UNLOCKS) if (!s.unlocks.includes(u)) s.unlocks.push(u);
  for (const st of s.stations) st.level = 5;
  s.ruf = 220;
  s.taler = 5000;
  s.glazes.push(structuredClone(SELADON));
  s.stats = { made: 2000, sold: 1800, ordersDone: 120, experiments: 12, designsSaved: 6, effectsFound: 3 };
  const at = (kind: string) => s.stations.find((x) => x.kind === kind)!.id;
  for (const station of ['prepBench', 'glazeTable', 'wheel']) {
    const w = s.hirePool.shift()!;
    s.workers.push({ ...w, traits: [], stationId: at(station) });
  }
  const design = (form: string, glazeId: string): Design => ({
    id: newId(s, 'd'), name: form, form, body: 'irdenware', profile: { ...getForm(form).profileDefaults },
    handle: getForm(form).handleAllowed ? 'round' : 'none', rim: 'plain', glazeId, pattern: 'none', patternColor: '#2b2420',
  });
  for (const d of [design('vase', 'g-seladon'), design('krug', 'klar'), design('schale', 'klar'), design('schale', 'g-seladon')]) {
    s.designs.push(d);
    s.stallDesignIds.push(d.id);
  }
  const held = MILESTONES.filter((m) => m.done(s)).map((m) => m.id);
  s.milestonesDone = [...held];
  s.milestonesAcked = [...held];
  return s;
}

describe('endgame pacing', () => {
  it('the mid-game setup is what it claims to be', () => {
    const s = midGame();
    expect(s.workers).toHaveLength(4);
    expect(s.stations.every((st) => st.level === 5)).toBe(true);
    expect(matchEffect(SELADON)).toBe('seladon');
    for (const d of s.designs) expect(validateDesign(d, s), d.name).toBeNull();
    expect(s.milestonesDone).toContain('ruf72');
    expect(s.milestonesDone).not.toContain('ruf250');
  });

  it('a mid-game player (all level 5, ~220 Ruf) reaches the Manufaktur in a few days', { timeout: 120_000 }, () => {
    const r = endgameBot(midGame(), 10);
    expect(r.tierDay.manufaktur).toBeGreaterThanOrEqual(1);
    expect(r.tierDay.manufaktur).toBeLessThanOrEqual(6);
    expect(r.state.tier).toBe('manufaktur');
  });
});
