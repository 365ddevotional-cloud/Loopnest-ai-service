import type { BibleTranslation } from "@shared/schema";

export interface VerseKey {
  bookId: string;
  chapter: number;
  verse: number;
}

export interface Bookmark extends VerseKey {
  translation: BibleTranslation;
  text: string;
  createdAt: string;
}

export type HighlightColor = "yellow" | "blue" | "green" | "pink";

export interface Highlight extends VerseKey {
  color: HighlightColor;
  createdAt: string;
}

export interface VerseNote extends VerseKey {
  note: string;
  updatedAt: string;
}

const BOOKMARKS_KEY = "bible-bookmarks";
const HIGHLIGHTS_KEY = "bible-highlights";
const NOTES_KEY = "bible-notes";

function getVerseKeyString(key: VerseKey): string {
  return `${key.bookId}:${key.chapter}:${key.verse}`;
}

export function parseVerseKeyString(keyString: string): VerseKey | null {
  const parts = keyString.split(":");
  if (parts.length !== 3) return null;
  return {
    bookId: parts[0],
    chapter: parseInt(parts[1], 10),
    verse: parseInt(parts[2], 10),
  };
}

export function getBookmarks(): Bookmark[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveBookmark(bookmark: Bookmark): void {
  const bookmarks = getBookmarks();
  const key = getVerseKeyString(bookmark);
  const exists = bookmarks.findIndex(b => getVerseKeyString(b) === key);
  if (exists >= 0) {
    bookmarks[exists] = bookmark;
  } else {
    bookmarks.push(bookmark);
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(key: VerseKey): void {
  const bookmarks = getBookmarks();
  const keyString = getVerseKeyString(key);
  const filtered = bookmarks.filter(b => getVerseKeyString(b) !== keyString);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filtered));
}

export function isBookmarked(key: VerseKey): boolean {
  const bookmarks = getBookmarks();
  const keyString = getVerseKeyString(key);
  return bookmarks.some(b => getVerseKeyString(b) === keyString);
}

export function getHighlights(): Highlight[] {
  try {
    const stored = localStorage.getItem(HIGHLIGHTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveHighlight(highlight: Highlight): void {
  const highlights = getHighlights();
  const key = getVerseKeyString(highlight);
  const exists = highlights.findIndex(h => getVerseKeyString(h) === key);
  if (exists >= 0) {
    highlights[exists] = highlight;
  } else {
    highlights.push(highlight);
  }
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
}

export function removeHighlight(key: VerseKey): void {
  const highlights = getHighlights();
  const keyString = getVerseKeyString(key);
  const filtered = highlights.filter(h => getVerseKeyString(h) !== keyString);
  localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(filtered));
}

export function getHighlight(key: VerseKey): Highlight | undefined {
  const highlights = getHighlights();
  const keyString = getVerseKeyString(key);
  return highlights.find(h => getVerseKeyString(h) === keyString);
}

export function getNotes(): VerseNote[] {
  try {
    const stored = localStorage.getItem(NOTES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveNote(note: VerseNote): void {
  const notes = getNotes();
  const key = getVerseKeyString(note);
  const exists = notes.findIndex(n => getVerseKeyString(n) === key);
  if (exists >= 0) {
    notes[exists] = note;
  } else {
    notes.push(note);
  }
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function removeNote(key: VerseKey): void {
  const notes = getNotes();
  const keyString = getVerseKeyString(key);
  const filtered = notes.filter(n => getVerseKeyString(n) !== keyString);
  localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
}

export function getNote(key: VerseKey): VerseNote | undefined {
  const notes = getNotes();
  const keyString = getVerseKeyString(key);
  return notes.find(n => getVerseKeyString(n) === keyString);
}

export function getBookmarksGroupedByBook(): Map<string, Map<number, Bookmark[]>> {
  const bookmarks = getBookmarks();
  const grouped = new Map<string, Map<number, Bookmark[]>>();
  
  for (const bookmark of bookmarks) {
    if (!grouped.has(bookmark.bookId)) {
      grouped.set(bookmark.bookId, new Map());
    }
    const bookMap = grouped.get(bookmark.bookId)!;
    if (!bookMap.has(bookmark.chapter)) {
      bookMap.set(bookmark.chapter, []);
    }
    bookMap.get(bookmark.chapter)!.push(bookmark);
  }
  
  grouped.forEach(bookMap => {
    bookMap.forEach(verses => {
      verses.sort((a, b) => a.verse - b.verse);
    });
  });
  
  return grouped;
}
