import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/contexts/UserContext";
import { useI18n } from "@/hooks/useI18n";
import { ChurchModeShell } from "@/components/ChurchModeShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  HandCoins, CheckCircle2, Loader2, AlertCircle, Info,
  History, Printer, ChevronRight, Receipt,
} from "lucide-react";
import type { Church, ChurchGivingCategory, ChurchTransaction } from "@shared/schema";

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

function printReceipt(txn: ChurchTransaction, church: Church, platformFeePercent: number) {
  const win = window.open("", "_blank", "width=700,height=900");
  if (!win) return;
  const date = txn.createdAt ? new Date(txn.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—";
  const logoHtml = church.logoUrl
    ? `<img src="${church.logoUrl}" alt="Logo" style="height:60px;object-fit:contain;margin-bottom:8px;" />`
    : `<div style="width:60px;height:60px;background:#1a2744;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;color:white;font-size:24px;">✝</div>`;
  win.document.write(`
    <!DOCTYPE html><html><head><title>Giving Receipt</title>
    <style>
      body{font-family:Georgia,serif;max-width:580px;margin:40px auto;padding:0 20px;color:#1a1a1a;}
      .header{text-align:center;border-bottom:3px double #b8962e;padding-bottom:20px;margin-bottom:20px;}
      .church-name{font-size:22px;font-weight:bold;color:#1a2744;margin:4px 0;}
      .receipt-title{font-size:14px;color:#7a7570;letter-spacing:2px;text-transform:uppercase;margin-top:8px;}
      .section{margin:16px 0;}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0ece6;font-size:14px;}
      .row.total{font-weight:bold;font-size:16px;border-bottom:2px solid #1a2744;border-top:2px solid #1a2744;padding:10px 0;margin-top:4px;}
      .row.net{color:#166534;font-size:15px;}
      .label{color:#4a4540;}
      .value{font-weight:600;}
      .ref{font-size:11px;color:#9a9080;margin-top:20px;text-align:center;font-family:monospace;}
      .footer{text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid #e8e3dc;font-size:12px;color:#9a9080;}
      .status{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;background:#dcfce7;color:#166534;}
      @media print{@page{size:A5;margin:12mm;}}
    </style></head><body>
    <div class="header">
      ${logoHtml}
      <div class="church-name">${church.name}</div>
      <div class="receipt-title">Official Giving Receipt</div>
    </div>
    <div class="section">
      <div class="row"><span class="label">Receipt #</span><span class="value">${txn.reference}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
      <div class="row"><span class="label">Donor</span><span class="value">${txn.isAnonymous ? "Anonymous" : (txn.donorName ?? txn.donorEmail ?? "—")}</span></div>
      <div class="row"><span class="label">Category</span><span class="value">${txn.categoryName}</span></div>
      ${txn.note ? `<div class="row"><span class="label">Note</span><span class="value">${txn.note}</span></div>` : ""}
    </div>
    <div class="section">
      <div class="row"><span class="label">Gross Gift Amount</span><span class="value">${fmt(txn.grossAmount, txn.currency)}</span></div>
      <div class="row"><span class="label">Platform Fee (${platformFeePercent}%)</span><span class="value">−${fmt(txn.platformFeeAmount, txn.currency)}</span></div>
      <div class="row"><span class="label">Processing Fee</span><span class="value">−${fmt(txn.providerFeeAmount, txn.currency)}</span></div>
      <div class="row total"><span>Your Gift Total</span><span>${fmt(txn.grossAmount, txn.currency)}</span></div>
      <div class="row net"><span class="label">Church Received</span><span>${fmt(txn.churchNetAmount, txn.currency)}</span></div>
    </div>
    <div style="text-align:center;margin-top:16px;"><span class="status">✓ ${txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}</span></div>
    <div class="ref">Transaction Reference: ${txn.reference}</div>
    <div class="footer">
      <p>This is an official receipt for your gift to ${church.name}.</p>
      <p style="margin-top:4px;">Thank you for your generosity. "Each of you should give what you have decided in your heart to give." — 2 Corinthians 9:7</p>
      <p style="margin-top:8px;">Powered by 365 Daily Devotional Church Mode</p>
    </div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

export default function ChurchGiving() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  const slug = (location.match(/\/church\/([^/]+)\/giving/) ?? [])[1] ?? "";

  const { getIdToken, user, emailVerified } = useUser();
  const isSignedIn = !!user && !!emailVerified;
  const { t } = useI18n();
  const { toast } = useToast();

  const isSuccess = location.includes("/giving/success");
  const refParam = new URLSearchParams(location.split("?")[1] ?? "").get("ref");

  const [activeTab, setActiveTab] = useState<"give" | "history">("give");
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

  const { data: myHistory, isLoading: histLoading } = useQuery<ChurchTransaction[]>({
    queryKey: ["/api/churches", givingConfig?.church?.id, "giving", "my-history"],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return [];
      const r = await fetch(`/api/churches/${givingConfig!.church.id}/giving/my-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return r.ok ? r.json() : [];
    },
    enabled: !!givingConfig?.church?.id && isSignedIn && activeTab === "history",
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
        toast({ title: t("cm_error"), description: data.message, variant: "destructive" });
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast({ title: t("cm_error"), description: t("cm_couldNotStartPayment"), variant: "destructive" });
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
            <p className="text-sm font-medium">{t("cm_churchNotFound")}</p>
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
            <h2 className="font-serif text-3xl font-bold mb-2" style={{ color: "#1d3461" }}>{t("cm_thankYouGiving")}</h2>
            <p className="text-lg" style={{ color: "#4a4540" }}>
              {t("cm_yourGift")} {t("cm_to")} <strong>{church.name}</strong> {t("cm_giftReceived")}
            </p>
            {refParam && (
              <p className="text-xs mt-3 font-mono px-4 py-2 rounded-lg inline-block" style={{ color: "#9a9080", backgroundColor: "#f8f4ee" }}>
                Ref: {refParam}
              </p>
            )}
          </div>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: "#f0f8f0", border: "1px solid #22c55e30" }}>
            <p style={{ color: "#166534" }}>
              <em>"Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."</em>
            </p>
            <p className="mt-1 font-medium" style={{ color: "#166534" }}>— 2 Corinthians 9:7</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setLocation(`/church/${church.slug}/giving`)} variant="outline" className="gap-2"
              style={{ borderColor: "#1d3461", color: "#1d3461" }}>
              <HandCoins className="w-4 h-4" />{t("cm_giveAgain")}
            </Button>
            {isSignedIn && (
              <Button onClick={() => { setLocation(`/church/${church.slug}/giving`); setActiveTab("history"); }}
                variant="outline" className="gap-2" style={{ borderColor: "#b8962e", color: "#b8962e" }}>
                <History className="w-4 h-4" />{t("cm_viewGivingHistory")}
              </Button>
            )}
          </div>
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
          <h2 className="font-serif text-2xl font-bold" style={{ color: "#1d3461" }}>{t("cm_onlineGiving")}</h2>
          <p style={{ color: "#7a7570" }}>{t("cm_onlineGivingNotEnabled")} {church.name}.</p>
          <p className="text-sm" style={{ color: "#9a9080" }}>{t("cm_contactAdminForGiving")}</p>
        </div>
      </ChurchModeShell>
    );
  }

  return (
    <ChurchModeShell church={church} currentRole={myRole?.role ?? null}>
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#b8962e18" }}>
            <HandCoins className="w-6 h-6" style={{ color: "#b8962e" }} />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold" style={{ color: "#1d3461" }}>{t("cm_giveOnline")}</h1>
            <p className="text-sm mt-0.5" style={{ color: "#7a7570" }}>{church.name}</p>
          </div>
        </div>

        {/* Tab switcher */}
        {isSignedIn && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "#f8f4ee" }}>
            {[
              { id: "give" as const, label: t("cm_giveNow"), icon: HandCoins },
              { id: "history" as const, label: t("cm_myGiving"), icon: History },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: activeTab === tab.id ? "#fff" : "transparent",
                    color: activeTab === tab.id ? "#1d3461" : "#7a7570",
                    boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* My Giving History Tab */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {histLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#b8962e" }} />
              </div>
            ) : !myHistory?.length ? (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardContent className="pt-12 pb-12 text-center">
                  <Receipt className="w-10 h-10 mx-auto mb-3" style={{ color: "#c9b99060" }} />
                  <p className="font-semibold" style={{ color: "#1d3461" }}>{t("cm_noGivingHistoryYet")}</p>
                  <p className="text-sm mt-1" style={{ color: "#7a7570" }}>{t("cm_givingHistoryEmpty")}</p>
                  <Button className="mt-4 gap-2" onClick={() => setActiveTab("give")}
                    style={{ backgroundColor: "#1d3461" }}>
                    <HandCoins className="w-4 h-4" />{t("cm_giveNow")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: "#1d3461" }}>
                    {myHistory.length} gift{myHistory.length !== 1 ? "s" : ""} — Total:{" "}
                    {fmt(myHistory.filter(t => t.status === "completed").reduce((s, t) => s + t.grossAmount, 0), currency)}
                  </p>
                </div>
                <div className="space-y-3">
                  {myHistory.map(txn => (
                    <Card key={txn.id} className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                      <CardContent className="pt-4 pb-4 px-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: txn.status === "completed" ? "#22c55e15" : "#f8f4ee" }}>
                            <HandCoins className="w-5 h-5" style={{ color: txn.status === "completed" ? "#22c55e" : "#b8962e" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold" style={{ color: "#1d3461" }}>
                                {fmt(txn.grossAmount, txn.currency)}
                              </p>
                              <Badge
                                variant={txn.status === "completed" ? "default" : txn.status === "failed" ? "destructive" : "secondary"}
                                className="text-xs">
                                {txn.status}
                              </Badge>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: "#7a7570" }}>{txn.categoryName}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9a9080" }}>
                              {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                            </p>
                            <p className="text-xs mt-0.5 font-mono" style={{ color: "#9a9080" }}>{t("cm_ref")} {txn.reference}</p>
                          </div>
                          {txn.status === "completed" && (
                            <button
                              onClick={() => printReceipt(txn, church, platformFeePercent)}
                              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg flex-shrink-0"
                              style={{ backgroundColor: "#1d346110", color: "#1d3461" }}
                              data-testid={`button-receipt-${txn.id}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              {t("cm_receipt")}
                            </button>
                          )}
                        </div>
                        {txn.note && (
                          <p className="text-xs mt-2 pl-13 italic" style={{ color: "#7a7570" }}>"{txn.note}"</p>
                        )}
                        {txn.status === "completed" && (
                          <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-xs" style={{ borderColor: "#f0ece6" }}>
                            <div>
                              <p className="text-muted-foreground">{t("cm_yourGift")}</p>
                              <p className="font-semibold" style={{ color: "#1d3461" }}>{fmt(txn.grossAmount, txn.currency)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("cm_fees")}</p>
                              <p className="font-semibold" style={{ color: "#7a7570" }}>
                                −{fmt(txn.platformFeeAmount + txn.providerFeeAmount, txn.currency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t("cm_churchReceived")}</p>
                              <p className="font-semibold" style={{ color: "#166534" }}>{fmt(txn.churchNetAmount, txn.currency)}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Give Tab */}
        {activeTab === "give" && (
          <>
            {settings.givingStatement && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#fffbf0", border: "1px solid #b8962e30" }}>
                <p style={{ color: "#7a5a0a" }}>{settings.givingStatement}</p>
              </div>
            )}

            {/* Giving Category */}
            {categories.length > 0 && (
              <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>{t("cm_givingCategory")}</CardTitle>
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
                <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>{t("cm_selectAmount")}</CardTitle>
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
                  <Label className="text-sm" style={{ color: "#4a4540" }}>{t("cm_customAmount")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: "#9a9080" }}>{currencySym}</span>
                    <Input
                      type="number" min="1" step="0.01" placeholder="0.00"
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
                      <span>{t("cm_yourGift")}</span>
                      <span className="font-semibold">{fmt(amountCents, currency)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: "#7a7570" }}>
                      <span>{t("cm_platformFee")} ({platformFeePercent}%)</span>
                      <span>−{fmt(platformFeeCents, currency)}</span>
                    </div>
                    <div className="flex justify-between" style={{ color: "#7a7570" }}>
                      <span>{t("cm_processingFee")}</span>
                      <span>−{fmt(providerFeeCents, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: "#d8d0c4", color: "#1d3461" }}>
                      <span>{t("cm_churchReceives")}</span>
                      <span>{fmt(Math.max(0, churchNetCents), currency)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donor Details */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#fff" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold" style={{ color: "#1d3461" }}>{t("cm_yourDetails")}</CardTitle>
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
                  <span className="text-sm font-medium" style={{ color: "#4a4540" }}>{t("cm_giveAnonymously")}</span>
                </label>

                {!isAnonymous && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("cm_nameOptional")}</Label>
                      <Input placeholder="Your name" value={donorName} onChange={e => setDonorName(e.target.value)} data-testid="input-donor-name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t("cm_emailOptional")}</Label>
                      <Input type="email" placeholder="you@email.com" value={donorEmail} onChange={e => setDonorEmail(e.target.value)} data-testid="input-donor-email" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-sm">{t("cm_noteOptional")}</Label>
                  <Textarea placeholder={t("cm_shortDedication")} value={note} onChange={e => setNote(e.target.value)} rows={2} data-testid="input-giving-note" />
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
                {loading ? t("cm_startingCheckout") : amount >= 1 ? `${t("cm_giveNow")} ${currencySym}${amount.toFixed(2)}` : t("cm_giveNow")}
              </Button>
              <p className="text-xs text-center" style={{ color: "#9a9080" }}>
                {t("cm_securePayment")}
              </p>
              <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: "#b8962e" }}>
                <Info className="w-3 h-3" />
                Automatic splitting to church requires Stripe Connect setup. All funds are reconciled manually until connected.
              </p>
            </div>
          </>
        )}
      </div>
    </ChurchModeShell>
  );
}
