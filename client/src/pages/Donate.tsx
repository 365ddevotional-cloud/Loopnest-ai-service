import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, CreditCard, X, Copy, Check } from "lucide-react";
import { SiPaypal, SiCashapp, SiVenmo } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

const PAYPAL_LINK = import.meta.env.VITE_PAYPAL_DONATION_LINK || "https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L";
const CASHAPP_TAG = import.meta.env.VITE_CASHTAG || "$MuzAfo";
const CASHAPP_LINK = `https://cash.app/${CASHAPP_TAG}`;
const VENMO_LINK = "https://venmo.com/u/dailydevotional";
const OPAY_ACCOUNT_NUMBER = "8054611168";

const SUGGESTED_AMOUNTS = [
  { amount: 5, label: "Help someone read today's devotional" },
  { amount: 10, label: "Sponsor devotionals for a week" },
  { amount: 25, label: "Support global outreach" },
  { amount: 50, label: "Help expand the ministry" },
];

const PURPOSES = [
  "General Ministry Support",
  "Daily Devotional Outreach",
  "Youth Fellowship",
  "Media Ministry",
  "Tithe / Offering",
];

type PaymentMethod = "paypal" | "cashapp" | "card";

function DonationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [note, setNote] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const numericAmount = parseFloat(amount);
  const canContinue = !isNaN(numericAmount) && numericAmount > 0;

  const handleContinue = async () => {
    if (!canContinue) return;

    if (paymentMethod === "paypal") {
      window.open(PAYPAL_LINK, "_blank", "noopener,noreferrer");
      return;
    }

    if (paymentMethod === "cashapp") {
      window.open(CASHAPP_LINK, "_blank", "noopener,noreferrer");
      return;
    }

    if (paymentMethod === "card") {
      setLoading(true);
      try {
        const res = await fetch("/api/create-donation-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericAmount,
            donorName: donorName.trim() || "Anonymous",
            note: note.trim(),
            purpose,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Payment could not be started. Please try again.");
        }

        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          throw new Error("Payment could not be started. Please try again.");
        }
      } catch (err: any) {
        if (err.message?.includes("not currently available")) {
          toast({
            title: "Card Payments Unavailable",
            description: "Redirecting you to PayPal instead.",
          });
          setTimeout(() => {
            window.open(PAYPAL_LINK, "_blank", "noopener,noreferrer");
          }, 1500);
        } else {
          toast({
            title: "Payment Error",
            description: err.message || "Payment could not be started. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="donation-modal-overlay"
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-[95%] max-w-[420px] max-h-[90vh] overflow-y-auto"
        data-testid="donation-modal"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Support the Ministry</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Suggested Amounts</label>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_AMOUNTS.map((s) => (
                <button
                  key={s.amount}
                  type="button"
                  onClick={() => setAmount(String(s.amount))}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    amount === String(s.amount)
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                  data-testid={`button-amount-${s.amount}`}
                >
                  <span className="block text-base font-bold text-foreground">${s.amount}</span>
                  <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="donation-amount" className="block text-sm font-medium text-foreground mb-1">
              Amount ($)
            </label>
            <input
              id="donation-amount"
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={inputClass}
              data-testid="input-donation-amount"
            />
          </div>

          <div>
            <label htmlFor="donor-name" className="block text-sm font-medium text-foreground mb-1">
              Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="donor-name"
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
              data-testid="input-donor-name"
            />
          </div>

          <div>
            <label htmlFor="donation-note" className="block text-sm font-medium text-foreground mb-1">
              Note <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="donation-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Leave a message"
              className={inputClass}
              data-testid="input-donation-note"
            />
          </div>

          <div>
            <label htmlFor="donation-purpose" className="block text-sm font-medium text-foreground mb-1">
              Donation Purpose
            </label>
            <select
              id="donation-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={inputClass}
              data-testid="select-donation-purpose"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  paymentMethod === "paypal"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                data-testid="button-method-paypal"
              >
                <SiPaypal className="w-5 h-5 text-[#003087]" />
                <span className="text-sm font-medium text-foreground">Donate with PayPal</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cashapp")}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  paymentMethod === "cashapp"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                data-testid="button-method-cashapp"
              >
                <SiCashapp className="w-5 h-5 text-[#00D632]" />
                <span className="text-sm font-medium text-foreground">Donate with Cash App</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40"
                }`}
                data-testid="button-method-card"
              >
                <CreditCard className="w-5 h-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">Donate with Card</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            disabled={!canContinue || loading}
            onClick={handleContinue}
            data-testid="button-continue-payment"
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onClose}
            data-testid="button-cancel-donation"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Donate() {
  const [opaycopied, setOpayCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyOpay = async () => {
    try {
      await navigator.clipboard.writeText(OPAY_ACCOUNT_NUMBER);
      setOpayCopied(true);
      toast({ title: "Account number copied." });
      setTimeout(() => setOpayCopied(false), 2500);
    } catch {
      toast({ title: "Account number copied.", description: OPAY_ACCOUNT_NUMBER });
    }
  };

  return (
    <div id="donate" className="max-w-2xl mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto shadow-lg">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Support the Ministry</h1>
        <div className="decorative-divider" />
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Your generous support helps us continue sharing God's Word freely around the world through the
          365 Daily Devotional ministry. Every gift is greatly appreciated. Thank you, and may God
          richly bless you.
        </p>
      </div>

      {/* Venmo — USA */}
      <Card className="shadow-lg shadow-primary/10 border border-primary/15 overflow-hidden" data-testid="card-venmo">
        <div className="bg-gradient-to-r from-[#008CFF]/10 via-[#008CFF]/5 to-transparent px-6 py-4 border-b border-primary/10 flex items-center gap-3">
          <SiVenmo className="w-7 h-7 text-[#008CFF]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">🇺🇸 United States</p>
            <h2 className="font-serif text-xl font-bold text-foreground">Donate with Venmo</h2>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5 text-center">
          <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-5 py-2 border border-primary/10">
            <SiVenmo className="w-5 h-5 text-[#008CFF]" />
            <span className="font-mono text-lg font-bold text-foreground tracking-wide">@dailydevotional</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Tap the button below to open Venmo and send your gift. If Venmo is installed on your device it will open automatically.
          </p>
          <a
            href={VENMO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-venmo-donate"
            className="block"
          >
            <Button
              size="lg"
              className="w-full gap-2 text-base bg-[#008CFF] hover:bg-[#0079e0] text-white border-0"
              data-testid="button-venmo-donate"
            >
              <SiVenmo className="w-5 h-5" />
              Donate via Venmo
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </Card>

      {/* OPay — Nigeria */}
      <Card className="shadow-lg shadow-primary/10 border border-primary/15 overflow-hidden" data-testid="card-opay">
        <div className="bg-gradient-to-r from-green-600/10 via-green-600/5 to-transparent px-6 py-4 border-b border-primary/10 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold leading-none">₦</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">🇳🇬 Nigeria</p>
            <h2 className="font-serif text-xl font-bold text-foreground">Donate by Bank Transfer</h2>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="bg-muted/40 rounded-xl border border-primary/10 divide-y divide-primary/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground font-medium">Account Name</span>
              <span className="text-sm font-bold text-foreground tracking-wide">MOSES AFOLABI</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground font-medium">Bank</span>
              <span className="text-sm font-bold text-foreground">OPay</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground font-medium">Account Number</span>
              <span className="font-mono text-base font-bold text-foreground tracking-widest">{OPAY_ACCOUNT_NUMBER}</span>
            </div>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2 text-base border-green-600/40 hover:bg-green-600/5 hover:border-green-600/70"
            onClick={handleCopyOpay}
            data-testid="button-copy-opay-account"
          >
            {opaycopied ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                Account number copied
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Account Number
              </>
            )}
          </Button>
        </div>
      </Card>

    </div>
  );
}
