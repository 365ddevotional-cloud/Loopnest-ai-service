import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { goldPeriod } from "./spirittone-gold-invoice.ts";

function invoice() {
  return { id: "in_test", parent: { subscription_details: {subscription: "sub_test",
    metadata: { uid: "member", app: "365-spirittone-gold" }}}, billing_reason: "subscription_cycle",
    status: "paid", currency: "usd", amount_paid: 499, amount_remaining: 0,
    lines: {has_more: false, data: [{quantity: 1, amount: 499, pricing: {price_details: {price: "price_gold"}},
      parent: {subscription_item_details: {proration: false}}, period: {start: 100, end: 200}}]} };
}
const parse = (value: ReturnType<typeof invoice>) => goldPeriod(value as unknown as Stripe.Invoice, "price_gold");
test("initial payment and renewal use the purchased service period", () => {
  for (const reason of ["subscription_create", "subscription_cycle"]) {
    const value = invoice();
    value.billing_reason = reason;
    assert.deepEqual(parse(value), {invoice:"in_test",subscription:"sub_test",uid:"member",start:100,end:200});
  }
});
test("reject unrelated, unpaid, partial, prorated and mismatched invoices", () => {
  for (const alter of [
    (v: ReturnType<typeof invoice>) => {v.parent.subscription_details.metadata.app = "other";},
    (v: ReturnType<typeof invoice>) => {v.status = "open";},
    (v: ReturnType<typeof invoice>) => {v.amount_paid = 0;},
    (v: ReturnType<typeof invoice>) => {v.lines.data[0].parent.subscription_item_details.proration = true;},
    (v: ReturnType<typeof invoice>) => {v.lines.data[0].pricing.price_details.price = "other";},
    (v: ReturnType<typeof invoice>) => {v.lines.data[0].period.end = 0;},
  ]) {const value = invoice(); alter(value); assert.equal(parse(value), null);}
});
