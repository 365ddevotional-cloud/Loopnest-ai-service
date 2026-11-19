import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScriptureReferences, findScriptureReferences } from './scripture-reference';
import { fetchChapter } from './bible-data';
test('stable references preserve chapter, numbered books, verse ranges and embedded teaching', () => {
    assert.deepEqual(parseScriptureReferences('John 3:16 (KJV)')[0], { bookId: 'john', chapter: 3, start: 16, end: 16, reference: 'John 3:16' });
    assert.equal(parseScriptureReferences('Ephesians 2:8–10')[0].end, 10);
    assert.equal(parseScriptureReferences('Psalm 23:1')[0].bookId, 'psalms');
    assert.equal(parseScriptureReferences('1 John 4:7; Romans 8:1').length, 2);
    assert.deepEqual(parseScriptureReferences('John 99:1'), []);
    assert.deepEqual(parseScriptureReferences('John 3:20-10'), []);
    assert.deepEqual(findScriptureReferences('Memory verse Romans 8:1 (KJV). Question: Read Ephesians 2:8–10. Romans 8:1'), ['Romans 8:1', 'Ephesians 2:8–10']);
});
test('translation chapter cache deduplicates requests and labels safe KJV fallback', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
    const saved = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (k: string) => saved.get(k) || null, setItem: (k: string, v: string) => saved.set(k, v) }, configurable: true });
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async (input) => { requests++; const u = String(input); if (u.includes('/asv/'))
        return new Response('', { status: 503 }); return Response.json({ verses: [{ verse: 16, text: u.includes('/web/') ? 'For God so loved the world,' : 'For God so loved the world,' }] }); };
    try {
        const [a, b] = await Promise.all([fetchChapter('john', 3, 'WEB'), fetchChapter('john', 3, 'WEB')]);
        assert.equal(a?.actualTranslation, 'WEB');
        assert.deepEqual(a, b);
        assert.equal(requests, 1);
        await fetchChapter('john', 3, 'WEB');
        assert.equal(requests, 1);
        const fallback = await fetchChapter('john', 3, 'ASV');
        assert.equal(fallback?.actualTranslation, 'KJV');
        assert.equal(fallback?.isFallback, true);
        assert.equal(requests, 3);
        Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
        const offline = await fetchChapter('john', 3, 'WEB');
        assert.equal(offline?.actualTranslation, 'WEB');
        assert.equal(requests, 3);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
