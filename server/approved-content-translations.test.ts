import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import pilot from './content-translations/2026-11-19-glorious-light.json';
import approval from './content-translations/2026-11-19-glorious-light.approval.json';
import igbo from './content-translations/2026-11-19-glorious-light-igbo.json';
import { createApprovedContentRelease, translationBatchHash } from './approved-content-translations';
import { createDevotionalTranslator } from './devotional-translation';
import { registerContentTranslationReview } from './content-translation-review';

const release = createApprovedContentRelease(pilot, approval);
test('existing approval cannot authorize the new private Igbo batch', () => {
  assert.throws(() => createApprovedContentRelease(igbo, approval));
  assert.throws(() => createApprovedContentRelease(igbo, { ...approval,
    batchId: igbo.batchId, translationHash: translationBatchHash(igbo) }));
  assert.equal(release.forBatch(igbo.batchId, igbo.sourceHash), undefined);
});
test('owner approval binds all five exact translations without inventing independent review', () => {
  assert.equal(translationBatchHash(pilot), approval.translationHash);
  for (const draft of pilot.drafts) {
    const decision = release.resolve(pilot.source, draft.language);
    assert.equal(decision.covered, true);
    assert.equal(decision.translation?._translatedTitle, draft.title);
    assert.equal(decision.translation?.devotionalMessage, draft.content);
    assert.equal(decision.translation?._translationApproval, 'ministry-approved');
    assert.equal(decision.translation?._translationSourceHash, pilot.sourceHash);
  }
  const status = release.forBatch(pilot.batchId, pilot.sourceHash)!;
  assert.equal(status.approvedBy, 'Moses Afolabi');
  assert.equal(status.independentLanguageReview, 'not-recorded');
  assert.equal(release.forBatch(pilot.batchId, 'different-hash'), undefined);
});

test('an approval cannot silently cover edited translations, sources or languages', () => {
  const edited = structuredClone(pilot); edited.drafts[0].title += ' Edited';
  assert.throws(() => createApprovedContentRelease(edited, approval));
  for (const change of [
    { translationHash: '0'.repeat(64) }, { sourceHash: '0'.repeat(64) },
    { batchId: 'unapproved-batch' }, { languages: ['es', 'fr', 'yo', 'pcm', 'pcm'] },
    { status: 'draft' }, { independentLanguageReview: 'certified' },
  ]) assert.throws(() => createApprovedContentRelease(pilot, { ...approval, ...change }));
});

test('today, dated and archive responses deliver saved translations and unchanged Scripture', async () => {
  let reads = 0;
  const translate = createDevotionalTranslator({ resolveApproved: release.resolve,
    readLegacy: async () => { reads++; throw new Error('must not need legacy cache'); },
    readLegacyList: async () => { reads++; throw new Error('must not need legacy cache'); },
  });
  const app = express();
  app.get('/api/devotionals/today', async (req, res) => res.json(await translate.applyTranslation(pilot.source, String(req.query.lang || 'en'))));
  app.get('/api/devotionals/date/:date', async (req, res) => res.json(await translate.applyTranslation(pilot.source, String(req.query.lang || 'en'))));
  app.get('/api/devotionals', async (req, res) => res.json(await translate.applyTranslationToList([pilot.source], String(req.query.lang || 'en'))));
  for (const draft of pilot.drafts) {
    for (const route of ['/api/devotionals/today', '/api/devotionals/date/2026-11-19', '/api/devotionals']) {
      const response = await request(app).get(route).query({ lang: draft.language }).expect(200);
      const item = Array.isArray(response.body) ? response.body[0] : response.body;
      assert.equal(item.title, draft.title); assert.equal(item.content, draft.content);
      assert.equal(item.scriptureText, pilot.source.scriptureText);
      assert.equal(item.scriptureReference, pilot.source.scriptureReference);
      assert.equal(item.author, pilot.source.author);
      assert.equal(item._translatedTo, draft.language);
      assert.equal(item._translationApproval, 'ministry-approved');
      assert.deepEqual(item.prayerPoints, draft.prayerPoints);
      assert.deepEqual(item.faithDeclarations, draft.faithDeclarations);
    }
  }
  assert.equal(reads, 0);
  for (const lang of ['en', 'xx', '__proto__', 'constructor', undefined]) {
    assert.deepEqual(await translate.applyTranslation(pilot.source, lang), pilot.source);
    assert.deepEqual(await translate.applyTranslationToList([pilot.source], lang), [pilot.source]);
  }
});

test('source changes suppress stale legacy rows; unrelated cached translations are preserved', async () => {
  const other = { ...pilot.source, id: 999, title: 'Other devotional' };
  const old = { devotionalId: 318, devotionalMessage: 'Outdated old translation', prayerPoints: [], faithDeclarations: [] };
  const existing = { ...old, devotionalId: 999, devotionalMessage: 'Existing saved teaching' };
  let singleReads = 0;
  const translate = createDevotionalTranslator({ resolveApproved: release.resolve,
    readLegacy: async () => { singleReads++; return existing; },
    readLegacyList: async () => [old, existing],
  });
  const changed = { ...pilot.source, content: pilot.source.content + '\n\nNew source paragraph.' };
  assert.deepEqual(await translate.applyTranslation(changed, 'fr'), changed);
  assert.equal(singleReads, 0);
  const list = await translate.applyTranslationToList([changed, other], 'fr');
  assert.deepEqual(list[0], changed); assert.equal(list[1].content, 'Existing saved teaching');
  assert.equal(list[1]._translationApproval, undefined);
  assert.equal((await translate.applyTranslation(other, 'fr')).content, 'Existing saved teaching');
  assert.equal(singleReads, 1);
  const deleted = { ...pilot.source, isDeleted: true };
  assert.deepEqual(await translate.applyTranslation(deleted, 'ha'), deleted);
});

test('approved text survives legacy cache failure and repeated concurrent reads require no generation', async () => {
  const translate = createDevotionalTranslator({ resolveApproved: release.resolve,
    readLegacy: async () => { throw new Error('legacy unavailable'); },
    readLegacyList: async () => { throw new Error('legacy unavailable'); },
  });
  const results = await Promise.all(Array.from({ length: 40 }, (_, i) => translate.applyTranslation(pilot.source, pilot.drafts[i % 5].language)));
  assert.ok(results.every(item => item._translationApproval === 'ministry-approved'));
  const other = { ...pilot.source, id: 999 };
  const archive = await translate.applyTranslationToList([pilot.source, other], 'yo');
  assert.equal(archive[0].title, pilot.drafts.find(d => d.language === 'yo')!.title); assert.deepEqual(archive[1], other);
  assert.deepEqual(await translate.applyTranslation(other, 'es'), other);
});

test('admin release status reports publication and holds edited sources without altering approval', async () => {
  let current = pilot.source;
  const app = express();
  registerContentTranslationReview(app, { requireAdmin: (_req, _res, next) => next(), batches: [pilot],
    readSource: async () => current, publicationApproval: release.forBatch });
  const published = await request(app).get('/api/admin/content-translations').expect(200);
  assert.equal(published.body[0].publicAvailability, 'published');
  assert.equal(published.body[0].publicationApproval.independentLanguageReview, 'not-recorded');
  current = { ...pilot.source, title: 'Updated title' };
  const held = await request(app).get('/api/admin/content-translations').expect(200);
  assert.equal(held.body[0].publicAvailability, 'source-changed');
  assert.equal(held.body[0].publicationApproval.approvedBy, 'Moses Afolabi');
});

