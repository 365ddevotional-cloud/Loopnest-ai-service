import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
import request from 'supertest';
import pilot from './content-translations/2026-11-19-glorious-light.json';
import { validateTranslationBatch, sourceHash, registerContentTranslationReview } from './content-translation-review';

test('pilot includes five private complete drafts tied to the exact English source', () => {
  const batch = validateTranslationBatch(pilot);
  assert.deepEqual(batch.drafts.map(d => d.language).sort(), ['es', 'fr', 'ha', 'pcm', 'yo']);
  assert.equal(sourceHash(batch.source), batch.sourceHash);
  assert.equal(batch.source.scriptureReference, 'John 8:12');
  for (const draft of batch.drafts) {
    assert.equal(draft.status, 'draft');
    assert.equal(draft.languageReview, 'pending');
    assert.equal(draft.ministryReview, 'pending');
    assert.equal(draft.prayerPoints.length, 7);
    assert.equal(draft.faithDeclarations.length, 4);
    assert.ok(draft.content.includes('3:19–21'), 'preserve the internal Scripture reference');
    assert.ok(draft.christianQuotes?.endsWith('— Moses Afolabi'));
  }
});

test('validation rejects source drift, omitted content, duplicate languages and pretend approvals', () => {
  for (const mutate of [
    (b: any) => { b.source.content += ' Later edit.'; },
    (b: any) => { b.drafts[0].prayerPoints.pop(); },
    (b: any) => { b.drafts[0].faithDeclarations.pop(); },
    (b: any) => { b.drafts[0].content = 'One paragraph'; },
    (b: any) => { b.drafts[0].christianQuotes = null; },
    (b: any) => { b.drafts[0].language = 'en'; },
    (b: any) => { b.drafts[0].language = b.drafts[1].language; },
    (b: any) => { b.drafts[0].status = 'published'; },
    (b: any) => { b.drafts[0].languageReview = 'approved'; },
    (b: any) => { b.drafts[0].scriptureTextTranslated = 'Not allowed'; },
  ]) {
    const bad = structuredClone(pilot); mutate(bad);
    assert.throws(() => validateTranslationBatch(bad));
  }
});

test('hash detects reordered prayers and edits to every source field', () => {
  for (const field of ['id', 'date', 'title', 'scriptureReference', 'scriptureText', 'content', 'prayerPoints', 'faithDeclarations', 'christianQuotes', 'propheticDeclaration', 'author'] as const) {
    const changed: any = structuredClone(pilot.source);
    changed[field] = Array.isArray(changed[field]) ? [...changed[field]].reverse() : `${changed[field]} changed`;
    assert.notEqual(sourceHash(changed), pilot.sourceHash, field);
  }
  const reordered = Object.fromEntries(Object.entries(pilot.source).reverse()) as any;
  assert.equal(sourceHash(reordered), pilot.sourceHash, 'object key order is irrelevant');
});

test('draft API requires admin before reading source and offers no public or write endpoint', async () => {
  const app = express(); let reads = 0;
  registerContentTranslationReview(app, {
    batches: [pilot],
    requireAdmin: (req, res, next) => req.headers['x-test-admin'] === 'yes' ? next() : void res.sendStatus(401),
    readSource: async () => { reads++; return pilot.source; },
  });
  const denied = await request(app).get('/api/admin/content-translations').expect(401);
  assert.equal(denied.headers['cache-control'], 'no-store'); assert.equal(reads, 0);
  assert.ok(!denied.text.includes(pilot.drafts[0].content));
  const allowed = await request(app).get('/api/admin/content-translations').set('x-test-admin', 'yes').expect(200);
  assert.equal(allowed.headers['cache-control'], 'no-store');
  assert.equal(allowed.body[0].sourceMatches, true);
  assert.equal(allowed.body[0].publicAvailability, 'not-published');
  assert.equal(allowed.body[0].drafts.length, 5); assert.equal(reads, 1);
  await request(app).post('/api/admin/content-translations').set('x-test-admin', 'yes').expect(404);
  await request(app).get('/api/content-translations').expect(404);
  await request(app).get('/content-translations/2026-11-19-glorious-light.json').expect(404);
});

test('review flags edited, missing and deleted originals and fails closed on storage errors', async () => {
  let current: any = pilot.source;
  const app = express();
  registerContentTranslationReview(app, { requireAdmin: (_req, _res, next) => next(), batches: [pilot], readSource: async () => {
    if (current === 'error') throw new Error('private database diagnostic');
    return current;
  } });
  for (const source of [{ ...pilot.source, title: 'Edited original' }, undefined, { ...pilot.source, isDeleted: true }]) {
    current = source;
    const response = await request(app).get('/api/admin/content-translations').expect(200);
    assert.equal(response.body[0].sourceMatches, false);
    assert.equal(response.body[0].publicAvailability, 'not-published');
  }
  current = 'error';
  const error = await request(app).get('/api/admin/content-translations').expect(503);
  assert.ok(!error.text.includes('private database diagnostic'));
});

test('review has no provider, public-reader import or write capability', () => {
  const service = readFileSync('server/content-translation-review.ts', 'utf8');
  assert.doesNotMatch(service, /from ['"].*(?:openai|translationService|\/db)['"]|\bfetch\s*\(|\bdb\.(insert|update|delete)\s*\(|app\.(post|put|patch|delete)\s*\(/);
  const reader = readFileSync('server/translationService.ts', 'utf8');
  assert.doesNotMatch(reader, /content-translations|content-translation-review|\bfetch\s*\(|openai/i);
  const client = readFileSync('client/src/components/ContentTranslationReview.tsx', 'utf8');
  assert.doesNotMatch(client, /dangerouslySetInnerHTML|server\/content-translations/);
});
