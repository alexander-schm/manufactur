export interface UnlockDef {
  id: string;
  title: string;
  text: string;
  kind: 'form' | 'feature' | 'pattern' | 'room';
}

export const UNLOCKS: Record<string, UnlockDef> = {
  becher: { id: 'becher', kind: 'form', title: 'Becher', text: 'Der Klassiker. Jede Werkstatt fängt mit Bechern an.' },
  orders: { id: 'orders', kind: 'feature', title: 'Auftragsbrett', text: 'Die Leute im Dorf haben von dir gehört und geben Bestellungen auf!' },
  studio: { id: 'studio', kind: 'feature', title: 'Entwurfsstudio', text: 'Gestalte eigene Stücke: Form, Glasur, Muster – ganz dein Stil.' },
  schale: { id: 'schale', kind: 'form', title: 'Schalen', text: 'Breit, rund und perfekt für Suppe.' },
  hiring: { id: 'hiring', kind: 'feature', title: 'Leute einstellen', text: 'Mehr Hände, mehr Ware. Wer passt in deine Werkstatt?' },
  recipes: { id: 'recipes', kind: 'feature', title: 'Rezeptbuch', text: 'Jede Glasur, die du entdeckst, bekommt eine Seite.' },
  upgrades: { id: 'upgrades', kind: 'feature', title: 'Ausbau', text: 'Deine Stationen lassen sich jetzt verbessern.' },
  teller: { id: 'teller', kind: 'form', title: 'Teller', text: 'Flach, aber nicht langweilig.' },
  vase: { id: 'vase', kind: 'form', title: 'Vasen', text: 'Hoch hinaus! Vasen bringen gutes Geld.' },
  krug: { id: 'krug', kind: 'form', title: 'Krüge', text: 'Mit Henkel und Tülle – für Wasser, Wein und Most.' },
  patterns2: { id: 'patterns2', kind: 'pattern', title: 'Wellen & Blätter', text: 'Zwei neue Muster für deine Entwürfe.' },
  room2: { id: 'room2', kind: 'room', title: 'Zweiter Raum', text: 'Die Werkstatt wächst! Ein neuer Raum mit Platz für mehr.' },
};
