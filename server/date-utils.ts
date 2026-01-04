const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";

export function getTodayDateString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function isFutureDate(dateString: string): boolean {
  const today = getTodayDateString();
  return dateString > today;
}
