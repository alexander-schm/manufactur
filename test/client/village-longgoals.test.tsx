import { options, type VNode } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { GreatKilnArt } from '../../src/client/art/village/GreatKiln';
import { LevelDecorations } from '../../src/client/art/village/Decorations';
import { ProjectSite } from '../../src/client/art/village/ProjectSites';
import { VillageMap } from '../../src/client/art/village/VillageMap';
import { mockVillage } from '../../src/client/dev/mockVillage';
import { LEVEL_DECORATIONS } from '../../src/shared/village/level';
import { PROJECTS } from '../../src/shared/village/projects';

const T0 = 1_800_000_000_000;
const noop = () => {};

describe('village long goals on the map', () => {
  it('the kiln shows its phase; project sites show plot, stage and level; the sign shows the village level', () => {
    const v = mockVillage(4, ['tongrube', 'gemeinschaftsofen'], T0, { kiln: 'firing', project: { id: 'rathaus', level: 1, stage: 2 }, levels: { museum: 2 }, level: 12 });
    const html = render(<VillageMap village={v} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(html).toContain('data-kiln="firing"');
    expect(html).toMatch(/data-project-site="rathaus" data-stage="2" data-level="1"/);
    expect(html).toMatch(/data-project-site="museum"[^>]*data-level="2"/);
    expect((html.match(/data-project-site=/g) ?? []).length).toBe(5);
    expect((html.match(/data-decoration=/g) ?? []).length).toBe(2);
    expect(html).toContain('Stufe 12');
    expect(html).toContain('Rathaus I · 2/5');
    expect(html).not.toMatch(/NaN|undefined/);
  });

  it('no kiln before the Gemeinschaftsofen is built; a loading kiln is open; an idle one is closed', () => {
    const none = render(<VillageMap village={mockVillage(3, ['tongrube'], T0)} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(none).not.toContain('data-kiln=');
    const loading = render(<VillageMap village={mockVillage(3, ['gemeinschaftsofen'], T0, { kiln: 'loading' })} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(loading).toContain('data-kiln="loading"');
    const idle = render(<VillageMap village={mockVillage(3, ['gemeinschaftsofen'], T0)} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect(idle).toContain('data-kiln="idle"');
    for (const phase of ['idle', 'loading', 'firing'] as const) {
      const html = render(<svg><GreatKilnArt x={500} y={500} phase={phase} fill={0.5} /></svg>);
      expect(html).toContain(`data-kiln="${phase}"`);
      expect(html.includes('class="smoke"')).toBe(phase === 'firing');
      expect(html).not.toMatch(/NaN|undefined/);
    }
  });

  it('a plot reads Bauplatz, an offered plot names the project', () => {
    const plot = render(<svg><ProjectSite id="museum" x={200} y={1110} level={0} building={null} offered={false} onClick={noop} /></svg>);
    expect(plot).toContain('Bauplatz');
    expect(plot).toMatch(/data-project-site="museum" data-stage="0" data-level="0"/);
    const offered = render(<svg><ProjectSite id="museum" x={200} y={1110} level={0} building={null} offered onClick={noop} /></svg>);
    expect(offered).toContain('Zur Wahl: Museum');
    const v = mockVillage(2, [], T0, { offered: ['glockenturm', 'museum'] });
    const html = render(<VillageMap village={v} meId="p1" now={T0} onHouse={noop} onBuilding={noop} />);
    expect((html.match(/>Zur Wahl: /g) ?? []).length).toBe(2);
  });

  it('every project draws all three levels and every stage without NaN', () => {
    for (const [id, def] of Object.entries(PROJECTS)) {
      const n = def.stages.length;
      const looks = new Set<string>();
      for (const level of [1, 2, 3] as const) {
        const built = render(<svg><ProjectSite id={id} x={600} y={1000} level={level} building={null} offered={false} onClick={noop} /></svg>);
        expect(built).toContain(`data-level="${level}"`);
        expect(built).not.toMatch(/NaN|undefined/);
        looks.add(built);
        for (let stage = 0; stage < n; stage++) {
          const html = render(<svg><ProjectSite id={id} x={600} y={1000} level={level - 1} building={{ level, stage, stages: n }} offered={false} onClick={noop} /></svg>);
          expect(html).toContain(`data-stage="${stage}" data-level="${level}"`);
          expect(html).toContain(`${def.name} ${['I', 'II', 'III'][level - 1]} · ${stage}/${n}`);
          expect(html).not.toMatch(/NaN|undefined/);
        }
      }
      expect(looks.size).toBe(3);
    }
  });

  it('level decorations unlock every 5 levels', () => {
    expect(render(<svg><LevelDecorations level={4} /></svg>)).not.toContain('data-decoration=');
    const all = render(<svg><LevelDecorations level={30} /></svg>);
    for (const d of LEVEL_DECORATIONS) expect(all).toContain(`data-decoration="${d.id}"`);
    expect(all).not.toMatch(/NaN|undefined/);
  });

  it('a clock tick (new now, same village) re-renders no project site, kiln or decoration; a new stage does', () => {
    // capture the props VillageMap hands to the memoized components, then ask preact's memo whether it would re-render
    const capture = (el: preact.JSX.Element) => {
      const seen: VNode[] = [];
      const prev = options.vnode;
      options.vnode = (vn) => {
        if (vn.type === ProjectSite || vn.type === GreatKilnArt || vn.type === LevelDecorations) seen.push(vn);
        prev?.(vn);
      };
      try { render(el); } finally { options.vnode = prev; }
      return seen;
    };
    const wouldUpdate = (a: VNode, b: VNode): boolean => {
      const ctx = { props: a.props } as { props: unknown; shouldComponentUpdate?: (p: unknown) => boolean };
      (a.type as unknown as (this: typeof ctx, p: unknown) => void).call(ctx, a.props);
      return ctx.shouldComponentUpdate!(b.props);
    };
    const opts = { kiln: 'firing' as const, project: { id: 'rathaus', level: 1 as const, stage: 2 }, levels: { museum: 2 }, level: 30 };
    const v = mockVillage(4, ['gemeinschaftsofen'], T0, opts);
    const map = (village: typeof v, now: number) => <VillageMap village={village} meId="p1" now={now} onHouse={noop} onBuilding={() => {}} />;
    const a = capture(map(v, T0));
    const b = capture(map(structuredClone(v), T0 + 250));
    expect(a.length).toBe(7); // 5 sites, the kiln, the decorations
    a.forEach((vn, i) => expect(wouldUpdate(vn, b[i])).toBe(false));

    const next = mockVillage(4, ['gemeinschaftsofen'], T0, { ...opts, project: { id: 'rathaus', level: 1, stage: 3 } });
    const c = capture(map(next, T0 + 500));
    const changed = a.filter((vn, i) => wouldUpdate(vn, c[i])).map((vn) => (vn.props as { id?: string }).id);
    expect(changed).toEqual(['rathaus']);
  });
});
