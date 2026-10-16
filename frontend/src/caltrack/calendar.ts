import { localDate, validateDate } from './repository';

export function calendarMonth(key: string, offset = 0) {
  validateDate(key);
  const [year, month] = key.split('-').map(Number);
  const first = new Date(year, month - 1 + offset, 1, 12);
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  return {
    key: localDate(first),
    label: first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    days: [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: count }, (_, index) => localDate(new Date(first.getFullYear(), first.getMonth(), index + 1, 12))),
    ],
  };
}
