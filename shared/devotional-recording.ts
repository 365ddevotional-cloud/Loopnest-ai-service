// Keep this identical on the server and client. A recording belongs to this
// exact text, language and devotional, never merely a title or a calendar day.
export interface RecordingText {
  id: number; date: string; title: string; scriptureText: string; scriptureReference: string;
  content: string; prayerPoints: string[]; faithDeclarations?: string[] | null;
  christianQuotes?: string | null; propheticDeclaration?: string | null;
}
export function devotionalRecordingScript(d: RecordingText) {
  return [d.title, d.scriptureText.replace(/\[\/?(?:DIVINE|red)\]/gi, ''), d.scriptureReference, d.content,
    ...d.prayerPoints, ...(d.faithDeclarations || []), d.christianQuotes, d.propheticDeclaration]
    .filter(Boolean).join('\n\n');
}
export function devotionalRecordingSnapshot(d: RecordingText, language: string) {
  return JSON.stringify({version: 1, id: d.id, date: d.date, language, script: devotionalRecordingScript(d)});
}
