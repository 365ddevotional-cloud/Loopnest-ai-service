import {useI18n} from '@/hooks/useI18n';
export function ContentLanguageNotice({translatedTo}:{translatedTo?:string}) {
 const {t,lang}=useI18n();
 if(lang==='en')return null;
 return <p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" data-testid="content-language-notice">{translatedTo===lang?t('ui_savedTranslation'):t('ui_originalContent')}</p>;
}
