import type { Express, RequestHandler } from 'express';
import type { ContentTranslationReview, TranslationSource, TranslationPublicationApproval } from '../shared/content-translation-review';
import { validateTranslationBatch, sourceHash } from './content-translation-batch';
export { validateTranslationBatch, sourceHash } from './content-translation-batch';

// The review route is read-only. There is deliberately no publish endpoint,
// translation-provider client, database write, or public draft route.
export function registerContentTranslationReview(app: Express, deps: {
  requireAdmin: RequestHandler;
  batches: unknown[];
  publicationApproval?: (batchId: string, sourceHash: string) => TranslationPublicationApproval | undefined;
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
        const matches = available && sourceHash(current!) === batch.sourceHash;
        const publicationApproval = deps.publicationApproval?.(batch.batchId, batch.sourceHash);
        return {
          batchId: batch.batchId, preparedOn: batch.preparedOn,
          source: batch.source, sourceHash: batch.sourceHash,
          sourceAvailable: available,
          sourceMatches: matches,
          publicAvailability: publicationApproval ? (matches ? 'published' : 'source-changed') : 'not-published',
          publicationApproval, drafts: batch.drafts,
        };
      }));
      res.json(reviews);
    } catch {
      res.status(503).json({ message: 'Translation review is temporarily unavailable. No publication status was changed.' });
    }
  });
}
