// POST /api/stripe-webhook — Stripe calls this when a card / Apple Pay payment succeeds.
// Turns the draft into a paid order, saves the customer's shipping info, and sends the emails.
import crypto from "node:crypto";
import { orders, getOrder, saveOrder } from "../lib/store.mjs";
import { json, siteUrl } from "../lib/util.mjs";
import { sendEmail, customerOrderEmail, adminNewOrderEmail } from "../lib/email.mjs";

function verify(raw, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=")).filter((x) => x.length === 2 && x[0] !== "v1"));
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  const t = parts.t;
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(t + "." + raw).digest("hex");
  return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  if (!verify(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) return json({ error: "Bad signature" }, 400);

  const event = JSON.parse(raw);
  const ok = ["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type);
  if (!ok) return json({ received: true });

  const s = event.data.object;
  if (s.payment_status !== "paid") return json({ received: true });
  const id = (s.metadata && s.metadata.order_id) || s.client_reference_id;
  if (!id) return json({ received: true });
  if (await getOrder(id)) return json({ received: true, duplicate: true }); // already processed

  const draft = await orders().get("draft/" + id);
  const cd = s.customer_details || {};
  const ship = (s.collected_information && s.collected_information.shipping_details) || s.shipping_details || {};
  const ad = ship.address || cd.address || {};
  const now = new Date().toISOString();
  const order = {
    id, createdAt: (draft && draft.createdAt) || now, method: "card", status: "paid",
    items: draft ? draft.lines : [], subtotal: draft ? draft.subtotal : s.amount_subtotal / 100,
    shipping: draft ? draft.shipping : 0, tax: ((s.total_details && s.total_details.amount_tax) || 0) / 100, total: s.amount_total / 100,
    customer: { name: cd.name || ship.name || "", email: cd.email || "", phone: cd.phone || "", instagram: "" },
    address: { name: ship.name || cd.name || "", line1: ad.line1 || "", line2: ad.line2 || "", city: ad.city || "", state: ad.state || "", zip: ad.postal_code || "", country: ad.country || "" },
    stripeSessionId: s.id, paymentIntent: s.payment_intent || "", notes: "", tracking: null,
    history: [{ at: now, status: "paid", by: "stripe" }]
  };
  await saveOrder(order);
  await orders().delete("draft/" + id);
  await Promise.all([sendEmail(customerOrderEmail(order)), sendEmail(adminNewOrderEmail(order, siteUrl(req)))]);
  return json({ received: true });
};
export const config = { path: "/api/stripe-webhook" };
