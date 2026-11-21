export interface MaterialDef {
  id: string;
  name: string;
  kind: 'clay' | 'glaze' | 'colorant' | 'fuel';
  /** shop price per unit in Taler */
  price: number;
  colorFamily?: string;
  locked?: boolean;
  /** unlock id required before it can be bought */
  unlock?: string;
  description: string;
}

export const MATERIALS: Record<string, MaterialDef> = {
  ton: { id: 'ton', name: 'Ton', kind: 'clay', price: 1, description: 'Roter Töpferton aus der Grube hinterm Dorf.' },
  glasurbasis: { id: 'glasurbasis', name: 'Glasurbasis', kind: 'glaze', price: 2, description: 'Feldspat, Quarz und Kreide – die Grundlage jeder Glasur.' },
  eisenoxid: { id: 'eisenoxid', name: 'Eisenoxid', kind: 'colorant', price: 5, colorFamily: 'braun', unlock: 'farbkoerper', description: 'Rostrotes Pulver. Wenig davon wird zart, viel davon dunkel.' },
  kupferoxid: { id: 'kupferoxid', name: 'Kupferoxid', kind: 'colorant', price: 8, colorFamily: 'gruen', unlock: 'farbkoerper', description: 'Färbt grün – oder, mit wenig Luft im Ofen, überraschend rot.' },
  kobalt: { id: 'kobalt', name: 'Kobalt', kind: 'colorant', price: 12, colorFamily: 'blau', unlock: 'kobalt', description: 'Teuer, aber schon eine Prise ergibt ein tiefes Blau.' },
  steinzeugton: { id: 'steinzeugton', name: 'Steinzeugton', kind: 'clay', price: 3, unlock: 'steinzeug', description: 'Grauer, feiner Ton, der große Hitze verträgt.' },
  salz: { id: 'salz', name: 'Salz', kind: 'colorant', price: 4, colorFamily: 'braun', unlock: 'steinzeug', description: 'Grobes Salz. Ins heiße Feuer geworfen, bildet es eine ganz eigene Glasur.' },
  mangan: { id: 'mangan', name: 'Mangan', kind: 'colorant', price: 10, colorFamily: 'lila', unlock: 'mangan', description: 'Violettbraunes Pulver – je mehr, desto dunkler.' },
  holz: { id: 'holz', name: 'Brennholz', kind: 'fuel', price: 1, description: 'Buchenscheite für den Ofen.' },
  kaolin: { id: 'kaolin', name: 'Kaolin', kind: 'clay', price: 6, locked: true, description: 'Weiße Porzellanerde. Noch weiß niemand, wo es welche gibt …' },
};
