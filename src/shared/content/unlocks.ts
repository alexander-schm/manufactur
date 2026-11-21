import { EXTRA_COLORS } from './colors';
import { FRAMES } from './frames';

export interface UnlockDef {
  id: string;
  title: string;
  text: string;
  kind: 'form' | 'feature' | 'pattern' | 'room' | 'frame' | 'color' | 'customer' | 'tier';
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
  farbkoerper: { id: 'farbkoerper', kind: 'feature', title: 'Farbkörper', text: 'Der Händler bringt Eisen- und Kupferoxid. Jetzt wird es bunt!' },
  formdetails: { id: 'formdetails', kind: 'feature', title: 'Henkel & Ränder', text: 'Ohrhenkel, Schlaufen, gerollte und ausgestellte Ränder.' },
  reduktion: { id: 'reduktion', kind: 'feature', title: 'Reduktionsbrand', text: 'Drossle die Luft im Ofen – und staune, was mit den Farben passiert.' },
  kobalt: { id: 'kobalt', kind: 'feature', title: 'Kobalt', text: 'Teuer, aber nichts ist so blau wie Kobaltblau.' },
  zeichen: { id: 'zeichen', kind: 'feature', title: 'Meisterzeichen', text: 'Herz, Stern oder Blatt – gestalte dein eigenes Zeichen für den Boden jedes Stücks.' },
  steinzeug: { id: 'steinzeug', kind: 'feature', title: 'Steinzeug', text: 'Grauer Ton, heiß gebrannt, steinhart – und wertvoller.' },
  teekanne: { id: 'teekanne', kind: 'form', title: 'Teekannen', text: 'Mit Tülle und Deckel – die Königsdisziplin an der Scheibe.' },
  meisterstuecke: { id: 'meisterstuecke', kind: 'feature', title: 'Meisterstücke', text: 'Gönner aus der Stadt geben besondere Einzelstücke in Auftrag.' },
  'muster-ranken': { id: 'muster-ranken', kind: 'pattern', title: 'Ranken', text: 'Ein neues Muster für deine Entwürfe.' },
  'muster-karo': { id: 'muster-karo', kind: 'pattern', title: 'Karo', text: 'Ein neues Muster für deine Entwürfe.' },
  mangan: { id: 'mangan', kind: 'feature', title: 'Mangan', text: 'Ein neuer Farbkörper: violett bis tiefbraun.' },
  'kunde-sammlerin': { id: 'kunde-sammlerin', kind: 'customer', title: 'Frau von Scherbenfeld', text: 'Eine Sammlerin aus der Stadt schaut jetzt öfter vorbei.' },
  room2: { id: 'room2', kind: 'room', title: 'Zweiter Raum', text: 'Die Werkstatt wächst! Ein neuer Raum mit Platz für mehr.' },
};

for (const f of Object.values(FRAMES)) UNLOCKS[f.unlock] = { id: f.unlock, kind: 'frame', title: `Rahmen: ${f.name}`, text: 'Ein neuer Rahmen für dein Meisterzeichen.' };
for (const c of EXTRA_COLORS) UNLOCKS[c.unlock] = { id: c.unlock, kind: 'color', title: `Neue Farbe: ${c.name}`, text: 'Für Muster und Meisterzeichen.' };
