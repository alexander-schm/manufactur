import { BODIES } from '../../shared/content';
import { DesignStudio } from '../panels/DesignStudio';
import { mockWorkshop } from './ScenePage';

/** Dev-only: the studio in a Manufaktur game (#studio, #studio&glaze, #studio&me, #studio&werkstatt). */
export function StudioPage() {
  const s = mockWorkshop(Date.now());
  const flags = location.hash.split('&').slice(1);
  s.unlocks.push('studio', 'schale', 'teller', 'vase', 'farbkoerper', 'formdetails', 'krug', 'patterns2', 'reduktion', 'muster-ranken', 'farbe-gold', 'farbe-mint', 'rahmen-punkte');
  if (!flags.includes('werkstatt')) {
    s.tier = 'manufaktur';
    s.glazes.push(structuredClone(BODIES.steinzeug.starterGlaze!));
    s.materials.steinzeugton = 20;
  }
  s.materials.glasurbasis = 10;
  return <div style={{ padding: '12px', maxWidth: '1000px', margin: '0 auto' }}><DesignStudio s={s} tab={flags.find((f) => f === 'glaze' || f === 'me')} /></div>;
}
