import releases from "@shared/multilingual-releases.json";
import { translateAppText as tx } from "@/utils/i18n";

export function EnglishLyrics({ slug }: { slug: string }) {
  const release = releases.find(item => item.slug === slug);
  if (!release) return null;
  return (
    <details className="my-3 rounded-xl border border-teal-800/20 bg-teal-50/50 p-4 dark:bg-teal-950/20">
      <summary className="cursor-pointer font-semibold text-teal-900 dark:text-teal-200">{tx("English translation")}</summary>
      <div lang="en" className="mt-3 space-y-3 whitespace-pre-line text-sm leading-relaxed">
        {release.english.split("\n\n").map((stanza, index) => <p key={index}>{stanza}</p>)}
      </div>
    </details>
  );
}
