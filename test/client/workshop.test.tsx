import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { Room } from '../../src/client/art/workshop/Room';
import { StationPanel } from '../../src/client/panels/StationPanel';
import { DECOR } from '../../src/shared/village/decor';
import { hofGame, manufakturGame, plainGame } from '../shared/helpers';

describe('station panel', () => {
  it('level 5 in a Werkstatt says the Manufaktur is needed', () => {
    const s = plainGame(); s.unlocks.push('upgrades');
    const st = s.stations.find((x) => x.kind === 'wheel')!; st.level = 5;
    expect(render(<StationPanel s={s} stationId={st.id} onOpen={() => {}} />)).toContain('ab der Manufaktur');
  });
  it('Manufaktur wheel at level 5 offers level 6 with a bay', () => {
    const s = manufakturGame();
    const st = s.stations.find((x) => x.kind === 'wheel')!;
    const html = render(<StationPanel s={s} stationId={st.id} onOpen={() => {}} />);
    expect(html).toContain('Ausbau auf Stufe 6'); expect(html).toContain('Extra-Charge');
    st.level = 6;
    expect(render(<StationPanel s={s} stationId={st.id} onOpen={() => {}} />)).toContain('Arbeitsplätze: 2');
    st.level = 7;
    expect(render(<StationPanel s={s} stationId={st.id} onOpen={() => {}} />)).toContain('Hofmanufaktur');
    const h = hofGame();
    const hw = h.stations.find((x) => x.kind === 'wheel')!;
    hw.level = 8;
    const top = render(<StationPanel s={h} stationId={hw.id} onOpen={() => {}} />);
    expect(top).toContain('ganz ausgebaut');
    expect(top).toContain('Arbeitsplätze: 3');
  });
});

/** decor whose art has not landed yet; each art task removes its own ids */
const ART_PENDING = new Set(['socke', 'drachenpluesch', 'storchenmobile', 'ohrensessel', 'goldfischglas', 'drachenteppich']);

describe('workshop decor', () => {
  it('every DECOR id draws in the room', () => {
    for (const id of Object.keys(DECOR)) {
      if (ART_PENDING.has(id)) continue;
      const html = render(<svg><Room pins={[]} room2={false} tier="werkstatt" decor={[id]} /></svg>);
      expect(html, id).toMatch(new RegExp(`data-decor="${id}"`));
      expect(html, id).not.toMatch(/NaN|undefined/);
    }
  });
});
