import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/hooks/useI18n";

const copy = {
  en: ["Try a translation", "Choose a language to read. Tap Listen to hear it where audio is available. We’re improving the wording and pronunciation, and we welcome corrections.", "When you listen while signed in, administrators can see your account and the language you played. Guest plays are counted together."],
  pcm: ["Try another language", "Choose the language wey you wan read. Tap Listen to hear am if audio dey. We dey improve the words and pronunciation. Tell us if anything need correction.", "If you sign in and listen, admins fit see your account and the language wey you play. We count guest plays together."],
  yo: ["Gbìyànjú ìtumọ̀ kan", "Yan èdè tí o fẹ́ kà. Tẹ Gbọ́ láti fetí sí i níbi tí ohùn bá wà. A ń mú ọ̀rọ̀ àti bí a ṣe ń pè é sunwọ̀n sí i. A gba àtúnṣe.", "Bí o bá wọlé kí o sì fetí sí i, àwọn alábòójútó lè rí àkọọ́lẹ̀ rẹ àti èdè tí o gbọ́. A ka ìgbọ́ àwọn àlejò pọ̀."],
  ha: ["Gwada fassara", "Zaɓi harshen da kake son karantawa. Danna Saurara idan akwai sauti. Muna inganta kalmomi da lafazi, kuma muna maraba da gyara.", "Idan ka shiga asusunka ka saurara, masu gudanarwa za su iya ganin asusunka da harshen da ka saurara. Muna ƙirga sauraron baƙi tare."],
  ig: ["Nwalee ntụgharị asụsụ", "Họrọ asụsụ ị chọrọ ịgụ. Pịa Gee ntị ma ọ bụrụ na e nwere olu. Anyị na-emezi okwu na mkpọpụta ha. Anyị na-anabata mmezi.", "Ọ bụrụ na ị banye na akaụntụ gị gee ntị, ndị nlekọta nwere ike ịhụ akaụntụ gị na asụsụ ị gere. Anyị na-agụkọ oge ndị ọbịa gere ntị."],
  es: ["Prueba una traducción", "Elige un idioma para leer. Pulsa Escuchar cuando haya audio. Estamos mejorando el texto y la pronunciación. Agradecemos tus correcciones.", "Si escuchas con tu sesión iniciada, los administradores pueden ver tu cuenta y el idioma que escuchaste. Las reproducciones de invitados se cuentan juntas."],
  fr: ["Essayez une traduction", "Choisissez votre langue de lecture. Appuyez sur Écouter si un enregistrement est disponible. Nous améliorons le texte et la prononciation. Vos corrections sont les bienvenues.", "Si vous écoutez en étant connecté, les administrateurs peuvent voir votre compte et la langue écoutée. Les écoutes des visiteurs sont comptées ensemble."],
};
export function ReadingLanguageNotice() {
  const {lang} = useI18n();
  const [title, invitation, privacy] = copy[lang] ?? copy.en;
  return <aside className="rounded-lg border bg-card px-4 py-3 text-sm">
    <div className="flex items-center justify-between gap-2"><strong>{title}</strong><LanguageSwitcher /></div>
    <p className="text-xs font-medium">Yorùbá · Hausa · Igbo · Naijá Pidgin · English · Español · Français</p><p>{invitation}</p><p className="mt-1 text-xs text-muted-foreground">{privacy}</p>
  </aside>;
}
