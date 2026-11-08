import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Megaphone, X } from "lucide-react";

export type MinistryAnnouncement = {
  id: number; title: string; description: string; category: string;
  destinationUrl: string; buttonLabel: string;
};
function useAnnouncements() {
  return useQuery<MinistryAnnouncement[]>({
    queryKey: ["/api/ministry-announcements"],
    queryFn: async () => {
      const response = await fetch("/api/ministry-announcements");
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 5 * 60_000,
  });
}
export function MinistryDiscoveryCard() {
  const { data = [] } = useAnnouncements();
  const [dismissed, setDismissed] = useState(false);
  const current = dismissed ? undefined : data[0];
  if (!current) return null;
  return <section aria-label="Ministry discovery" className="rounded-2xl border border-orange-400/30 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-5 text-white shadow-sm">
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-bold tracking-wider text-orange-300 flex items-center gap-2"><Megaphone size={16}/> DISCOVER MORE FROM 365</span>
      <button aria-label="Dismiss announcement" onClick={() => setDismissed(true)} className="rounded-md p-1 hover:bg-white/10"><X size={18}/></button>
    </div>
    <h2 className="mt-3 text-xl font-bold">{current.title}</h2>
    <p className="mt-2 text-sm text-slate-200">{current.description}</p>
    <Link href={current.destinationUrl}><Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"><BookOpen size={16} className="mr-2"/>{current.buttonLabel}</Button></Link>
  </section>;
}
export function WhatsNewSection({ title = "What's New in 365" }: { title?: string } = {}) {
  const { data = [] } = useAnnouncements();
  if (!data.length) return null;
  return <section aria-label={title} className="space-y-3">
    <h2 className="font-serif text-xl font-bold text-foreground">{title}</h2>
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map(item => <Link key={item.id} href={item.destinationUrl}>
        <article className="h-full rounded-xl border bg-card p-4 hover:border-orange-400/60 transition-colors">
          <p className="text-xs uppercase font-semibold text-orange-600">{item.category.replaceAll("_"," ")}</p>
          <h3 className="mt-1 font-semibold text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          <p className="mt-3 text-sm font-semibold text-primary">{item.buttonLabel}</p>
        </article>
      </Link>)}
    </div>
  </section>;
}
