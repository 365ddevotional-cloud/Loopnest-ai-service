import { useDevotionalsList } from "@/hooks/use-devotionals";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Archive() {
  const { data: devotionals, isLoading } = useDevotionalsList();
  const [search, setSearch] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = devotionals?.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Devotional Archive</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Explore past messages to strengthen your faith and find encouragement for your daily walk.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-12">
        <Input 
          placeholder="Search by title or content..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white h-12 shadow-sm border-primary/20 focus-visible:ring-primary/20"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map((devotional, index) => (
            <motion.div
              key={devotional.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 border-primary/10 bg-white group">
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase mb-3">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(devotional.date), "MMM d, yyyy")}
                  </div>
                  
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {devotional.title}
                  </h3>
                  
                  <p className="text-muted-foreground line-clamp-3 mb-6 flex-grow font-serif text-sm leading-relaxed">
                    {devotional.content}
                  </p>

                  <Link href={`/devotional/${devotional.date}`}>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors border-primary/20">
                      Read Devotional <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No devotionals found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
