export type TranslationDraftLanguage = 'es' | 'fr' | 'yo' | 'pcm' | 'ha' | 'ig';
export interface TranslationText {
  title: string;
  content: string;
  prayerPoints: string[];
  faithDeclarations: string[];
  christianQuotes: string | null;
  propheticDeclaration: string | null;
}
export interface TranslationSource extends TranslationText {
  id: number;
  date: string;
  scriptureReference: string;
  scriptureText: string;
  author: string | null;
}
export interface ContentTranslationDraft extends TranslationText {
  language: TranslationDraftLanguage;
  status: 'draft';
  languageReview: 'pending';
  ministryReview: 'pending';
}
export interface ContentTranslationReview {
  batchId: string;
  preparedOn: string;
  source: TranslationSource;
  sourceHash: string;
  sourceMatches: boolean;
  sourceAvailable: boolean;
  publicAvailability: 'not-published' | 'published' | 'source-changed';
  publicationApproval?: TranslationPublicationApproval;
  drafts: ContentTranslationDraft[];
}
export interface TranslationPublicationApproval {
  approvedBy: string;
  approvedOn: string;
  independentLanguageReview: 'not-recorded';
}

