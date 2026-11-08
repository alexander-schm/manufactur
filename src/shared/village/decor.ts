export interface DecorDef { id: string; name: string; spot: 'wall' | 'window' | 'floor' | 'ceiling' }

export const DECOR: Record<string, DecorDef> = {
  wimpelkette: { id: 'wimpelkette', name: 'Wimpelkette', spot: 'ceiling' },
  blumenkasten: { id: 'blumenkasten', name: 'Blumenkasten', spot: 'window' },
  vogelhaus: { id: 'vogelhaus', name: 'Vogelhäuschen', spot: 'wall' },
  laterne: { id: 'laterne', name: 'Laterne', spot: 'ceiling' },
  'teppich-blau': { id: 'teppich-blau', name: 'Blauer Teppich', spot: 'floor' },
  'grosse-vase': { id: 'grosse-vase', name: 'Große Bodenvase', spot: 'floor' },
  wandteller: { id: 'wandteller', name: 'Wandteller', spot: 'wall' },
  haengekorb: { id: 'haengekorb', name: 'Hängekorb', spot: 'ceiling' },
};

export const MAX_DECOR_PLACED = 4;
