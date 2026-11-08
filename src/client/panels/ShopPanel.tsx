import { MATERIALS } from '../../shared/content';
import { shopPrice } from '../../shared/village/specialties';
import type { GameState } from '../../shared/types';
import { dispatch } from '../store';
import { Button } from '../ui/Button';

const SWATCH: Record<string, string> = { ton: '#c8784c', glasurbasis: '#f4efe4', eisenoxid: '#a4512a', kupferoxid: '#4f8a5c', kobalt: '#2a4f9a', holz: '#a96e42', kaolin: '#ffffff' };

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
            {available && [10, 50].map((n) => (
              <Button small variant="quiet" disabled={s.taler < n * price} onClick={() => dispatch({ type: 'buyMaterial', material: m.id, amount: n })}>+{n}</Button>
            ))}
          </div>
        );
      })}
      <p class="muted" style={{ fontSize: '.9em', marginTop: '10px' }}>Tipp: Mit „automatisch nachkaufen“ an der Töpferscheibe musst du dich um Ton gar nicht kümmern.</p>
    </div>
  );
}
