import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, ExternalLink, CreditCard, X, Copy, Check, Calendar, RefreshCw, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { SiPaypal, SiCashapp, SiVenmo } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const PAYPAL_LINK = import.meta.env.VITE_PAYPAL_DONATION_LINK || "https://www.paypal.com/donate/?hosted_button_id=Y9PAZK36FKT8L";
const CASHAPP_TAG = import.meta.env.VITE_CASHTAG || "$365dailydevotional";
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

export function ConfirmationModal({ open, onClose, defaultGivingType }: {
  open: boolean;
  onClose: () => void;
  defaultGivingType: string;
}) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneWhatsapp, setPhoneWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("Venmo");
  const [givingType, setGivingType] = useState(defaultGivingType);
  const [paymentReference, setPaymentReference] = useState("");
  const [message, setMessage] = useState("");
  const [wantsThankYou, setWantsThankYou] = useState(false);

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setError("");
      setGivingType(defaultGivingType);
    }
  }, [open, defaultGivingType]);

  const handleSubmit = async () => {
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!amount.trim()) { setError("Donation amount is required."); return; }
    if (!currency) { setError("Please select a currency."); return; }
    if (!paymentMethod) { setError("Please select a payment method."); return; }
    if (!givingType) { setError("Please select a giving type."); return; }
    if (wantsThankYou && !email.trim() && !phoneWhatsapp.trim()) {
      setError("Please provide an email or WhatsApp/phone number so we can send your thank-you message.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/donation-confirmations", {
        fullName: fullName.trim(),
        email: email.trim() || null,
        phoneWhatsapp: phoneWhatsapp.trim() || null,
        country: country.trim() || null,
        amount: amount.trim(),
        currency,
        paymentMethod,
        givingType,
        paymentReference: paymentReference.trim() || null,
        message: message.trim() || null,
        wantsThankYou,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary">Confirm My Donation</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <p className="font-serif text-lg font-semibold text-foreground">Thank you for your gift!</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Thank you for supporting 365 Daily Devotional. Your gift has been recorded, and we deeply
              appreciate your partnership in spreading God's Word.
            </p>
            <Button className="w-full" onClick={onClose} data-testid="button-confirm-done">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dc-name">Full Name <span className="text-destructive">*</span></Label>
              <Input id="dc-name" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name" data-testid="input-confirm-name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dc-email">Email Address</Label>
                <Input id="dc-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" data-testid="input-confirm-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-phone">WhatsApp / Phone</Label>
                <Input id="dc-phone" type="tel" value={phoneWhatsapp} onChange={e => setPhoneWhatsapp(e.target.value)}
                  placeholder="+1234567890" data-testid="input-confirm-phone" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-country">Country</Label>
              <Input id="dc-country" value={country} onChange={e => setCountry(e.target.value)}
                placeholder="e.g. United States, Nigeria" data-testid="input-confirm-country" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dc-amount">Amount <span className="text-destructive">*</span></Label>
                <Input id="dc-amount" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 20" data-testid="input-confirm-amount" />
              </div>
              <div className="space-y-1.5">
                <Label>Currency <span className="text-destructive">*</span></Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-confirm-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Method <span className="text-destructive">*</span></Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-confirm-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Venmo">Venmo</SelectItem>
                  <SelectItem value="OPay Bank Transfer">OPay Bank Transfer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Giving Type <span className="text-destructive">*</span></Label>
              <Select value={givingType} onValueChange={setGivingType}>
                <SelectTrigger data-testid="select-confirm-giving-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="One-Time Donation">One-Time Donation</SelectItem>
                  <SelectItem value="Monthly Support">Monthly Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-ref">Payment Reference or Last 4 Digits</Label>
              <Input id="dc-ref" value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                placeholder="Optional" data-testid="input-confirm-reference" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dc-message">Message or Prayer Request</Label>
              <Textarea id="dc-message" value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Optional — share anything you'd like us to know or pray about."
                className="resize-none" rows={3} data-testid="textarea-confirm-message" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group" data-testid="checkbox-wants-thankyou">
              <input type="checkbox" checked={wantsThankYou} onChange={e => setWantsThankYou(e.target.checked)}
                className="mt-1 w-4 h-4 accent-primary" />
              <span className="text-sm text-muted-foreground leading-snug group-hover:text-foreground transition-colors">
                I would like to receive a thank-you message from 365 Daily Devotional.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={submitting}
              data-testid="button-submit-confirmation">
              {submitting
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</>
                : <><Send className="w-4 h-4" /> Submit Donation Confirmation</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Donate() {
  const [opaycopied, setOpayCopied] = useState(false);
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");
  const [confirmOpen, setConfirmOpen] = useState(false);
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

      {/* Giving Frequency Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-muted/50 rounded-xl p-1 border border-primary/10 gap-1">
          <button
            type="button"
            onClick={() => setFrequency("once")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              frequency === "once"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-give-once"
          >
            <Heart className="w-4 h-4" />
            Give Once
          </button>
          <button
            type="button"
            onClick={() => setFrequency("monthly")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              frequency === "monthly"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="button-give-monthly"
          >
            <Calendar className="w-4 h-4" />
            Support Monthly
          </button>
        </div>
      </div>

      {/* Monthly encouragement message */}
      {frequency === "monthly" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-6 py-5 text-center">
          <p className="text-sm md:text-base text-foreground leading-relaxed">
            Thank you for choosing to support the 365 Daily Devotional ministry every month. Your faithful
            partnership helps us continue sharing God's Word with people around the world.
          </p>
        </div>
      )}

      {/* PayPal */}
      <Card className="shadow-lg shadow-primary/10 border border-primary/15 overflow-hidden" data-testid="card-paypal">
        <div className="bg-gradient-to-r from-[#003087]/10 via-[#003087]/5 to-transparent px-6 py-4 border-b border-primary/10 flex items-center gap-3">
          <SiPaypal className="w-7 h-7 text-[#003087]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Worldwide</p>
            <h2 className="font-serif text-xl font-bold text-foreground">Donate with PayPal</h2>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5 text-center">
          <p className="text-base text-muted-foreground leading-relaxed">
            {frequency === "monthly"
              ? "Tap the button below to open PayPal. You can then set up a recurring monthly gift from within your PayPal account."
              : "Tap the button below to open PayPal and complete your donation securely."}
          </p>
          <a href={PAYPAL_LINK} target="_blank" rel="noopener noreferrer"
            data-testid="link-paypal-donate" className="block">
            <Button size="lg"
              className="w-full gap-2 text-lg font-bold bg-[#003087] hover:bg-[#002574] text-white border-0 h-14"
              data-testid="button-paypal-donate">
              <SiPaypal className="w-6 h-6" />
              Donate with PayPal
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          {frequency === "monthly" && (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-4 py-3 border border-primary/10">
              To give monthly, complete your donation on PayPal, then log in and select{" "}
              <strong>Set up recurring payments</strong> from your payment activity.
            </p>
          )}
        </div>
      </Card>

      {/* Cash App */}
      <Card className="shadow-lg shadow-primary/10 border border-primary/15 overflow-hidden" data-testid="card-cashapp">
        <div className="bg-gradient-to-r from-[#00D632]/10 via-[#00D632]/5 to-transparent px-6 py-4 border-b border-primary/10 flex items-center gap-3">
          <SiCashapp className="w-7 h-7 text-[#00D632]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">USA</p>
            <h2 className="font-serif text-xl font-bold text-foreground">Donate with Cash App</h2>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5 text-center">
          <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-5 py-2 border border-primary/10">
            <SiCashapp className="w-5 h-5 text-[#00D632]" />
            <span className="font-mono text-lg font-bold text-foreground tracking-wide">{CASHAPP_TAG}</span>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            {frequency === "monthly"
              ? "Tap the button below to open Cash App. You can then schedule a recurring monthly payment from within the app."
              : "Tap the button below to open Cash App and send your gift directly."}
          </p>
          <a href={CASHAPP_LINK} target="_blank" rel="noopener noreferrer"
            data-testid="link-cashapp-donate" className="block">
            <Button size="lg"
              className="w-full gap-2 text-lg font-bold bg-[#00D632] hover:bg-[#00b82a] text-black border-0 h-14"
              data-testid="button-cashapp-donate">
              <SiCashapp className="w-6 h-6" />
              Donate with Cash App
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          {frequency === "monthly" && (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-4 py-3 border border-primary/10">
              To make this monthly, open Cash App, tap <strong>Pay</strong>, enter your amount, then
              select <strong>Make it recurring</strong> before sending.
            </p>
          )}
        </div>
      </Card>

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
          <p className="text-base text-muted-foreground leading-relaxed">
            {frequency === "monthly"
              ? "Tap the button below to open Venmo. You can then schedule monthly payments from within the app."
              : "Tap the button below to open Venmo and send your gift. If Venmo is installed on your device it will open automatically."}
          </p>
          <a href={VENMO_LINK} target="_blank" rel="noopener noreferrer"
            data-testid="link-venmo-donate" className="block">
            <Button size="lg"
              className="w-full gap-2 text-lg font-bold bg-[#008CFF] hover:bg-[#0079e0] text-white border-0 h-14"
              data-testid="button-venmo-donate">
              <SiVenmo className="w-6 h-6" />
              {frequency === "monthly" ? "Set Up Monthly Support on Venmo" : "Donate via Venmo"}
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
          {frequency === "monthly" && (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-4 py-3 border border-primary/10">
              To make this monthly, open the Venmo app, enter your support amount, tap{" "}
              <strong>Schedule</strong>, select <strong>Monthly</strong>, and choose your preferred
              payment date.
            </p>
          )}
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
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-base text-muted-foreground font-medium">Account Name</span>
              <span className="text-base font-bold text-foreground tracking-wide">MOSES AFOLABI</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-base text-muted-foreground font-medium">Bank</span>
              <span className="text-base font-bold text-foreground">OPay</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-base text-muted-foreground font-medium">Account Number</span>
              <span className="font-mono text-lg font-bold text-foreground tracking-widest">{OPAY_ACCOUNT_NUMBER}</span>
            </div>
          </div>
          {frequency === "monthly" && (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-4 py-3 border border-primary/10">
              For monthly support by bank transfer, you may save these account details and send your
              chosen amount each month. Where available, you may also create a monthly standing
              instruction through your banking app.
            </p>
          )}
          <Button size="lg" variant="outline"
            className="w-full gap-2 text-lg font-bold border-green-600/40 hover:bg-green-600/5 hover:border-green-600/70 h-14"
            onClick={handleCopyOpay} data-testid="button-copy-opay-account">
            {opaycopied ? (
              <><Check className="w-5 h-5 text-green-600" /> Account number copied</>
            ) : (
              <><Copy className="w-5 h-5" /> Copy Account Number</>
            )}
          </Button>
        </div>
      </Card>

      {/* Have You Donated? */}
      <Card className="shadow-lg shadow-primary/10 border border-primary/15">
        <div className="px-6 py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground mb-1">Have You Donated?</h2>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
              Please let us know after making your donation so we can acknowledge your gift and
              personally thank you.
            </p>
          </div>
          <Button size="lg" variant="outline"
            className="gap-2 text-lg font-bold border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-14"
            onClick={() => setConfirmOpen(true)} data-testid="button-confirm-donation">
            <Send className="w-5 h-5" />
            Confirm My Donation
          </Button>
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        defaultGivingType={frequency === "monthly" ? "Monthly Support" : "One-Time Donation"}
      />
    </div>
  );
}
