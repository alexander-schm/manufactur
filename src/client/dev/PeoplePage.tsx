import { characterName, makeCharacter, personality } from '../../shared/character';
import { Character, type Pose } from '../art/character/Character';

const POSES: Pose[] = ['idle', 'work', 'wave', 'sleep'];

export function PeoplePage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Leute aus dem Dorf</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px 10px' }}>
        {Array.from({ length: 24 }, (_, i) => {
          const seed = i * 7919 + 17;
          return (
            <figure style={{ margin: '0', textAlign: 'center' }}>
              <Character look={makeCharacter(seed)} pose={POSES[i % 4]} seed={seed} size={110} />
              <figcaption><strong>{characterName(seed)}</strong><br /><small class="muted">{personality(seed, [])}</small></figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
