import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import type { GameState } from '../../../shared/types';
import type { VillageView } from '../../../shared/village/types';
import { Character } from '../../art/character/Character';
import { Button } from '../../ui/Button';
import { villageDispatch } from '../../villageStore';
import { GivePicker, haveEnough, toRef, type PickerValue } from './GivePicker';

export function GiftPanel({ v, s, meId }: { v: VillageView; s: GameState; meId: string }) {
  const friends = v.members.filter((m) => m.playerId !== meId);
  const [to, setTo] = useState(friends[0]?.playerId ?? '');
  const [what, setWhat] = useState<PickerValue>({ kind: 'material', material: 'ton' });
  const [n, setN] = useState(5);
  if (!friends.length) return <p class="muted">Noch niemand da, dem du etwas schenken könntest – lade deine Leute ein!</p>;
  const ref = toRef(s, what, n);
  return (
    <div>
      <strong>Für wen?</strong>
      <div class="chips" style={{ margin: '6px 0 10px' }}>
        {friends.map((f) => (
          <button class="chip friend" aria-pressed={f.playerId === to} onClick={() => setTo(f.playerId)}>
            <Character look={makeCharacter(f.avatarSeed)} pose="idle" seed={f.avatarSeed} size={22} wobble={false} />{f.name}
          </button>
        ))}
      </div>
      <strong>Was?</strong>
      <GivePicker s={s} value={what} onChange={setWhat} allowTaler={false} />
      <label class="slider"><span>{n}×</span><input type="range" min={1} max={100} value={n} onInput={(e) => setN(Number(e.currentTarget.value))} /></label>
      <p class="muted" style={{ fontSize: '.9em' }}>Geschenkte Stücke stehen bei deinen Freunden im Regal – mit deinem Zeichen drauf.</p>
      <Button variant="primary" disabled={!ref || !to || !haveEnough(s, ref)} onClick={() => ref && villageDispatch({ type: 'gift', to, give: ref })}>Schenken 🎁</Button>
    </div>
  );
}
