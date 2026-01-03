import { format, parseISO } from "date-fns";
import { type DevotionalResponse } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DevotionalCardProps {
  devotional: DevotionalResponse;
}

export function DevotionalCard({ devotional }: DevotionalCardProps) {
  return (
    <article className="max-w-4xl mx-auto bg-white shadow-xl shadow-primary/5 rounded-none md:rounded-xl overflow-hidden border border-primary/10">
      {/* Header Section */}
      <div className="bg-primary/5 p-8 md:p-12 text-center border-b border-primary/10">
        <div className="inline-block px-4 py-1 mb-6 border border-primary/30 rounded-full text-xs font-bold text-primary tracking-widest uppercase bg-white/50 backdrop-blur-sm">
          {format(parseISO(devotional.date), "MMMM d, yyyy")}
        </div>
        
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
          {devotional.title}
        </h1>

        <div className="max-w-2xl mx-auto space-y-4">
          <p className="font-serif text-lg md:text-xl text-primary font-medium italic">
            "{devotional.scriptureText}"
          </p>
          <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">
            — {devotional.scriptureReference}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 md:p-12 space-y-8">
        <div className="prose prose-stone prose-lg max-w-none font-serif leading-relaxed text-foreground/90 first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px]">
          {devotional.content.split('\n').map((paragraph, idx) => (
            paragraph.trim() && <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <Separator className="bg-primary/20 my-8" />

        {/* Action Points Grid */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Prayer Points */}
          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
            <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-primary mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-sans">P</span>
              Prayer Points
            </h3>
            <ul className="space-y-3">
              {devotional.prayerPoints.map((point, idx) => (
                <li key={idx} className="flex gap-3 text-sm md:text-base leading-relaxed text-muted-foreground">
                  <span className="text-primary mt-1.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Faith Declarations */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border border-primary/10">
            <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-primary mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-sans">D</span>
              Prophetic Declaration
            </h3>
            <ul className="space-y-3">
              {devotional.faithDeclarations.map((decl, idx) => (
                <li key={idx} className="flex gap-3 text-sm md:text-base leading-relaxed font-medium text-foreground/80 italic">
                  <span className="text-primary mt-1.5">Are saying:</span>
                  <span>"{decl}"</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center pt-8 text-sm text-muted-foreground font-medium tracking-wide">
          Author: {devotional.author}
        </div>
      </div>
    </article>
  );
}
