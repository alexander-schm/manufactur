import type { Stage, StationKind } from '../types';

export interface StationDef {
  kind: StationKind;
  name: string;
  description: string;
  stage: Stage | null;
  /** second stage handled by the same station kind (the kiln fires twice) */
  stage2?: Stage;
  /** whether assigned workers speed this station up */
  usesWorkers: boolean;
  /** pieces per minute by level (index = level-1) */
  piecesPerMinute: number[];
  /** Taler cost to upgrade FROM level i+1 to i+2 */
  upgradeCost: number[];
  /** Ruf required to upgrade FROM level i+1 */
  rufRequired: number[];
  /** shelf: max stored pieces; kiln: max pieces per firing; stall: pieces sold per minute */
  capacity?: number[];
  maxWorkers: number;
}

const ppm = (base: number) => [base, base * 1.4, base * 1.96, base * 2.74, base * 3.84];

export const STATIONS: Record<StationKind, StationDef> = {
  prepBench: { kind: 'prepBench', name: 'Knetbank', description: 'Hier wird der Ton geschlagen und geknetet, bis keine Luftblasen mehr drin sind.',
    stage: 'prepare', usesWorkers: true, piecesPerMinute: ppm(12), upgradeCost: [60, 180, 500, 1400], rufRequired: [10, 30, 80, 200], maxWorkers: 2 },
  wheel: { kind: 'wheel', name: 'Töpferscheibe', description: 'Das Herz der Werkstatt. Hier bekommt der Ton seine Form.',
    stage: 'form', usesWorkers: true, piecesPerMinute: ppm(12), upgradeCost: [80, 220, 600, 1600], rufRequired: [10, 30, 80, 200], maxWorkers: 2 },
  dryingRack: { kind: 'dryingRack', name: 'Trockengestell', description: 'Frisch gedrehte Stücke müssen in Ruhe lederhart trocknen.',
    stage: 'dry', usesWorkers: false, piecesPerMinute: ppm(12), upgradeCost: [50, 150, 420, 1200], rufRequired: [10, 30, 80, 200], maxWorkers: 0 },
  kiln: { kind: 'kiln', name: 'Brennofen', description: 'Zweimal geht jedes Stück hinein: zum Schrühbrand und zum Glasurbrand.',
    stage: 'bisque', stage2: 'glazeFire', usesWorkers: false, piecesPerMinute: ppm(12), upgradeCost: [120, 320, 800, 2000], rufRequired: [10, 30, 80, 200],
    capacity: [12, 20, 32, 48, 72], maxWorkers: 0 },
  glazeTable: { kind: 'glazeTable', name: 'Glasurtisch', description: 'Eintauchen, übergießen, bemalen – hier bekommen die Stücke ihre Farbe.',
    stage: 'glaze', usesWorkers: true, piecesPerMinute: ppm(12), upgradeCost: [70, 200, 560, 1500], rufRequired: [10, 30, 80, 200], maxWorkers: 2 },
  shelf: { kind: 'shelf', name: 'Regal', description: 'Fertige Ware wartet hier auf Kundschaft.',
    stage: null, usesWorkers: false, piecesPerMinute: [0, 0, 0, 0, 0], upgradeCost: [40, 120, 360, 1000], rufRequired: [0, 20, 60, 150],
    capacity: [60, 100, 160, 260, 400], maxWorkers: 0 },
  marketStall: { kind: 'marketStall', name: 'Marktstand', description: 'Verkauft ausgewählte Ware ganz von allein – auch wenn du nicht da bist.',
    stage: null, usesWorkers: false, piecesPerMinute: [0, 0, 0, 0, 0], upgradeCost: [60, 180, 500, 1400], rufRequired: [5, 25, 70, 180],
    capacity: [1, 1.6, 2.4, 3.6, 5.2], maxWorkers: 0 },
};
