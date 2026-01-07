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
