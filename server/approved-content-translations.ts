import { createHash } from 'node:crypto';
import { z } from 'zod';
import { sourceHash, validateTranslationBatch } from './content-translation-batch';
import type { TranslationPublicationApproval, TranslationSource } from '../shared/content-translation-review';

const approvalSchema = z.object({
  version: z.literal(1), batchId: z.string(), sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  translationHash: z.string().regex(/^[a-f0-9]{64}$/),
  languages: z.array(z.enum(['es', 'fr', 'yo', 'pcm', 'ha', 'ig'])).min(1).max(6),
  status: z.literal('approved-for-publication'), approvedBy: z.string().min(1),
  approvedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  approvalSource: z.enum(['User instruction: Approved all translations', 'User instruction: approved']),
  independentLanguageReview: z.literal('not-recorded'),
}).strict();

// Approvals cover the exact translated text as well as its English source.
// Editing either invalidates the release. The original draft snapshot stays intact.
export function translationBatchHash(value: unknown) {
  const batch = validateTranslationBatch(value);
  return createHash('sha256').update(JSON.stringify({
    batchId: batch.batchId, sourceHash: batch.sourceHash,
    translations: batch.drafts.map(d => ({
      language: d.language, title: d.title, content: d.content,
      prayerPoints: d.prayerPoints, faithDeclarations: d.faithDeclarations,
      christianQuotes: d.christianQuotes, propheticDeclaration: d.propheticDeclaration,
    })),
  })).digest('hex');
}

export interface SavedApprovedTranslation {
  _translatedTitle: string;
  devotionalMessage: string;
  prayerPoints: string[];
  faithDeclarations: string[];
  christianQuotes: string | null;
  propheticDeclaration: string | null;
  _translationApproval: 'ministry-approved';
  _translationApprovedOn: string;
  _translationSourceHash: string;
}
export type ApprovedTranslationDecision = { covered: boolean; translation: SavedApprovedTranslation | null };

export function createApprovedContentRelease(batchInput: unknown, approvalInput: unknown) {
  const batch = validateTranslationBatch(batchInput);
  const approval = approvalSchema.parse(approvalInput);
  const approvedLanguages = new Set<string>(approval.languages);
  if (approval.batchId !== batch.batchId || approval.sourceHash !== batch.sourceHash ||
      approval.translationHash !== translationBatchHash(batch) ||
      approvedLanguages.size !== approval.languages.length || batch.drafts.length !== approvedLanguages.size ||
      !batch.drafts.every(d => approvedLanguages.has(d.language))) throw new Error('Approval does not match the saved translations');
  const publicationApproval: TranslationPublicationApproval = {
    approvedBy: approval.approvedBy, approvedOn: approval.approvedOn,
    independentLanguageReview: approval.independentLanguageReview,
  };
  return {
    forBatch(batchId: string, hash: string) {
      return batchId === batch.batchId && hash === batch.sourceHash ? publicationApproval : undefined;
    },
    resolve(source: TranslationSource & { isDeleted?: boolean | null }, lang: string): ApprovedTranslationDecision {
      const draft = batch.drafts.find(d => d.language === lang);
      if (source.id !== batch.source.id || !draft) return { covered: false, translation: null };
      // A covered but edited/deleted original must return English, never an older cache row.
      if (source.isDeleted || sourceHash(source) !== batch.sourceHash) return { covered: true, translation: null };
      return { covered: true, translation: {
        _translatedTitle: draft.title, devotionalMessage: draft.content,
        prayerPoints: draft.prayerPoints, faithDeclarations: draft.faithDeclarations,
        christianQuotes: draft.christianQuotes, propheticDeclaration: draft.propheticDeclaration,
        _translationApproval: 'ministry-approved', _translationApprovedOn: approval.approvedOn,
        _translationSourceHash: approval.sourceHash,
      } };
    },
  };
}

