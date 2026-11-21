import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { mockEndgame } from '../../src/client/dev/mockEndgame';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { MasterworkDone, MasterworkPanel } from '../../src/client/panels/MasterworkPanel';
import { LockedNote, panelUnlock } from '../../src/client/panels/PanelHost';
import { WorkshopPanel } from '../../src/client/panels/StationPanel';
import { VisitView } from '../../src/client/panels/village/VisitView';
import { T } from '../../src/client/strings';
import { COMMISSION_SWAP_COST, describeCriterion, predictMasterwork, PRESTIGE_NAME } from '../../src/shared/masterwork';
import { newGame } from '../../src/shared/state';

const T0 = 1_800_000_000_000;

describe('masterwork panel', () => {
  it('shows criteria, per-design fit and blocks a second start', () => {
    const s = mockEndgame(T0); s.batches = s.batches.filter((b) => !b.masterwork);
    const html = render(<MasterworkPanel s={s} />);
    for (const c of s.commission!.criteria) expect(html).toContain(describeCriterion(c));
    expect(html).toContain('Meisterstück beginnen');
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Meisterstück beginnen/);
    const busy = mockEndgame(T0);
    expect(render(<MasterworkPanel s={busy} />)).toMatch(/<button[^>]*disabled[^>]*>[^<]*Meisterstück beginnen/);
  });

  it('the commission card names the patron, the price and the reward', () => {
    const s = mockEndgame(T0); s.batches = s.batches.filter((b) => !b.masterwork);
    const c = s.commission!;
    const html = render(<MasterworkPanel s={s} />);
    expect(html).toContain(c.patronName);
    expect(html).toContain(c.patronJob);
    expect(html).toContain('data-character');
    expect(html).toContain(`${c.costTaler.toLocaleString('de-DE')} Taler`);
    expect(html).toContain(`${c.rewardTaler.toLocaleString('de-DE')} Taler`);
    expect(html).toContain(`${c.rewardRuf} Ruf`);
    expect(html).toContain(`Anderen Auftrag (${COMMISSION_SWAP_COST} Taler)`);
  });

  it('each own design shows a tick or cross per criterion and its predicted prestige', () => {
    const s = mockEndgame(T0); s.batches = s.batches.filter((b) => !b.masterwork);
    const html = render(<MasterworkPanel s={s} />);
    const own = s.designs.filter((d) => !d.origin);
    const total = s.commission!.criteria.length;
    const marks = (html.match(/data-fit="(yes|no)"/g) ?? []).length;
    // one mark per criterion in the commission list, plus one per criterion per design
    expect(marks).toBe(total + own.length * total);
    for (const d of own) {
      const p = predictMasterwork(s, d);
      expect(html).toContain(`data-design="${d.id}" data-prestige="${p.prestige}"`);
    }
    expect(html).toContain(PRESTIGE_NAME.bronze);
  });

  it('while a masterwork is underway the panel shows its stage and the time left', () => {
    const busy = mockEndgame(T0);
    const html = render(<MasterworkPanel s={busy} />);
    expect(html).toContain('Glasieren');
    expect(html).toMatch(/noch \d+ h/);
    expect(html).toContain('progressbar');
  });

  it('finished records show pot, medal and patron', () => {
    const s = mockEndgame(T0);
    const html = render(<MasterworkPanel s={s} />);
    for (const m of s.masterworks) expect(html).toContain(`data-medal="${m.prestige}"`);
    expect(html).toContain('Gräfin Adelheid');
    expect(html).toContain('Ölfleckkanne');
  });

  it('finish card names the prestige', () => {
    const s = mockEndgame(T0);
    const gold = s.masterworks.find((m) => m.prestige === 'gold')!;
    const html = render(<MasterworkDone record={gold} onClose={() => {}} />);
    expect(html).toContain('Gold');
    expect(html).toContain(gold.design.name);
    expect(html).toContain('data-medal="gold"');
    expect(render(<MasterworkDone record={s.masterworks.find((m) => m.prestige === 'silver')!} onClose={() => {}} />)).toContain('Silber');
  });

  it('the panel is locked until the Manufaktur and has its own tab name', () => {
    expect(panelUnlock('masterwork')).toBe('meisterstuecke');
    expect(T.tabs.masterwork).toBe('Meisterstück');
    expect(render(<LockedNote unlock="meisterstuecke" />)).toContain('Ab der Manufaktur kommen Gönner zu dir.');
  });

  it('the workshop panel has a Meisterstück card', () => {
    const html = render(<WorkshopPanel s={mockEndgame(T0)} onOpen={() => {}} />);
    expect(html).toContain('data-open="masterwork"');
    expect(html).toContain('Meisterstück');
  });

  it('a visit lists the friend’s masterworks, and nothing when there are none', () => {
    const v = mockVillage(2, []);
    const s = mockEndgame(T0);
    const html = render(<VisitView village={v} meId="p1" member={v.members[1]} state={s} now={T0} onHelp={() => {}} />);
    expect(html).toContain(`Meisterstücke von ${v.members[1].name}`);
    expect(html).toContain('data-medal="gold"');
    const none = render(<VisitView village={v} meId="p1" member={v.members[1]} state={newGame('p2', 2, T0)} now={T0} onHelp={() => {}} />);
    expect(none).not.toContain('Meisterstücke von');
  });
});
