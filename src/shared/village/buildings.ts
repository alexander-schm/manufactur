export interface BuildingDef { id: string; name: string; description: string }

/** Built in this order as joint orders complete (2 completions per building). */
export const BUILDING_ORDER = ['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus'] as const;

export const BUILDINGS: Record<string, BuildingDef> = {
  tongrube: { id: 'tongrube', name: 'Dorf-Tongrube', description: 'Ton ist für alle im Dorf 20 % günstiger.' },
  markthalle: { id: 'markthalle', name: 'Markthalle', description: 'Marktstände verkaufen zu besseren Preisen (90 % statt 80 %).' },
  glasurbibliothek: { id: 'glasurbibliothek', name: 'Glasurbibliothek', description: 'Glasurversuche kosten eine Glasurbasis weniger, und alle Hinweise liegen offen.' },
  gildenhaus: { id: 'gildenhaus', name: 'Gildenhaus', description: 'Großaufträge zahlen 20 % mehr.' },
};

export const hasBuilding = (s: { village: { buildings: string[] } | null }, id: string) => !!s.village?.buildings.includes(id);
