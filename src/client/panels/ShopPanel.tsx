import { MATERIALS } from '../../shared/content';
import { missingAmount } from '../../shared/shop';
import { shopPrice } from '../../shared/village/specialties';
import type { GameState } from '../../shared/types';
import { dispatch } from '../store';
import { Button } from '../ui/Button';

const SWATCH: Record<string, string> = { ton: '#c8784c', glasurbasis: '#f4efe4', eisenoxid: '#a4512a', kupferoxid: '#4f8a5c', kobalt: '#2a4f9a', holz: '#a96e42', kaolin: '#ffffff' };

export const KEEP_STOCK_STEPS = [0, 100, 500, 1000, 5000];

/** How many units are missing to reach `target` (before checking the Taler). */
export function fillUpAmount(have: number, target = 1000): number {
  return Math.max(0, target - Math.floor(have));
}

export function ShopPanel({ s }: { s: GameState }) {
  const mats = Object.values(MATERIALS).filter((m) => !m.locked && m.id !== 'holz');
  return (
    <div>
      <p class="muted">Händlerin Hedwig hat heute im Angebot:</p>
      {mats.map((m) => {
        const available = !m.unlock || s.unlocks.includes(m.unlock);
        const price = shopPrice(s, m.id);
        const mine = s.village?.specialty === m.id;
        return (
          <div class="shop-row">
            <span class="mat-swatch" style={{ background: SWATCH[m.id] }} />
            <div class="grow">
              <strong>{m.name}</strong> <span class="muted">· {price.toLocaleString('de-DE')} T · du hast {Math.floor(s.materials[m.id] ?? 0)}</span>
              {mine && <span class="badge" style={{ marginLeft: '6px', background: 'var(--g5)' }}>Deine Spezialität!</span>}
              {!mine && price > m.price && <span class="badge" style={{ marginLeft: '6px' }}>bei Freunden günstiger</span>}
              <div class="muted" style={{ fontSize: '.85em' }}>{available ? m.description : 'Noch nicht im Angebot.'}</div>
            </div>
            {available && (
              <div class="shop-buy">
                {[10, 100, 1000].map((n) => (
                  <Button small variant="quiet" disabled={s.taler < n * price} onClick={() => dispatch({ type: 'buyMaterial', material: m.id, amount: n })}>+{n}</Button>
                ))}
                {fillUpAmount(s.materials[m.id] ?? 0) > 0 && (
                  <Button small variant="quiet" disabled={missingAmount(s, m.id, 1000) <= 0} onClick={() => dispatch({ type: 'buyMaterial', material: m.id, amount: missingAmount(s, m.id, 1000) })}>auf 1000 auffüllen</Button>
                )}
                <div class="chips" role="radiogroup" aria-label={`Vorrat halten: ${m.name}`}>
                  <span class="muted">Vorrat halten:</span>
                  {KEEP_STOCK_STEPS.map((n) => (
                    <button class="chip" aria-pressed={(s.keepStock[m.id] ?? 0) === n} onClick={() => dispatch({ type: 'setKeepStock', material: m.id, target: n })}>{n === 0 ? 'aus' : n}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <p class="muted" style={{ fontSize: '.9em', marginTop: '10px' }}>Tipp: Mit „Vorrat halten“ kauft Hedwig von allein nach, sobald dein Vorrat unter die gewählte Menge fällt.</p>
    </div>
  );
}
