export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getDevotionalStatus(dateString: string): "past" | "today" | "future" {
  const today = getLocalDateString();
  if (dateString === today) return "today";
  if (dateString < today) return "past";
  return "future";
}
