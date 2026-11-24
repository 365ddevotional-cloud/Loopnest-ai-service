import type Stripe from "stripe";

// Use the service period on the recurring line, not the invoice creation date.
export function goldPeriod(invoice: Stripe.Invoice, priceId: string) {
  const details = invoice.parent?.subscription_details;
  const uid = details?.metadata?.uid;
  const subscription = details?.subscription;
  const line = invoice.lines.data[0];
  if (!priceId || !invoice.id || !uid || details?.metadata?.app !== "365-spirittone-gold" ||
      typeof subscription !== "string" || invoice.status !== "paid" ||
      !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? "") ||
      invoice.currency !== "usd" || invoice.amount_paid !== 499 || invoice.amount_remaining !== 0 ||
      invoice.lines.has_more || invoice.lines.data.length !== 1 || line?.quantity !== 1 ||
      line.pricing?.price_details?.price !== priceId || line.amount !== 499 ||
      line.parent?.subscription_item_details?.proration !== false ||
      !Number.isSafeInteger(line.period.start) || !Number.isSafeInteger(line.period.end) ||
      line.period.start >= line.period.end) return null;
  return { invoice: invoice.id, subscription, uid, start: line.period.start, end: line.period.end };
}
