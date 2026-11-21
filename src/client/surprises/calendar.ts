import type { LocalTime, Mood } from './types';

/** The moment's mood. Stub until Task 5 fills in dayparts, December, New Year, the workshop birthday and rain. */
export function moodAt(_local: LocalTime, _created: LocalTime): Mood {
  return { daypart: 'day', december: false, newYear: false, birthday: false, rain: false };
}
