// Date utility helpers

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function getDayName(d: Date): string { return DAY_NAMES[d.getDay()]; }
export function getDayShort(d: Date): string { return DAY_SHORT[d.getDay()]; }
export function getMonthName(d: Date): string { return MONTH_NAMES[d.getMonth()]; }
export function getMonthShort(d: Date): string { return MONTH_SHORT[d.getMonth()]; }

export function formatDateFull(d: Date): string {
  return `${getDayName(d)}, ${getMonthShort(d)} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDateShort(d: Date): string {
  return `${getMonthShort(d)} ${d.getDate()}`;
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getWeekStartDay(): number {
  const saved = localStorage.getItem('gymlog_week_start');
  return saved ? parseInt(saved, 10) : 1; // Default to Monday
}

export function setWeekStartDay(dayIndex: number): void {
  localStorage.setItem('gymlog_week_start', dayIndex.toString());
}

export function getWeekStart(d: Date): Date {
  const r = new Date(d);
  const startDay = getWeekStartDay();
  const day = r.getDay();
  const diff = (day < startDay ? 7 : 0) + day - startDay;
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getDateRange(days: number): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = addDays(to, -days);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function relativeDateLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  const yesterday = addDays(new Date(), -1);
  if (toDateKey(d) === toDateKey(yesterday)) return 'Yesterday';
  return formatDateShort(d);
}
