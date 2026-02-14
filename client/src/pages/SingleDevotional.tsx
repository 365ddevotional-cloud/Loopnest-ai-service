import { useRoute } from "wouter";
import { useDevotionalByDate } from "@/hooks/use-devotionals";
import { DevotionalCard } from "@/components/DevotionalCard";
import { Loader2, ArrowLeft, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";

export default function SingleDevotional() {
  const [, params] = useRoute("/devotional/:date");
  const date = params?.date || "";
  const { data, isLoading } = useDevotionalByDate(date);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Handle restricted future devotional
  if (data?.restricted) {
    const scheduledDate = data.restricted.scheduledDate;
    return (
      <div className="space-y-6">
        <Link href="/archive">
          <Button variant="ghost" className="hover:bg-primary/5 text-muted-foreground" data-testid="button-back-archive">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archive
          </Button>
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="max-w-2xl mx-auto p-8 md:p-12 text-center bg-card border-primary/10">
            <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-6">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4" data-testid="text-restricted-title">
              Coming Soon
            </h2>
            <p className="text-muted-foreground text-lg mb-6" data-testid="text-restricted-message">
              {data.restricted.message}
            </p>
            <div className="flex items-center justify-center gap-2 text-primary font-medium" data-testid="text-scheduled-date">
              <Calendar className="w-5 h-5" />
              <span>Scheduled for {(() => { try { return format(parseISO(scheduledDate), "MMMM d, yyyy"); } catch { return scheduledDate; } })()}</span>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!data?.devotional) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Devotional Not Found</h2>
        <Link href="/archive">
          <Button variant="outline" data-testid="button-back-archive-notfound">Back to Archive</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/archive">
        <Button variant="ghost" className="hover:bg-primary/5 text-muted-foreground" data-testid="button-back-archive">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archive
        </Button>
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <DevotionalCard devotional={data.devotional} />
      </motion.div>
    </div>
  );
}
