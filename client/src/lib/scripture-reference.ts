import { BIBLE_BOOKS } from "./bible-data";
export function parseScriptureReferences(input: string) {
    const cleaned = input.replace(/\((?:KJV|WEB|ASV|DRB)\)/gi, "").replace(/[–—]/g, "-");
    const parts = cleaned.split(/;\s*/);
    const result: {
        bookId: string;
        chapter: number;
        start?: number;
        end?: number;
        reference: string;
    }[] = [];
    for (const part of parts) {
        const m = part.trim().match(/^(.*?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
        if (!m)
            return [];
        const name = m[1].toLowerCase().replace(/\s+/g, " ").replace(/^psalm$/, "psalms");
        const book = BIBLE_BOOKS.find(b => b.id === name);
        const chapter = Number(m[2]);
        const start = m[3] ? Number(m[3]) : undefined, end = m[4] ? Number(m[4]) : start;
        if (!book || chapter < 1 || chapter > book.chapters || start === 0 || (end && start && end < start) || (end ?? 0) > 176)
            return [];
        result.push({ bookId: book.id, chapter, start, end, reference: `${book.name} ${chapter}${start ? `:${start}${end !== start ? `-${end}` : ""}` : ""}` });
    }
    return result.slice(0, 12);
}
export function findScriptureReferences(input: string) {
    const names = BIBLE_BOOKS.map(b => b.name).concat("Psalm").sort((a, b) => b.length - a.length).join("|");
    return Array.from(new Set(input.match(new RegExp(`\\b(?:${names})\\s+\\d+:\\d+(?:[-–]\\d+)?`, "gi")) ?? [])).slice(0, 24);
}
