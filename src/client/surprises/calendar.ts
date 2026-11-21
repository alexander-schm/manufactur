import { hashString } from '../../shared/rng';
import type { LocalTime, Mood } from './types';

function daypart(hour: number): Mood['daypart'] {
  if (hour >= 5 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 18) return 'day';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Same month and day as the opening, in a later year; a Feb 29 workshop celebrates on Feb 28 in other years. */
function isBirthday(local: LocalTime, created: LocalTime): boolean {
  if (local.year <= created.year) return false;
  if (created.month === 2 && created.day === 29 && !isLeap(local.year)) return local.month === 2 && local.day === 28;
  return local.month === created.month && local.day === created.day;
}

/** About one 3-hour block in six rains; the whole block agrees. */
export function isRaining(local: LocalTime): boolean {
  return hashString(`${local.year}-${local.month}-${local.day}-${Math.floor(local.hour / 3)}`) % 100 < 18;
}

/** The moment's mood: daypart, December, New Year's Eve (Dec 31 17:00 to Jan 1 23:59), the workshop birthday and rain (never in December). */
export function moodAt(local: LocalTime, created: LocalTime): Mood {
  const december = local.month === 12;
  const newYear = (local.month === 12 && local.day === 31 && local.hour >= 17) || (local.month === 1 && local.day === 1);
  return { daypart: daypart(local.hour), december, newYear, birthday: isBirthday(local, created), rain: !december && isRaining(local) };
}
