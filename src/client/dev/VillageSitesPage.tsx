import { ROMAN, PROJECTS } from '../../shared/village/projects';
import { LevelDecorations } from '../art/village/Decorations';
import { GreatKilnArt } from '../art/village/GreatKiln';
import { ProjectSite, type SiteBuilding } from '../art/village/ProjectSites';
import '../art/village/village.css';

const noop = () => {};

function Cell({ title, w = 420, h = 360, children }: { title: string; w?: number; h?: number; children: preact.ComponentChildren }) {
  return (
    <figure style={{ margin: 0, background: '#b8d99a', border: '2px solid var(--line)', borderRadius: '10px' }}>
      <svg class="village-art" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%', height: 'auto' }}>{children}</svg>
      <figcaption style={{ fontFamily: 'var(--font-hand)', textAlign: 'center', padding: '2px 0 6px' }}>{title}</figcaption>
    </figure>
  );
}

/** Every grand project at plot, offered, each construction stage of level I, and finished I/II/III; the great kiln; all decorations. */
export function VillageSitesPage() {
  const site = (id: string, level: number, building: SiteBuilding, offered = false) => (
    <ProjectSite id={id} x={210} y={300} level={level} building={building} offered={offered} onClick={noop} />
  );
  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {Object.values(PROJECTS).map((def) => {
        const n = def.stages.length;
        return (
          <section>
            <h2 style={{ fontFamily: 'var(--font-hand)', margin: '0 0 6px' }}>{def.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
              <Cell title="Bauplatz">{site(def.id, 0, null)}</Cell>
              <Cell title="Zur Wahl">{site(def.id, 0, null, true)}</Cell>
              {Array.from({ length: n - 1 }, (_, i) => <Cell title={`I · Stufe ${i + 1}/${n}`}>{site(def.id, 0, { level: 1, stage: i + 1, stages: n })}</Cell>)}
              <Cell title="II im Bau · 2">{site(def.id, 1, { level: 2, stage: 2, stages: n })}</Cell>
              {[1, 2, 3].map((l) => <Cell title={`fertig ${ROMAN[l - 1]}`}>{site(def.id, l, null)}</Cell>)}
            </div>
          </section>
        );
      })}
      <section>
        <h2 style={{ fontFamily: 'var(--font-hand)', margin: '0 0 6px' }}>Gemeinschaftsofen</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
          {(['idle', 'loading', 'firing'] as const).map((phase) => <Cell title={phase} h={300}><GreatKilnArt x={230} y={250} phase={phase} fill={0.7} /></Cell>)}
        </div>
      </section>
      <section>
        <h2 style={{ fontFamily: 'var(--font-hand)', margin: '0 0 6px' }}>Dorfplatz, Stufe 30</h2>
        <div style={{ maxWidth: '640px' }}>
          <Cell title="alle Schmuckstücke" w={560} h={420}>
            <g transform="translate(-420 -280)">
              <ellipse cx="700" cy="470" rx="200" ry="105" fill="#e8cf9f" stroke="var(--line)" stroke-width="2.2" />
              <LevelDecorations level={30} />
            </g>
          </Cell>
        </div>
      </section>
    </div>
  );
}
