/** Taler as German players read them: rounded up, with a dot every three digits (1.500, 2.500.000). */
export const fmtTaler = (n: number): string => Math.ceil(n).toLocaleString('de-DE');
