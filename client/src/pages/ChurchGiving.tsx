import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  HandCoins, CheckCircle2, Loader2, AlertCircle, ChevronRight,
  DollarSign, Heart, Info
} from "lucide-react";
import type { Church, ChurchGivingCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface GivingConfig {
  church: Church;
  settings: { isEnabled: boolean; currency: string; givingStatement: string | null } | null;
  categories: ChurchGivingCategory[];
  platformFeePercent: number;
}

interface MyRole { role: string | null; memberId: number | null; status: string | null; }

const PRESET_AMOUNTS = [10, 25, 50, 100, 250, 500];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", GBP: "£", EUR: "€", NGN: "₦", KES: "KSh", GHS: "GH₵", ZAR: "R"
};

function fmt(cents: number, currency = "USD") {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + " ";
  return `${sym}${(cents / 100).toFixed(2)}`;
}

export default function ChurchGiving() {
  const [matchGiving] = useRoute("/church/:slug/giving");
  const [matchSuccess] = useRoute("/church/:slug/giving/success");
  const [, params] = useRoute("/church/:slug/giving/:rest*");
  const [, allParams] = useRoute("/church/:slug/:rest*");
  const [location, setLocation] = useLocation();

  const slug = (location.match(/\/church\/([^/]+)\/giving/) ?? [])[1] ?? "";

  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { toast } = useToast();

  const isSuccess = location.includes("/giving/success");
  const refParam = new URLSearchParams(location.split("?")[1] ?? "").get("ref");

  const [selectedCategory, setSelectedCategory] = useState<ChurchGivingCategory | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: givingConfig, isLoading: configLoading } = useQuery<GivingConfig>({
    queryKey: ["/api/churches/slug", slug, "giving"],
    queryFn: () => fetch(`/api/churches/slug/${slug}/giving`).then(r => r.ok ? r.json() : Promise.reject()),
    enabled: !!slug,
  });

  const { data: myRole } = useQuery<MyRole>({
    queryKey: ["/api/churches/slug", slug, "my-role"],
    queryFn: async () => {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const r = await fetch(`/api/churches/slug/${slug}/my-role`, { headers });
      return r.ok ? r.json() : { role: null, memberId: null, status: null };
    },
    enabled: !!slug && isSignedIn,
  });

  const church = givingConfig?.church ?? null;
  const settings = givingConfig?.settings;
  const categories = givingConfig?.categories ?? [];
  const platformFeePercent = givingConfig?.platformFeePercent ?? 2.5;
  const currency = settings?.currency ?? "USD";
  const currencySym = CURRENCY_SYMBOLS[currency] ?? currency + " ";

  const amount = selectedPreset ?? (customAmount ? parseFloat(customAmount) : 0);
  const amountCents = Math.round(amount * 100);
  const platformFeeCents = Math.round(amountCents * (platformFeePercent / 100));
  const providerFeeCents = amountCents > 0 ? Math.round(amountCents * 0.029 + 30) : 0;
  const churchNetCents = amountCents - platformFeeCents - providerFeeCents;

  const canSubmit = amount >= 1 && (selectedCategory !== null || categories.length === 0);

  const handleGive = async () => {
    if (!church || !canSubmit) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/churches/slug/${church.slug}/giving/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          categoryId: selectedCategory?.id,
          categoryName: selectedCategory?.name ?? "General Fund",
          donorName: isAnonymous ? undefined : (donorName || undefined),
          donorEmail: isAnonymous ? undefined : (donorEmail || undefined),
          donorFirebaseUid: user?.uid,
          isAnonymous,
          note: note || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: "Error", description: data.message, variant: "destructive" });
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast({ title: "Error", description: "Could not start payment. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (configLoading) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#b8962e" }} /></div>
      </ChurchModeShell>
    );
  }

  if (!givingConfig || !church) {
    return (
      <ChurchModeShell church={null} currentRole={null}>
        <Card className="border-0 shadow-sm max-w-md mx-auto mt-8" style={{ borderLeft: "4px solid #dc2626", backgroundColor: "#fff" }}>
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-medium">Church not found.</p>
          </CardContent>
        </Card>
      </ChurchModeShell>
    );
  }

  if (isSuccess) {
    return (
      <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
        <div className="max-w-lg mx-auto py-12 text-center space-y-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: "#22c55e18" }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: "#22c55e" }} />
          </div>
          <div>
            <h2 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1d3461" }}>Thank You!</h2>
            <p className="text-lg" style={{ color: "#4a4540" }}>
              Your gift to <strong>{church.name}</strong> has been received. God bless your generosity.
            </p>
            {refParam && (
              <p className="text-xs mt-3 font-mono" style={{ color: "#9a9080" }}>Ref: {refParam}</p>
            )}
          </div>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#f0f8f0", border: "1px solid #22c55e30" }}>
            <p style={{ color: "#166534" }}>
              <em>"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."</em>
            </p>
            <p className="mt-1 font-medium" style={{ color: "#166534" }}>— 2 Corinthians 9:7</p>
          </div>
          <Button
            onClick={() => setLocation(`/church/${church.slug}/giving`)}
            variant="outline"
            className="gap-2"
            style={{ borderColor: "#1d3461", color: "#1d3461" }}
          >
            <HandCoins className="w-4 h-4" />
            Give Again
          </Button>
        </div>
      </ChurchModeShell>
    );
  }

  if (!settings?.isEnabled) {
    return (
      <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
        <div className="max-w-md mx-auto py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: "#b8962e18" }}>
            <HandCoins className="w-8 h-8" style={{ color: "#b8962e" }} />
          </div>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "#1d3461" }}>Online Giving</h2>
          <p style={{ color: "#7a7570" }}>Online giving is not yet enabled for {church.name}.</p>
          <p className="text-sm" style={{ color: "#9a9080" }}>Please contact your church administrator to set up online giving.</p>
        </div>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#b8962e18" }}>
            <HandCoins className="w-6 h-6" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold" style={{ color: "#1d3461" }}>Give Online</h1>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>{church.name}</p>
          </div>
        </div>

        {settings.givingStatement && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
            <p style={{ color: "#7a5a0a" }}>{settings.givingStatement}</p>
          </div>
        )}

        {/* Giving Category */}
        {categories.length > 0 && (
          <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>Giving Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat)}
                    className="rounded-xl border-2 px-4 py-3 text-left transition-all"
                    style={{
                      borderColor: selectedCategory?.id === cat.id ? "#1d3461" : "#e8e3dc",
                      backgroundColor: selectedCategory?.id === cat.id ? "#1d346108" : "#fff",
                    }}
                    data-testid={`button-giving-category-${cat.id}`}
                  >
                    <p className="text-sm font-semibold leading-tight" style={{ color: "#1d3461" }}>{cat.name}</p>
                    {cat.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#7a7570" }}>{cat.description}</p>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Amount Selection */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>Select Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map(p => (
                <button
                  key={p}
                  onClick={() => { setSelectedPreset(p); setCustomAmount(""); }}
                  className="rounded-xl border-2 py-3 text-sm font-bold transition-all"
                  style={{
                    borderColor: selectedPreset === p && !customAmount ? "#1d3461" : "#e8e3dc",
                    backgroundColor: selectedPreset === p && !customAmount ? "#1d3461" : "#fff",
                    color: selectedPreset === p && !customAmount ? "#fff" : "#1d3461",
                  }}
                  data-testid={`button-preset-amount-${p}`}
                >
                  {currencySym}{p}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm" style={{ color: "#4a4540" }}>Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#9a9080" }}>{currencySym}</span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
                  className="pl-7 text-lg font-bold"
                  style={{ borderColor: customAmount ? "#1d3461" : undefined }}
                  data-testid="input-custom-amount"
                />
              </div>
            </div>

            {/* Fee breakdown */}
            {amount >= 1 && (
              <div className="rounded-xl p-4 space-y-2 text-sm" style={{ backgroundColor: "#f8f4ee", border: "1px solid #e8e3dc" }}>
                <div className="flex justify-between" style={{ color: "#4a4540" }}>
                  <span>Your gift</span>
                  <span className="font-semibold">{fmt(amountCents, currency)}</span>
                </div>
                <div className="flex justify-between" style={{ color: "#7a7570" }}>
                  <span>Platform fee ({platformFeePercent}%)</span>
                  <span>−{fmt(platformFeeCents, currency)}</span>
                </div>
                <div className="flex justify-between" style={{ color: "#7a7570" }}>
                  <span>Processing fee (~2.9% + 30¢)</span>
                  <span>−{fmt(providerFeeCents, currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: "#d8d0c4", color: "#1d3461" }}>
                  <span>Church receives</span>
                  <span>{fmt(Math.max(0, churchNetCents), currency)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donor Details */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>Your Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{ borderColor: isAnonymous ? "#1d3461" : "#d0c8bc", backgroundColor: isAnonymous ? "#1d3461" : "transparent" }}
                onClick={() => setIsAnonymous(a => !a)}
              >
                {isAnonymous && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </div>
              <span className="text-sm font-medium" style={{ color: "#4a4540" }}>Give anonymously</span>
            </label>

            {!isAnonymous && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Name <span style={{ color: "#9a9080" }}>(optional)</span></Label>
                  <Input
                    placeholder="Your name"
                    value={donorName}
                    onChange={e => setDonorName(e.target.value)}
                    data-testid="input-donor-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email <span style={{ color: "#9a9080" }}>(optional)</span></Label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={donorEmail}
                    onChange={e => setDonorEmail(e.target.value)}
                    data-testid="input-donor-email"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Note <span style={{ color: "#9a9080" }}>(optional)</span></Label>
              <Textarea
                placeholder="A short message or dedication..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                data-testid="input-giving-note"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="space-y-3">
          <Button
            className="w-full h-14 text-lg font-bold gap-2"
            onClick={handleGive}
            disabled={!canSubmit || loading}
            style={{ backgroundColor: "#1d3461", color: "#fff" }}
            data-testid="button-give-now"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <HandCoins className="w-5 h-5" />}
            {loading ? "Starting checkout…" : amount >= 1 ? `Give ${currencySym}${amount.toFixed(2)}` : "Give Now"}
          </Button>
          <p className="text-xs text-center" style={{ color: "#9a9080" }}>
            Secure payment via Stripe · Your card details are never stored on our servers
          </p>
          <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: "#b8962e" }}>
            <Info className="w-3 h-3" />
            Automatic splitting to church requires Stripe Connect setup. All funds are reconciled manually until connected.
          </p>
        </div>
      </div>
    </ChurchModeShell>
  );
}
