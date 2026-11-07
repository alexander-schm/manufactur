import { FORMS } from '../../shared/content';
import { glazeColor } from '../../shared/discovery';
import type { Design, FiringSettings, GlazeRecipe, PatternKind } from '../../shared/types';
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

function design(form: string, i: number, pattern: PatternKind = 'none'): Design {
  const d = FORMS[form].profileDefaults;
  const v = [-0.3, 0, 0.3][i % 3];
  const c = (x: number) => Math.max(0, Math.min(1, x));
  return {
    id: `${form}${i}`, name: '', form, pattern, patternColor: '#fff8ec',
    profile: { height: c(d.height + v), belly: c(d.belly - v * 0.6), neck: c(d.neck + v * 0.5), foot: c(d.foot), rim: c(d.rim + v * 0.4) },
    handle: FORMS[form].handleAllowed ? (['round', 'ear', 'loop'] as const)[i % 3] : 'none', rim: (['plain', 'rolled', 'flared'] as const)[i % 3], glazeId: '',
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
    </div>
  );
}
