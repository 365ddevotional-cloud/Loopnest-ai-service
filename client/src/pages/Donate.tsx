import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Heart, ExternalLink, CreditCard, X } from "lucide-react";
import { SiPaypal, SiCashapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

const PAYPAL_LINK = import.meta.env.VITE_PAYPAL_DONATION_LINK || "https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L";
const CASHAPP_TAG = import.meta.env.VITE_CASHTAG || "$MuzAfo";
const CASHAPP_LINK = `https://cash.app/${CASHAPP_TAG}`;

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
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div id="donate" className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">Support the Ministry</h1>
        <div className="decorative-divider" />
      </div>

      <Card className="bg-card border-card-border shadow-xl shadow-primary/10 overflow-hidden">
        <div className="relative bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/15 p-8 md:p-12 text-center">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M10%2010m-1%200a1%201%200%201%200%202%200a1%201%200%201%200-2%200%22%20fill%3D%22%23C58E45%22%20fill-opacity%3D%220.1%22%2F%3E%3C%2Fsvg%3E')]" />
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg text-primary font-medium italic font-serif">
              "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">— 2 Corinthians 9:7</p>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 font-serif leading-relaxed text-lg text-muted-foreground">
          <div className="text-center space-y-4">
            <p className="font-bold text-foreground text-xl">
              Your generosity helps spread God's Word daily.
            </p>
            <p className="text-sm text-muted-foreground italic">"Give, and it will be given to you. A good measure, pressed down, shaken together and running over." — Luke 6:38</p>
          </div>

          <p>
            Your generous support helps us continue our mission of spreading God's Word daily.
            Every contribution, no matter the size, makes a meaningful difference in our ability to serve believers around the world.
          </p>

          <div className="bg-muted/30 p-6 rounded-xl border border-primary/10">
            <h3 className="font-sans font-bold text-primary mb-4 uppercase tracking-wide text-sm">Your Donations Support</h3>
            <ul className="space-y-3 text-base">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Daily devotional creation and curation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Faith-based outreach and ministry expansion</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span>Platform maintenance and growth</span>
              </li>
            </ul>
          </div>

          <Separator className="bg-primary/10" />

          <div className="text-center space-y-6">
            <Button
              size="lg"
              className="gap-2 text-base px-8"
              onClick={() => setModalOpen(true)}
              data-testid="button-donate-open-modal"
            >
              <Heart className="w-5 h-5" />
              Donate Now
            </Button>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <a
                href={PAYPAL_LINK}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-paypal-donate"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <SiPaypal className="w-5 h-5" />
                  PayPal Donation
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>

              <a
                href={CASHAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-cashapp-donate"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <SiCashapp className="w-5 h-5" />
                  Cash App ({CASHAPP_TAG})
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Card>

      <DonationModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
