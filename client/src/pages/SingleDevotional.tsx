import { useRoute } from "wouter";
import { useDevotionalByDate } from "@/hooks/use-devotionals";
import { DevotionalCard } from "@/components/DevotionalCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function SingleDevotional() {
  const [, params] = useRoute("/devotional/:date");
  const date = params?.date || "";
  const { data: devotional, isLoading } = useDevotionalByDate(date);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Devotional Not Found</h2>
        <Link href="/archive">
          <Button variant="outline">Back to Archive</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/archive">
        <Button variant="ghost" className="hover:bg-primary/5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Archive
        </Button>
      </Link>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <DevotionalCard devotional={devotional} />
      </motion.div>
    </div>
  );
}
