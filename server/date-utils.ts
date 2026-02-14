const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";

export function getTodayDateString(): string {
  const now = new Date(Date.now());

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isFutureDate(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString > today;
}

export function isPastDate(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString < today;
}

export function isTodayOrFuture(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString >= today;
}

export function getDayOfYear(dateString: string): number {
  const d = new Date(dateString + "T00:00:00");
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
