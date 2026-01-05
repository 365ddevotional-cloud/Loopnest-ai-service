import { useQuery } from "@tanstack/react-query";
import { Loader2, Book, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";
import { TranslationSelector } from "@/components/TranslationSelector";
import { useTranslation, TRANSLATION_LABELS } from "@/contexts/TranslationContext";
import type { BiblePassage } from "@shared/schema";

export default function Bible() {
  const { translation } = useTranslation();
  const [search, setSearch] = useState("");

  const { data: passages, isLoading } = useQuery<BiblePassage[]>({
    queryKey: ["/api/bible-passages", translation],
    queryFn: async () => {
      const res = await fetch(`/api/bible-passages?translation=${translation}`);
      if (!res.ok) throw new Error("Failed to fetch passages");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" data-testid="loading-bible" />
      </div>
    );
  }

  const filtered = passages?.filter(p =>
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.reference.localeCompare(b.reference)) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary" data-testid="text-bible-title">
          Bible
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Read and meditate on God's Word. Select your preferred translation below.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <div className="flex items-center gap-3 bg-card border border-primary/10 rounded-lg px-4 py-3">
          <Book className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Bible Translation:</span>
          <TranslationSelector />
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Currently viewing: <span className="font-semibold text-primary">{TRANSLATION_LABELS[translation]}</span>
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white h-12 shadow-sm border-primary/20 focus-visible:ring-primary/20"
            data-testid="input-bible-search"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-primary/10">
          <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
            {search ? "No passages found" : "No Scripture Available"}
          </h3>
          <p className="text-muted-foreground">
            {search 
              ? "Try adjusting your search terms." 
              : "Scripture passages will appear here as they are added to devotionals."}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            Showing {filtered.length} passage{filtered.length !== 1 ? "s" : ""}
          </p>
          
          <div className="grid gap-6">
            {filtered.map((passage, index) => (
              <motion.div
                key={passage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
              >
                <Card 
                  className="p-6 border-primary/10 bg-white"
                  data-testid={`card-passage-${passage.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="font-serif text-lg font-bold text-primary" data-testid={`text-reference-${passage.id}`}>
                      {passage.reference}
                    </h3>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                      {passage.translation}
                    </span>
                  </div>
                  <blockquote 
                    className="font-serif text-lg leading-relaxed text-foreground italic border-l-4 border-primary/30 pl-4"
                    data-testid={`text-content-${passage.id}`}
                  >
                    "{passage.content}"
                  </blockquote>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground pt-8 border-t border-primary/10">
        <p>
          Scripture texts are from public domain translations: King James Version (KJV), 
          World English Bible (WEB), American Standard Version (ASV), and Douay-Rheims Bible (DRB).
        </p>
      </div>
    </div>
  );
}
