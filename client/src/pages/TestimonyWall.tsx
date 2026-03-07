import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Star, Send, Quote, Heart } from "lucide-react";
import { format } from "date-fns";
import type { Testimony } from "@shared/schema";

function SubmitTestimonyForm() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/testimonies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, name: name || null, country: country || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not submit testimony");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setMessage("");
      setName("");
      setCountry("");
      toast({ title: "Testimony submitted!", description: "Your testimony will be reviewed and published." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <Heart className="w-12 h-12 text-primary mx-auto" />
          <h3 className="font-serif text-xl font-bold text-primary">Thank You!</h3>
          <p className="text-muted-foreground">Your testimony has been submitted and will be reviewed by our team before appearing on the wall.</p>
          <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="button-submit-another">
            Share Another Testimony
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <h3 className="font-serif text-xl font-bold text-primary">Share Your Testimony</h3>
          <p className="text-sm text-muted-foreground">Has God answered your prayer? Share your story to encourage others.</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="testimony-message">Your Testimony</Label>
            <Textarea
              id="testimony-message"
              placeholder="Tell us how God has worked in your life..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none mt-1"
              data-testid="textarea-testimony"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="testimony-name">Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="testimony-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                data-testid="input-testimony-name"
              />
            </div>
            <div>
              <Label htmlFor="testimony-country">Country <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="testimony-country"
                placeholder="Your country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1"
                data-testid="input-testimony-country"
              />
            </div>
          </div>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!message.trim() || submitMutation.isPending}
            className="w-full gap-2"
            data-testid="button-submit-testimony"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Testimony
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TestimonyWall() {
  const { data: testimonies = [], isLoading } = useQuery<Testimony[]>({
    queryKey: ["/api/testimonies"],
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Testimony Wall</h1>
        <div className="w-24 h-1 bg-primary mx-auto rounded-full opacity-30" />
        <p className="text-muted-foreground max-w-xl mx-auto">
          See how God is moving in the lives of believers around the world.
        </p>
        <p className="text-sm italic text-primary font-serif">
          "They triumphed over him by the blood of the Lamb and by the word of their testimony." — Revelation 12:11
        </p>
      </div>

      <div className="mb-8">
        <SubmitTestimonyForm />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading testimonies...</p>
        </div>
      ) : testimonies.length === 0 ? (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">Be the first to share your testimony!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {testimonies.map((t) => (
            <Card key={t.id} className="border-primary/10 shadow-md" data-testid={`testimony-${t.id}`}>
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <Quote className="w-6 h-6 text-primary/40 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-foreground font-serif italic leading-relaxed">{t.message}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">{t.name || "Anonymous"}</span>
                      {t.country && (
                        <>
                          <span>—</span>
                          <span>{t.country}</span>
                        </>
                      )}
                      {t.createdAt && (
                        <>
                          <span>·</span>
                          <span>{format(new Date(t.createdAt), "MMM d, yyyy")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
