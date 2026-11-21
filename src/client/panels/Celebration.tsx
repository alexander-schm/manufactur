import { getUnlock } from '../../shared/content';
import { MILESTONES } from '../../shared/progression';
import { DECOR } from '../../shared/village/decor';
import { TierSign } from '../art/workshop/TierSign';
import { T } from '../strings';
import { Button } from '../ui/Button';
import { Paper } from '../ui/Paper';

export function Celebration({ milestoneId, onClose }: { milestoneId: string; onClose: () => void }) {
  const m = MILESTONES.find((x) => x.id === milestoneId);
  if (!m) return null;
  return (
    <div class="modal-backdrop">
      <div class="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, background: ['#c8784c', '#dcc2a6', '#a85e38', '#f2b84b'][i % 4] }} />)}</div>
      <Paper tape seed={44} class="modal-card celebrate">
        <p class="kicker">{m.tier ? T.newTier : T.unlocked}</p>
        {m.tier && (
          <svg class="celebrate-sign" viewBox="0 0 220 96" role="img" aria-hidden="true">
            <TierSign tier={m.tier} x={110} y={8} />
          </svg>
        )}
        <h2>{m.text}</h2>
        {m.unlocks.map((u) => (
          <div class="unlock-line"><strong>{getUnlock(u).title}</strong><br /><span class="muted">{getUnlock(u).text}</span></div>
        ))}
        {(m.decor ?? []).map((d) => (
          <div class="unlock-line"><strong>{T.newDecor(DECOR[d].name)}</strong></div>
        ))}
        <Button variant="primary" onClick={onClose}>Juhu!</Button>
      </Paper>
    </div>
  );
}
