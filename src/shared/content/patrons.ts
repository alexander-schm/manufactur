export interface PatronDef { name: string; job: string }

/** Patrons (Gönner) who commission masterworks. */
export const PATRONS: readonly PatronDef[] = [
  { name: 'Gräfin Mohnblüte', job: 'Kunstsammlerin' },
  { name: 'Abt Benedikt', job: 'Abt vom Kloster am See' },
  { name: 'Kommerzienrat Silbermann', job: 'Kaufmann aus der Stadt' },
  { name: 'Madame Fleurie', job: 'Hutmacherin' },
  { name: 'Professor Ammonit', job: 'Museumsdirektor' },
  { name: 'Hofrat von Kiesel', job: 'Hofrat' },
];
