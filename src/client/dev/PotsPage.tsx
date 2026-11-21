import { glazeColor } from '../../shared/discovery';
import { BODIES, FORMS, FRAMES, GREAT_KILN_EFFECTS } from '../../shared/content';
import type { BodyId, Design, FiringSettings, GlazeRecipe, PatternKind } from '../../shared/types';
import { Pot } from '../art/Pot';

const F = (temp: FiringSettings['temp'], atmosphere: FiringSettings['atmosphere'], cooling: FiringSettings['cooling']): FiringSettings => ({ temp, atmosphere, cooling });
const GLAZES: Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'>[] = [
  { base: 'transparent', colorant: null, colorantPct: 0, firing: F('mittel', 'oxidierend', 'langsam') },
  { base: 'opak', colorant: 'kobalt', colorantPct: 3, firing: F('mittel', 'oxidierend', 'langsam') },
  { base: 'opak', colorant: 'kupferoxid', colorantPct: 4, firing: F('mittel', 'oxidierend', 'langsam') },
  { base: 'matt', colorant: 'eisenoxid', colorantPct: 5, firing: F('mittel', 'oxidierend', 'langsam') },
  { base: 'opak', colorant: null, colorantPct: 0, firing: F('mittel', 'oxidierend', 'langsam') },
];
const PATTERNS: PatternKind[] = ['none', 'stripes', 'dots', 'waves', 'leaves'];
const EFFECT_GLAZES: [string, Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'>][] = [
  ['craquele', { base: 'transparent', colorant: null, colorantPct: 0, firing: F('mittel', 'oxidierend', 'schnell') }],
  ['seladon', { base: 'transparent', colorant: 'eisenoxid', colorantPct: 2, firing: F('hoch', 'reduzierend', 'langsam') }],
  ['tenmoku', { base: 'transparent', colorant: 'eisenoxid', colorantPct: 9, firing: F('hoch', 'oxidierend', 'langsam') }],
  ['kupferrot', { base: 'opak', colorant: 'kupferoxid', colorantPct: 2, firing: F('mittel', 'reduzierend', 'langsam') }],
  ['kristall', { base: 'matt', colorant: 'kobalt', colorantPct: 2, firing: F('hoch', 'oxidierend', 'langsam') }],
];

/** The stoneware and porcelain effects, each with a recipe that finds it. */
const BODY_EFFECT_GLAZES: [string, BodyId, Pick<GlazeRecipe, 'base' | 'colorant' | 'colorantPct' | 'firing'>][] = [
  ['oelfleck', 'steinzeug', { base: 'opak', colorant: 'eisenoxid', colorantPct: 8, firing: F('hoch', 'oxidierend', 'langsam') }],
  ['hasenfell', 'steinzeug', { base: 'transparent', colorant: 'eisenoxid', colorantPct: 5, firing: F('hoch', 'reduzierend', 'langsam') }],
  ['shino', 'steinzeug', { base: 'matt', colorant: null, colorantPct: 0, firing: F('hoch', 'oxidierend', 'langsam') }],
  ['salzglasur', 'steinzeug', { base: 'transparent', colorant: 'salz', colorantPct: 3, firing: F('hoch', 'oxidierend', 'schnell') }],
  ['blancdechine', 'porzellan', { base: 'opak', colorant: null, colorantPct: 0, firing: F('hoch', 'oxidierend', 'langsam') }],
  ['blauweiss', 'porzellan', { base: 'transparent', colorant: 'kobalt', colorantPct: 1.5, firing: F('hoch', 'oxidierend', 'langsam') }],
  ['ochsenblut', 'porzellan', { base: 'opak', colorant: 'kupferoxid', colorantPct: 4, firing: F('hoch', 'reduzierend', 'langsam') }],
  ['eierschale', 'porzellan', { base: 'matt', colorant: null, colorantPct: 0, firing: F('hoch', 'oxidierend', 'schnell') }],
];

const EXTREMES = [
  { height: 0, belly: 0, neck: 0, foot: 0, rim: 0 },
  { height: 1, belly: 1, neck: 1, foot: 1, rim: 1 },
  { height: 1, belly: 0, neck: 1, foot: 0, rim: 1 },
  { height: 0, belly: 1, neck: 0, foot: 1, rim: 0 },
  { height: 0.5, belly: 1, neck: 1, foot: 0, rim: 1 },
];

function design(form: string, i: number, pattern: PatternKind = 'none', body: BodyId = 'irdenware'): Design {
  const d = FORMS[form].profileDefaults;
  const v = [-0.3, 0, 0.3][i % 3];
  const c = (x: number) => Math.max(0, Math.min(1, x));
  return {
    id: `${form}${i}`, name: '', form, pattern, patternColor: '#fff8ec',
    profile: { height: c(d.height + v), belly: c(d.belly - v * 0.6), neck: c(d.neck + v * 0.5), foot: c(d.foot), rim: c(d.rim + v * 0.4) },
    handle: FORMS[form].handleAllowed ? (['round', 'ear', 'loop'] as const)[i % 3] : 'none', rim: (['plain', 'rolled', 'flared'] as const)[i % 3], glazeId: '', body,
    ...(FORMS[form].variants ? { variant: FORMS[form].variants![i % FORMS[form].variants!.length].id } : {}),
  };
}

export function PotsPage() {
  return (
    <div style={{ padding: '20px', display: 'grid', gap: '14px' }}>
      <h1>Töpferware</h1>
      {Object.keys(FORMS).map((form) => (
        <section>
          <h3>{FORMS[form].plural}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[0, 1, 2].flatMap((i) => GLAZES.map((g, k) => <Pot design={design(form, i, PATTERNS[(i + k) % PATTERNS.length])} glazeColor={glazeColor(g)} size={76} mark={k === 0 ? { shape: 'heart', letter: 'A', color: '#b44c36' } : null} quality={k === 4 ? 3 : 2} />))}
          </div>
        </section>
      ))}
      <section>
        <h3>Vorschau (fit)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.keys(FORMS).map((f, i) => <Pot design={design(f, 1, PATTERNS[i % 5])} glazeColor={glazeColor(GLAZES[(i % 4) + 1])} size={150} fit mark={{ shape: 'star', letter: 'K', color: '#2b2420' }} />)}
        </div>
      </section>
      <section>
        <h3>Effekte</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EFFECT_GLAZES.flatMap(([eff, g]) => ['vase', 'schale', 'becher'].map((f) => <div style={{ textAlign: 'center' }}><Pot design={design(f, 1)} glazeColor={glazeColor(g)} effect={eff} size={110} /><div>{eff}</div></div>))}
        </div>
      </section>
      <section>
        <h3>Edle Effekte</h3>
        {BODY_EFFECT_GLAZES.map(([eff, body, g]) => (
          <div>
            <div>{eff}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {['vase', 'becher', 'schale', 'teller', 'teekanne', 'figur', 'fliese'].map((f, i) => <Pot design={{ ...design(f, i, 'none', body), id: `${eff}${f}` }} glazeColor={glazeColor(g)} effect={eff} size={96} />)}
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>Gemeinschaftsofen</h3>
        {GREAT_KILN_EFFECTS.map((eff) => (
          <div>
            <div>{eff}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {['vase', 'becher', 'schale', 'teller', 'teekanne', 'krug', 'figur', 'fliese'].map((f, i) => {
                const body = (['irdenware', 'steinzeug', 'porzellan'] as BodyId[])[i % 3];
                return <Pot design={{ ...design(f, i, 'none', body), id: `${eff}${f}` }} glazeColor={i % 2 ? BODIES[body].clearColor : glazeColor(GLAZES[(i % 4) + 1])} effect={eff} size={96} />;
              })}
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>Tonsorten</h3>
        {Object.values(BODIES).map((b) => (
          <div>
            <div>{b.name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.keys(FORMS).map((f) => <Pot design={design(f, 1, 'none', b.id)} glazeColor={b.clearColor} size={76} />)}
              {Object.keys(FORMS).map((f, i) => <Pot design={design(f, 1, PATTERNS[(i % 4) + 1], b.id)} glazeColor={glazeColor(GLAZES[(i % 4) + 1])} size={76} />)}
            </div>
          </div>
        ))}
      </section>
      <section>
        <h3>Figuren</h3>
        {(FORMS.figur.variants ?? []).map((v, vi) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {Object.values(BODIES).map((b, bi) => <Pot design={{ ...design('figur', vi, 'none', b.id), id: `f${v.id}${b.id}`, variant: v.id }} glazeColor={b.clearColor} size={76} quality={bi === 2 ? 3 : 2} />)}
            {GLAZES.slice(1).map((g, k) => <Pot design={{ ...design('figur', k, (['stripes', 'dots', 'waves', 'schuppen'] as const)[k], k % 2 ? 'porzellan' : 'irdenware'), id: `f${v.id}${k}`, variant: v.id }} glazeColor={glazeColor(g)} size={76} mark={k === 1 ? { shape: 'heart', letter: 'A', color: '#b44c36' } : null} />)}
            <Pot design={{ ...design('figur', vi, 'none', 'porzellan'), variant: v.id }} glazeColor="#f3f1ec" size={150} fit mark={{ shape: 'star', letter: 'K', color: '#3f5e8c', frame: 'krone' }} />
          </div>
        ))}
      </section>
      <section>
        <h3>Fliesen</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(['none', 'stripes', 'dots', 'waves', 'leaves', 'ranken', 'karo', 'schuppen'] as const).map((pt, i) => <Pot design={{ ...design('fliese', i, pt, (['porzellan', 'irdenware', 'steinzeug'] as const)[i % 3]), patternColor: i % 3 === 0 ? '#3f5e8c' : '#fff8ec' }} glazeColor={i % 3 === 0 ? '#f3f1ec' : glazeColor(GLAZES[(i % 4) + 1])} size={76} />)}
          <Pot design={{ ...design('fliese', 1, 'leaves', 'porzellan'), patternColor: '#3f5e8c' }} glazeColor="#f3f1ec" size={150} fit mark={{ shape: 'circle', letter: 'H', color: '#3f5e8c' }} />
        </div>
      </section>
      <section>
        <h3>Teekanne – extreme Profile</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {EXTREMES.map((p, i) => <Pot design={{ ...design('teekanne', i, 'none'), id: `tk${i}`, profile: p, handle: (['round', 'ear', 'loop'] as const)[i % 3] }} glazeColor={glazeColor(GLAZES[(i % 4) + 1])} size={110} />)}
        </div>
      </section>
      <section>
        <h3>Neue Muster</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(['ranken', 'karo', 'schuppen'] as const).flatMap((pt) => Object.keys(FORMS).map((f, i) => <Pot design={design(f, i, pt, i % 2 ? 'steinzeug' : 'irdenware')} glazeColor={glazeColor(GLAZES[(i % 4) + 1])} size={96} />))}
        </div>
      </section>
      <section>
        <h3>Rahmen</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.values(FRAMES).map((fr, i) => <div style={{ textAlign: 'center' }}><Pot design={design(['becher', 'vase', 'teekanne', 'schale', 'teller'][i % 5], 1)} glazeColor={glazeColor(GLAZES[(i % 4) + 1])} size={150} fit mark={{ shape: (['heart', 'star', 'circle', 'leaf'] as const)[i % 4], letter: 'A', color: i % 2 ? '#2b2420' : '#b44c36', frame: fr.id }} /><div>{fr.name}</div></div>)}
        </div>
      </section>
      <section>
        <h3>Silhouetten</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {Object.keys(FORMS).map((f) => <Pot design={design(f, 1)} glazeColor="#3f6fb5" size={76} silhouette />)}
        </div>
      </section>
    </div>
  );
}
