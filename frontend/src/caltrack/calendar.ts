import { localDate, validateDate } from './repository';

export function calendarDateKey(year: number, month: number, day = 1) {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('Enter a four-digit year.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Choose a valid month.');
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('Enter a valid day.');
  }

  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  validateDate(key);
  return key;
}

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
