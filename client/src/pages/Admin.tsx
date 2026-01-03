import { CreateDevotionalForm } from "@/components/CreateDevotionalForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function Admin() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage and publish daily devotionals.</p>
        </div>
      </div>

      <Card className="border-primary/10 shadow-lg shadow-primary/5">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="font-serif text-2xl text-primary">Create New Devotional</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <CreateDevotionalForm />
        </CardContent>
      </Card>
    </div>
  );
}
