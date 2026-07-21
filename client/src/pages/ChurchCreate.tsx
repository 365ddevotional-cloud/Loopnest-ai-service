import { useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft, Loader2 } from "lucide-react";

export default function ChurchCreate() {
  const [, setLocation] = useLocation();
  const { user, emailVerified, getIdToken } = useUser();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    denomination: "",
    description: "",
    address: "",
    websiteUrl: "",
  });

  const isSignedIn = !!user && !!emailVerified;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Church name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        toast({ title: "Please sign in to create a church", variant: "destructive" });
        setLocation("/signin");
        return;
      }
      const r = await fetch("/api/churches", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          email: user?.email ?? "",
          displayName: user?.displayName ?? null,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message ?? "Failed to create church");
      }
      const church = await r.json();
      toast({ title: "Church created!", description: `"${church.name}" is ready.` });
      setLocation(`/church/${church.slug}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 space-y-6">
      <button
        onClick={() => setLocation("/church")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-back-to-church-landing"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Church Mode
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1a274418" }}>
          <Building2 className="w-6 h-6" style={{ color: "#1a2744" }} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold">Create a Church Space</h1>
          <p className="text-sm text-muted-foreground">Set up your church community on 365 Daily Devotional.</p>
        </div>
      </div>

      {!isSignedIn ? (
        <Card className="border-amber-200/60 bg-amber-50/40">
          <CardContent className="pt-5 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">You need to be signed in to create a church space.</p>
            <Button onClick={() => setLocation("/signin")} data-testid="button-church-create-signin">Sign In</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Church Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="church-name">Church Name <span className="text-destructive">*</span></Label>
                <Input
                  id="church-name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Grace Community Church"
                  required
                  data-testid="input-church-name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="church-denomination">Denomination <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="church-denomination"
                  value={form.denomination}
                  onChange={e => setForm(f => ({ ...f, denomination: e.target.value }))}
                  placeholder="e.g. Baptist, Pentecostal, Non-denominational"
                  data-testid="input-church-denomination"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="church-description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="church-description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="A brief description of your church and its mission..."
                  rows={3}
                  data-testid="input-church-description"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="church-address">Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="church-address"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 123 Main Street, City, State"
                  data-testid="input-church-address"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="church-website">Website <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="church-website"
                  type="url"
                  value={form.websiteUrl}
                  onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://www.youronchurch.org"
                  data-testid="input-church-website"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="submit" disabled={submitting} data-testid="button-church-create-submit">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Create Church Space"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/church")}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
