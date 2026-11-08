import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import type { GameState } from '../../../shared/types';
import { STICKER_EMOJI } from '../../../shared/village/help';
import { SPECIALTIES } from '../../../shared/village/specialties';
import { STICKERS, type Member, type VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { WorkshopScene } from '../../art/workshop/WorkshopScene';
import { Button } from '../../ui/Button';
import { Paper } from '../../ui/Paper';
import { DesignPot } from '../common';
import { Guestbook } from './GuestbookPanel';

export function VisitView({ village, meId, member, state, now, onHelp }: { village: VillageView; meId: string; member: Member; state: GameState; now: number; onHelp: (sticker: string) => void }) {
  const [sticker, setSticker] = useState<string>('herz');
  const left = village.helpsLeft[member.playerId] ?? 0;
  const own = state.designs.filter((d) => !d.origin);
  return (
    <div class="visit">
      <div class="card-row" style={{ marginBottom: '8px' }}>
        <Character look={makeCharacter(member.avatarSeed)} pose="wave" seed={member.avatarSeed} size={56} wobble={false} />
        <div class="grow">
          <h3 style={{ margin: 0 }}>Werkstatt von {member.name}</h3>
          <span class="muted">Land: {SPECIALTIES[member.specialty]?.name ?? '—'} · {Math.floor(state.ruf)} Ruf</span>
        </div>
      </div>
      <Paper seed={61}><WorkshopScene state={state} now={now} /></Paper>
      {member.playerId !== meId && (
        <section class="panel-section" style={{ marginTop: '14px' }}>
          <h3>Mit anpacken</h3>
          <p class="muted">Deine Hilfe macht {member.name}s Werkstatt 15 Minuten schneller – auch wenn {member.name} gerade nicht da ist. Dazu ein Sticker fürs Gästebuch.</p>
          <div class="chips">
            {STICKERS.map((s) => <button class="chip" aria-pressed={s === sticker} onClick={() => setSticker(s)} aria-label={s}>{STICKER_EMOJI[s]}</button>)}
          </div>
          <Button variant="primary" disabled={left <= 0} onClick={() => onHelp(sticker)} style={{ marginTop: '8px' }}>
            {left > 0 ? `Mit anpacken (noch ${left}× heute)` : 'Für heute genug geholfen – morgen wieder!'}
          </Button>
        </section>
      )}
      <section class="panel-section">
        <h3>Entwürfe von {member.name}</h3>
        <div class="goods-grid">{own.map((d) => <div class="goods-item"><DesignPot s={state} d={d} size={72} /><div>{d.name}</div></div>)}</div>
      </section>
      <section class="panel-section">
        <h3>Gästebuch</h3>
        <Guestbook entries={village.guestbooks[member.playerId] ?? []} />
      </section>
    </div>
  );
}
