import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, ExternalLink, Copy, Check, RefreshCw, AlertCircle, Send, CheckCircle2, Building2 } from "lucide-react";
import { SiVenmo } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const VENMO_LINK = "https://venmo.com/u/dailydevotional";
const VENMO_USERNAME = "@dailydevotional";
const OPAY_ACCOUNT_NUMBER = "8054611168";
const OPAY_ACCOUNT_NAME = "MOSES AFOLABI";
const OPAY_BANK = "OPay";

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
  const [opayCopied, setOpayCopied] = useState(false);
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
          <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-5 py-2.5 border border-[#008CFF]/20">
            <SiVenmo className="w-5 h-5 text-[#008CFF]" />
            <span className="font-mono text-lg font-bold text-foreground tracking-wide">{VENMO_USERNAME}</span>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            Tap the button below to open Venmo and send your gift. If Venmo is installed on your device it will open automatically.
          </p>
          <a
            href={VENMO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid="link-venmo-donate"
          >
            <Button
              size="lg"
              className="w-full gap-2 text-lg font-bold bg-[#008CFF] hover:bg-[#0079e0] text-white border-0 h-14"
              data-testid="button-venmo-donate"
            >
              <SiVenmo className="w-6 h-6" />
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
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">🇳🇬 Nigeria</p>
            <h2 className="font-serif text-xl font-bold text-foreground">Donate by Bank Transfer (Nigeria)</h2>
          </div>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div className="bg-muted/40 rounded-xl border border-primary/10 divide-y divide-primary/10 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-muted-foreground font-medium">Account Name</span>
              <span className="text-base font-bold text-foreground tracking-wide">{OPAY_ACCOUNT_NAME}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-sm text-muted-foreground font-medium">Bank</span>
              <span className="text-base font-bold text-foreground">{OPAY_BANK}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4 gap-3">
              <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Account Number</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-foreground tracking-widest">{OPAY_ACCOUNT_NUMBER}</span>
                <button
                  onClick={handleCopyOpay}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all hover:bg-green-600/5 hover:border-green-600/50 flex-shrink-0"
                  style={{ borderColor: opayCopied ? "#16a34a" : undefined, color: opayCopied ? "#16a34a" : undefined }}
                  data-testid="button-copy-opay-account"
                  aria-label="Copy account number"
                >
                  {opayCopied
                    ? <><Check className="w-4 h-4" /> Copied</>
                    : <><Copy className="w-4 h-4" /> Copy</>
                  }
                </button>
              </div>
            </div>
          </div>
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
        defaultGivingType="One-Time Donation"
      />
    </div>
  );
}
