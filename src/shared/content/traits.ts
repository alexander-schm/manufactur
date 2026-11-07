import type { Stage } from '../types';

export interface TraitDef {
  id: string;
  name: string;
  description: string;
  speedMul: number;
  qualityAdd: number;
  /** speed multiplier while the owner is away */
  offlineSpeedMul?: number;
  /** speed multiplier given to stations in neighbouring slots */
  neighbourSpeedMul?: number;
  effectChanceAdd?: number;
  /** +20 % speed when working at this stage */
  favStage?: Stage;
}

export const TRAITS: Record<string, TraitDef> = {
  perfektionist: { id: 'perfektionist', name: 'Perfektionistisch', description: 'Bessere Qualität, aber nimmt sich Zeit.', speedMul: 0.8, qualityAdd: 15 },
  nachteule: { id: 'nachteule', name: 'Nachteule', description: 'Arbeitet viel schneller, wenn du nicht da bist.', speedMul: 0.95, qualityAdd: 0, offlineSpeedMul: 1.5 },
  plaudertasche: { id: 'plaudertasche', name: 'Plaudertasche', description: 'Muntert die Nachbarstationen auf (+10 % Tempo).', speedMul: 0.95, qualityAdd: 0, neighbourSpeedMul: 1.1 },
  flink: { id: 'flink', name: 'Flink, aber tollpatschig', description: 'Sehr schnell, die Qualität leidet etwas.', speedMul: 1.3, qualityAdd: -10 },
  glasurfluesterer: { id: 'glasurfluesterer', name: 'Glasurflüsterer', description: 'Besondere Glasureffekte gelingen öfter.', speedMul: 1, qualityAdd: 3, effectChanceAdd: 0.2, favStage: 'glaze' },
  geduldig: { id: 'geduldig', name: 'Geduldig', description: 'Ruhige Hände, etwas bessere Qualität.', speedMul: 0.95, qualityAdd: 8 },
  fruehaufsteher: { id: 'fruehaufsteher', name: 'Frühaufsteher', description: 'Immer schon da, immer etwas schneller.', speedMul: 1.1, qualityAdd: 0 },
  ordnungsliebend: { id: 'ordnungsliebend', name: 'Ordnungsliebend', description: 'Alles an seinem Platz – etwas schneller und sauberer.', speedMul: 1.05, qualityAdd: 5 },
  traeumer: { id: 'traeumer', name: 'Träumerisch', description: 'Langsamer, aber manchmal entsteht Magie.', speedMul: 0.9, qualityAdd: 5, effectChanceAdd: 0.1 },
  kraftpaket: { id: 'kraftpaket', name: 'Kraftpaket', description: 'Knetet Ton wie nichts (+20 % an der Knetbank).', speedMul: 1.1, qualityAdd: 0, favStage: 'prepare' },
  drehkuenstler: { id: 'drehkuenstler', name: 'Drehkünstler', description: 'Fühlt sich an der Scheibe zu Hause.', speedMul: 1, qualityAdd: 6, favStage: 'form' },
};
