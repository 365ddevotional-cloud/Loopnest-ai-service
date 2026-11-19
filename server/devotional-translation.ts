import { isAllowedLanguage } from './saved-translation-reader';
import type { TranslationSource } from '../shared/content-translation-review';
import type { ApprovedTranslationDecision } from './approved-content-translations';

export function overlaySavedTranslation(devotional: any, translation: any, lang: string) {
  return {
    ...devotional,
    title: translation._translatedTitle ?? devotional.title,
    content: translation.devotionalMessage,
    prayerPoints: translation.prayerPoints,
    faithDeclarations: translation.faithDeclarations,
    christianQuotes: translation.christianQuotes ?? devotional.christianQuotes,
    propheticDeclaration: translation.propheticDeclaration ?? devotional.propheticDeclaration,
    scriptureText: translation.scriptureTextTranslated ?? devotional.scriptureText,
    _translatedTo: lang,
    ...(translation._translationApproval === 'ministry-approved' ? {
      _translationApproval: translation._translationApproval,
      _translationApprovedOn: translation._translationApprovedOn,
      _translationSourceHash: translation._translationSourceHash,
    } : {}),
  };
}

export function createDevotionalTranslator(deps: {
  resolveApproved: (source: TranslationSource, lang: string) => ApprovedTranslationDecision;
  readLegacy: (source: { id: number }, lang: string) => Promise<any>;
  readLegacyList: (lang: string) => Promise<Array<any>>;
}) {
  const allowed = (lang: string | undefined): lang is string => !!lang && lang !== 'en' && isAllowedLanguage(lang);
  return {
    async applyTranslation(source: any, lang: string | undefined) {
      if (!allowed(lang)) return source;
      try {
        const decision = deps.resolveApproved(source, lang);
        if (decision.covered) return decision.translation ? overlaySavedTranslation(source, decision.translation, lang) : source;
        const legacy = await deps.readLegacy(source, lang);
        return legacy ? overlaySavedTranslation(source, legacy, lang) : source;
      } catch { return source; }
    },
    async applyTranslationToList(sources: any[], lang: string | undefined) {
      if (!allowed(lang)) return sources;
      // Approved saved text remains available even if the legacy cache is unavailable.
      const decisions = sources.map(source => {
        try { return deps.resolveApproved(source, lang); }
        catch { return { covered: true, translation: null }; }
      });
      const rows = decisions.some(d => !d.covered) ? await deps.readLegacyList(lang).catch(() => []) : [];
      const legacy = new Map(rows.map(t => [t.devotionalId, t]));
      return sources.map((source, i) => {
        const decision = decisions[i];
        const translation = decision.covered ? decision.translation : legacy.get(source.id);
        return translation ? overlaySavedTranslation(source, translation, lang) : source;
      });
    },
  };
}
