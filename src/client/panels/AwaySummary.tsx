import type { AwayLog } from '../../shared/types';
import { EFFECTS } from '../../shared/content';
import { Button } from '../ui/Button';
import { CoinIcon } from '../ui/Counter';
import { Paper } from '../ui/Paper';
import { GRETA } from './Onboarding';
import { Character } from '../art/character/Character';
import { formatDuration } from './logic';

export function AwaySummary({ away, boosted, onClose, now }: { away: AwayLog; boosted: boolean; onClose: () => void; now?: number }) {
  return (
    <div class="modal-backdrop">
      <Paper tape seed={31} class="modal-card">
        <div class="card-row">
          <Character look={GRETA} pose="wave" seed={3} size={64} wobble={false} />
          <div class="grow">
            <h2>Während du weg warst …</h2>
            {now !== undefined && <p class="muted">({formatDuration(now - away.since)})</p>}
          </div>
        </div>
        <ul class="away-list">
          <li>🏺 <strong>{away.made}</strong> Stücke sind fertig geworden</li>
          <li>🛒 <strong>{away.sold}</strong> Stücke hat der Marktstand verkauft</li>
          <li><span class="inline-icon"><CoinIcon /></span> <strong>{Math.round(away.talerEarned)}</strong> Taler verdient</li>
          {away.discoveries.map((d) => <li>✦ Entdeckt: {EFFECTS[d]?.name ?? d}</li>)}
        </ul>
        {boosted && <p class="boost-note">Willkommen zurück – doppeltes Tempo für 30 Minuten!</p>}
        <Button variant="primary" onClick={onClose}>Weiter töpfern</Button>
      </Paper>
    </div>
  );
}
