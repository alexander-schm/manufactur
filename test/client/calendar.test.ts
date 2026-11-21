import { describe, expect, it } from 'vitest';
import { isRaining, moodAt } from '../../src/client/surprises/calendar';
import type { LocalTime } from '../../src/client/surprises/types';

const L = (y: number, mo: number, d: number, h = 12, mi = 0): LocalTime => ({ year: y, month: mo, day: d, hour: h, minute: mi });
const C = L(2026, 3, 14);

describe('moodAt', () => {
  it('dayparts switch on the hour', () => {
    expect([4, 5, 8, 9, 17, 18, 21, 22].map((h) => moodAt(L(2026, 6, 1, h, h === 4 ? 59 : 0), C).daypart))
      .toEqual(['night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night']);
    expect(moodAt(L(2026, 6, 1, 0, 0), C).daypart).toBe('night');
    expect(moodAt(L(2026, 6, 1, 23, 59), C).daypart).toBe('night');
  });

  it('December, New Year’s Eve window, birthdays', () => {
    expect(moodAt(L(2026, 12, 1), C).december).toBe(true);
    expect(moodAt(L(2026, 12, 31, 23, 59), C).december).toBe(true);
    expect(moodAt(L(2026, 11, 30, 23, 59), C).december).toBe(false);
    expect(moodAt(L(2027, 1, 1), C).december).toBe(false);
    expect(moodAt(L(2026, 12, 31, 16, 59), C).newYear).toBe(false);
    expect(moodAt(L(2026, 12, 31, 17), C).newYear).toBe(true);
    expect(moodAt(L(2027, 1, 1, 23, 59), C).newYear).toBe(true);
    expect(moodAt(L(2027, 1, 2, 0), C).newYear).toBe(false);
    expect(moodAt(L(2027, 3, 14), C).birthday).toBe(true);
    expect(moodAt(L(2026, 3, 14), C).birthday).toBe(false);
    expect(moodAt(L(2027, 3, 15), C).birthday).toBe(false);
    const leap = L(2028, 2, 29);
    expect(moodAt(L(2029, 2, 28), leap).birthday).toBe(true);
    expect(moodAt(L(2032, 2, 28), leap).birthday).toBe(false);
    expect(moodAt(L(2032, 2, 29), leap).birthday).toBe(true);
  });

  it('rain: never in December, stable within a 3-hour block, about one block in six', () => {
    expect(moodAt(L(2026, 12, 5, 10), C).rain).toBe(false);
    for (let d = 1; d <= 31; d++) for (let h = 0; h < 24; h += 3) expect(moodAt(L(2026, 12, d, h), C).rain).toBe(false);
    expect(isRaining(L(2026, 6, 1, 9))).toBe(isRaining(L(2026, 6, 1, 11, 59)));
    let n = 0;
    for (let d = 0; d < 365; d++) for (let b = 0; b < 8; b++) {
      const t = new Date(Date.UTC(2026, 0, 1 + d));
      const at = L(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), b * 3);
      if (isRaining(at)) n++;
      // the whole block agrees, and outside December the mood follows it
      expect(isRaining(L(at.year, at.month, at.day, b * 3 + 2, 59))).toBe(isRaining(at));
      if (at.month !== 12) expect(moodAt(at, C).rain).toBe(isRaining(at));
    }
    expect(n / 2920).toBeGreaterThan(0.12);
    expect(n / 2920).toBeLessThan(0.24);
  });
});
