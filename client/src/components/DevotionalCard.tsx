import { format, parseISO } from "date-fns";
import { type DevotionalResponse } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DevotionalCardProps {
  devotional: DevotionalResponse;
}

export function DevotionalCard({ devotional }: DevotionalCardProps) {
  return (
    <article className="max-w-4xl mx-auto bg-card shadow-xl shadow-primary/10 rounded-none md:rounded-xl overflow-hidden border border-card-border">
      {/* Header Section with gradient */}
      <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-8 md:p-12 text-center border-b border-primary/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%237C3A2A%22%20fill-opacity%3D%220.03%22%2F%3E%3C%2Fsvg%3E')]" />
        <div className="relative">
          <div className="inline-block px-5 py-1.5 mb-6 border-2 border-primary/40 rounded-full text-xs font-bold text-primary tracking-widest uppercase bg-background/80 backdrop-blur-sm shadow-sm">
            {format(parseISO(devotional.date), "MMMM d, yyyy")}
          </div>
          
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {devotional.title}
          </h1>

          <div className="max-w-2xl mx-auto space-y-4">
            <p className="font-serif text-lg md:text-xl text-primary font-medium italic">
              "{devotional.scriptureText}"
            </p>
            <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              — {devotional.scriptureReference}
            </p>
          </div>
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
        <div id="prayer-points" className="grid md:grid-cols-2 gap-6">
          {/* Prayer Points */}
          <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-6 rounded-xl border border-secondary/20 shadow-sm">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-secondary mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground text-sm font-sans font-bold shadow-sm">P</span>
              Prayer Points
            </h3>
            <ul className="space-y-4">
              {devotional.prayerPoints.map((point, idx) => (
                <li key={idx} className="flex gap-3 text-sm md:text-base leading-relaxed text-foreground/80">
                  <span className="text-secondary mt-1 font-bold">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Faith Declarations */}
          <div className="bg-gradient-to-br from-accent/15 to-accent/5 p-6 rounded-xl border border-accent/20 shadow-sm">
            <h3 className="flex items-center gap-3 font-serif text-xl font-bold text-accent-foreground mb-5">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-accent text-accent-foreground text-sm font-sans font-bold shadow-sm">D</span>
              Prophetic Declaration
            </h3>
            <ul className="space-y-4">
              {devotional.faithDeclarations.map((decl, idx) => (
                <li key={idx} className="flex gap-3 text-sm md:text-base leading-relaxed font-medium text-foreground/80 italic">
                  <span className="text-accent font-bold mt-1">•</span>
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
