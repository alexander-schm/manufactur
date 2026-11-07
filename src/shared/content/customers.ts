import type { Taste } from '../types';

export interface CustomerDef { name: string; job: string; tastes: Taste[] }

/** Archetypes; one of their tastes is chosen per order. */
export const CUSTOMERS: readonly CustomerDef[] = [
  { name: 'Frau Holzapfel', job: 'Bäckerin', tastes: [{ form: 'becher', colorFamily: 'gelb' }, { form: 'teller', simple: true }] },
  { name: 'Herr Krummbein', job: 'Wirt vom „Goldenen Krug“', tastes: [{ form: 'krug' }, { form: 'becher', colorFamily: 'braun' }] },
  { name: 'Pfarrer Lindemann', job: 'Pfarrer', tastes: [{ form: 'vase', colorFamily: 'weiss' }, { simple: true }] },
  { name: 'Baronin von Tüpfel', job: 'Baronin', tastes: [{ form: 'vase', tall: true, pattern: 'dots' }, { colorFamily: 'blau', pattern: 'waves' }] },
  { name: 'Lehrer Brösel', job: 'Dorfschullehrer', tastes: [{ form: 'becher', pattern: 'stripes' }, { colorFamily: 'gruen' }] },
  { name: 'Oma Pfefferkorn', job: 'Rentnerin', tastes: [{ form: 'schale', pattern: 'leaves' }, { form: 'teller', colorFamily: 'rot' }] },
  { name: 'Käpt’n Seegras', job: 'Fischer', tastes: [{ colorFamily: 'blau', pattern: 'waves' }, { form: 'schale', colorFamily: 'blau' }] },
  { name: 'Dr. Kümmel', job: 'Apotheker', tastes: [{ form: 'krug', simple: true }, { colorFamily: 'braun', tall: true }] },
  { name: 'Lisbeth Blümchen', job: 'Floristin', tastes: [{ form: 'vase', pattern: 'leaves' }, { form: 'vase', colorFamily: 'gruen' }] },
  { name: 'Graf Ochsenblut', job: 'Kunstsammler', tastes: [{ colorFamily: 'rot', tall: true }, { form: 'vase', colorFamily: 'schwarz' }] },
  { name: 'Familie Kesselflick', job: 'Großfamilie mit neun Kindern', tastes: [{ form: 'schale' }, { form: 'becher', pattern: 'dots' }] },
  { name: 'Meister Hobel', job: 'Schreiner', tastes: [{ form: 'becher', simple: true }, { colorFamily: 'braun' }] },
  { name: 'Fräulein Lavendel', job: 'Teehaus-Besitzerin', tastes: [{ form: 'becher', colorFamily: 'lila' }, { form: 'schale', colorFamily: 'gruen' }] },
  { name: 'Wachtmeister Strenge', job: 'Dorfpolizist', tastes: [{ form: 'becher', colorFamily: 'blau', simple: true }] },
];
