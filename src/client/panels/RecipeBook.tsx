import { EFFECTS, MATERIALS } from '../../shared/content';
import { discoveredEffects } from '../../shared/discovery';
import type { GameState, GlazeRecipe } from '../../shared/types';
import { inkStyle } from '../art/ink';

const FIRING = (g: GlazeRecipe) => `${g.firing.temp}, ${g.firing.atmosphere === 'reduzierend' ? 'Reduktion' : 'viel Luft'}, ${g.firing.cooling} abkühlen`;

function Swatch({ color, effect }: { color: string; effect: string | null }) {
  return (
    <svg viewBox="0 0 70 50" width="70" aria-hidden="true">
      <path d="M6 10 Q20 2 36 8 Q54 2 64 10 Q68 26 62 40 Q40 48 24 44 Q8 46 5 34 Q2 20 6 10 Z" fill={color} style={inkStyle(1.6)} />
      {effect && <text x="57" y="16" font-size="14">✦</text>}
    </svg>
  );
}

export function RecipeBook({ s }: { s: GameState }) {
  const found = discoveredEffects(s);
  const missing = Object.values(EFFECTS).filter((e) => !found.includes(e.id));
  return (
    <div class="book">
      <div class="book-page">
        <h3>Meine Glasuren ({s.glazes.length})</h3>
        {s.glazes.map((g) => (
          <div class="recipe">
            <Swatch color={g.color} effect={g.effect} />
            <div>
              <strong>{g.name}</strong>
              <div class="hand-note">{g.base}{g.colorant ? ` + ${g.colorantPct} % ${MATERIALS[g.colorant].name}` : ''} · {FIRING(g)}</div>
              {g.effect && <div class="hand-note">✦ {EFFECTS[g.effect].description}</div>}
            </div>
          </div>
        ))}
      </div>
      <div class="book-page">
        <h3>Noch zu entdecken ({missing.length})</h3>
        {missing.map((e) => (
          <div class="recipe">
            <svg viewBox="0 0 70 50" width="70" aria-hidden="true"><path d="M6 10 Q20 2 36 8 Q54 2 64 10 Q68 26 62 40 Q40 48 24 44 Q8 46 5 34 Q2 20 6 10 Z" fill="none" style={{ ...inkStyle(1.6), strokeDasharray: '4 4' }} /><text x="35" y="33" text-anchor="middle" font-size="22" font-family="var(--font-hand)">?</text></svg>
            <div><strong>{s.stats.experiments > 0 ? e.name : '???'}</strong><div class="hand-note">{e.hint}</div></div>
          </div>
        ))}
        {missing.length === 0 && <p>Du hast alle Effekte entdeckt! Meisterlich.</p>}
      </div>
    </div>
  );
}
