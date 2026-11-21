export interface ExtraColor { id: string; name: string; color: string; unlock: string }

const c = (id: string, name: string, color: string): ExtraColor => ({ id, name, color, unlock: `farbe-${id}` });

/** Colours won from the collection book, in prize order. */
export const EXTRA_COLORS: ExtraColor[] = [
  c('gold', 'Gold', '#d4a531'),
  c('mint', 'Minze', '#8fd1b5'),
  c('pflaume', 'Pflaume', '#7a3b6e'),
  c('ocker', 'Ocker', '#c98a2e'),
  c('tuerkis', 'Türkis', '#2e9c9a'),
  c('rost', 'Rost', '#a4512a'),
  c('flieder', 'Flieder', '#b39ddb'),
  c('tanne', 'Tanne', '#2f5d3a'),
  c('koralle', 'Koralle', '#f08a6c'),
  c('nacht', 'Nachtblau', '#1f2b4d'),
  c('sand', 'Sand', '#e2cfa4'),
  c('kirsche', 'Kirsche', '#b0243a'),
];
