import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Heart, Send, HandHeart } from "lucide-react";

export default function QuickPrayer() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quick-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, message: message.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not submit prayer request");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setMessage("");
      setName("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 shadow-xl">
          <CardContent className="p-8 md:p-12 text-center space-y-6" data-testid="quick-prayer-success">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg">
              <HandHeart className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary">Your Request Has Been Received</h2>
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <p className="text-foreground font-serif italic text-lg">
                One of our prayer partners is praying for you right now.
              </p>
            </div>
            <p className="text-muted-foreground">
              Someone is praying for you now. God hears every prayer, and we are standing in agreement with you.
            </p>
            <p className="text-sm italic text-primary font-serif">
              "For where two or three gather in my name, there am I with them." — Matthew 18:20
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Button onClick={() => setSubmitted(false)} className="gap-2" data-testid="button-pray-again">
                <Heart className="w-4 h-4" />
                Submit Another Request
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/prayer-counseling"} data-testid="button-full-form">
                Full Prayer Form
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8 space-y-4">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">Pray With Someone Now</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        <p className="text-muted-foreground max-w-lg mx-auto">
          Share your prayer need and someone will begin praying for you immediately.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 shadow-xl">
        <CardContent className="p-6 md:p-8 space-y-5">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-center">
            <HandHeart className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">
              One of our prayer partners is ready to pray with you.
            </p>
          </div>

          <div>
            <Label htmlFor="quick-name">Your Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="quick-name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              data-testid="input-quick-prayer-name"
            />
          </div>

          <div>
            <Label htmlFor="quick-message">What would you like prayer for?</Label>
            <Textarea
              id="quick-message"
              placeholder="Share your prayer need..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none mt-1"
              data-testid="textarea-quick-prayer"
            />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!message.trim() || submitMutation.isPending}
            size="lg"
            className="w-full gap-2"
            data-testid="button-submit-quick-prayer"
          >
            {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Pray With Someone Now
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your request will be immediately sent to our prayer team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
