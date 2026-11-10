/**
 * Timezone-safe birthday maths with no dependencies.
 * A birthday is a month/day in the RECIPIENT's IANA timezone; it starts at
 * that zone's local midnight, so the countdown hits zero exactly then.
 */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** Feb 29 birthdays are celebrated on Feb 28 in non-leap years. */
export const effectiveDay = (y: number, m: number, d: number) =>
  m === 2 && d === 29 && !isLeap(y) ? 28 : d;
export const daysInMonth = (m: number) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

function zonedParts(ts: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ts))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o;
}

function offsetMs(ts: number, tz: string) {
  const p = zonedParts(ts, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** UTC timestamp of 00:00 on y-m-d in the given timezone (DST-safe). */
export function zonedMidnightToUtc(y: number, m: number, d: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const off1 = offsetMs(guess, tz);
  let utc = guess - off1;
  const off2 = offsetMs(utc, tz);
  if (off2 !== off1) utc = guess - off2;
  return utc;
}

export function todayInTz(tz: string, now: Date = new Date()) {
  const p = zonedParts(now.getTime(), tz);
  return { y: p.year, m: p.month, d: p.day, iso: `${p.year}-${pad(p.month)}-${pad(p.day)}` };
}

export function birthdayInfo(month: number, day: number, tz: string, now: Date = new Date()) {
  const t = todayInTz(tz, now);
  const eff = effectiveDay(t.y, month, day);
  const isBirthday = t.m === month && t.d === eff;
  const passed = t.m > month || (t.m === month && t.d > eff);
  const year = passed ? t.y + 1 : t.y;
  const d = effectiveDay(year, month, day);
  return {
    isBirthday,
    todayIso: t.iso,
    nextIso: `${year}-${pad(month)}-${pad(d)}`,
    target: zonedMidnightToUtc(year, month, d, tz), // UTC ms of the next birthday's start
  };
}

export function addDaysIso(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

export function formatIso(iso: string, opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

export const browserTimezone = () => 'Asia/Calcutta';

export function timezoneList(): string[] {
  return ['Asia/Calcutta'];
}
