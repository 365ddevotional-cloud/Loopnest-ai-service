import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Express, RequestHandler } from 'express';
import type { ContentTranslationReview, TranslationSource } from '../shared/content-translation-review';

const text = z.string().trim().min(1).max(50000);
const translatedText = z.object({
  title: text, content: text,
  prayerPoints: z.array(text).min(1).max(50),
  faithDeclarations: z.array(text).min(1).max(50),
  christianQuotes: text.nullable(), propheticDeclaration: text.nullable(),
});
const sourceSchema = translatedText.extend({
  id: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scriptureReference: text, scriptureText: text, author: text.nullable(),
}).strict();
const draftSchema = translatedText.extend({
  language: z.enum(['es', 'fr', 'yo', 'pcm', 'ha']),
  status: z.literal('draft'), languageReview: z.literal('pending'), ministryReview: z.literal('pending'),
}).strict();
const batchSchema = z.object({
  version: z.literal(1), batchId: z.string().regex(/^[a-z0-9-]+$/),
  preparedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  generation: z.literal('assistant-draft-no-provider-call'),
  source: sourceSchema, sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  drafts: z.array(draftSchema).length(5),
}).strict();

// Fixed field order makes hashes reproducible across JSON serializers. Include
// every translated field plus Scripture, source date and author: edits invalidate review.
export function sourceSnapshot(source: TranslationSource): TranslationSource {
  return {
    id: source.id, date: source.date, title: source.title,
    scriptureReference: source.scriptureReference, scriptureText: source.scriptureText,
    content: source.content, prayerPoints: source.prayerPoints,
    faithDeclarations: source.faithDeclarations,
    christianQuotes: source.christianQuotes ?? null,
    propheticDeclaration: source.propheticDeclaration ?? null, author: source.author ?? null,
  };
}
export function sourceHash(source: TranslationSource) {
  return createHash('sha256').update(JSON.stringify(sourceSnapshot(source))).digest('hex');
}
const paragraphCount = (value: string) => value.split(/\n\s*\n/).filter(p => p.trim()).length;
export function validateTranslationBatch(value: unknown) {
  const batch = batchSchema.parse(value);
  if (sourceHash(batch.source) !== batch.sourceHash) throw new Error('Source hash mismatch');
  if (new Set(batch.drafts.map(d => d.language)).size !== 5) throw new Error('Duplicate or missing language');
  for (const draft of batch.drafts) {
    if (draft.content === batch.source.content) throw new Error('Untranslated draft');
    if (paragraphCount(draft.content) !== paragraphCount(batch.source.content)) throw new Error('Paragraph count mismatch');
    if (draft.prayerPoints.length !== batch.source.prayerPoints.length ||
        draft.faithDeclarations.length !== batch.source.faithDeclarations.length) throw new Error('List count mismatch');
    for (const field of ['christianQuotes', 'propheticDeclaration'] as const) {
      if ((draft[field] === null) !== (batch.source[field] === null)) throw new Error('Optional field mismatch');
    }
  }
  return batch;
}

// The review route is read-only. There is deliberately no publish endpoint,
// translation-provider client, database write, or public draft route.
export function registerContentTranslationReview(app: Express, deps: {
  requireAdmin: RequestHandler;
  batches: unknown[];
  readSource: (id: number) => Promise<(TranslationSource & { isDeleted?: boolean | null }) | undefined>;
}) {
  const batches = deps.batches.map(validateTranslationBatch);
  app.get('/api/admin/content-translations', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store'); next();
  }, deps.requireAdmin, async (_req, res) => {
    try {
      const reviews: ContentTranslationReview[] = await Promise.all(batches.map(async batch => {
        const current = await deps.readSource(batch.source.id);
        const available = !!current && !current.isDeleted;
        return {
          batchId: batch.batchId, preparedOn: batch.preparedOn,
          source: batch.source, sourceHash: batch.sourceHash,
          sourceAvailable: available,
          sourceMatches: available && sourceHash(current!) === batch.sourceHash,
          publicAvailability: 'not-published', drafts: batch.drafts,
        };
      }));
      res.json(reviews);
    } catch {
      res.status(503).json({ message: 'Translation review is temporarily unavailable. No drafts were published.' });
    }
  });
}
