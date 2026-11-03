// POST /api/checkout — starts a Stripe checkout (Card / Apple Pay / Google Pay).
// The order is saved as a draft and becomes a real "paid" order when Stripe's webhook confirms payment.
import { getCatalog, validateCart } from "../lib/catalog.mjs";
import { orders } from "../lib/store.mjs";
import { json, readJSON, newOrderId, siteUrl } from "../lib/util.mjs";
import { taxEnabled, PRODUCT_TAX_CODE, SHIPPING_TAX_CODE } from "../lib/tax.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: "Card and Apple Pay aren't set up yet. Please choose Cash App, or try again soon." }, 503);

  const b = await readJSON(req);
  let cart;
  try { cart = validateCart(b && b.items, await getCatalog()); } catch (e) { return json({ error: e.message }, 400); }

  const site = siteUrl(req);
  const id = newOrderId();
  const p = new URLSearchParams();
  p.append("mode", "payment");
  p.append("success_url", site + "/success.html?order=" + id);
  p.append("cancel_url", site + "/#shop");
  p.append("client_reference_id", id);
  p.append("metadata[order_id]", id);
  p.append("payment_intent_data[metadata][order_id]", id);
  p.append("shipping_address_collection[allowed_countries][0]", "US");
    p.append("phone_number_collection[enabled]", "true");
  p.append("custom_text[submit][message]", "Please allow about 2 weeks for delivery.");
  const tax = taxEnabled();
  if (tax) p.append("automatic_tax[enabled]", "true");
  cart.lines.forEach((l, i) => {
    p.append(`line_items[${i}][quantity]`, String(l.qty));
    p.append(`line_items[${i}][price_data][currency]`, "usd");
    p.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(l.unit * 100)));
    p.append(`line_items[${i}][price_data][product_data][name]`, l.name);
    if (tax) {
      p.append(`line_items[${i}][price_data][tax_behavior]`, "exclusive");
      p.append(`line_items[${i}][price_data][product_data][tax_code]`, PRODUCT_TAX_CODE);
    }
  });
  if (cart.shipping > 0) {
    p.append("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
    p.append("shipping_options[0][shipping_rate_data][display_name]", "Standard (~2 weeks)");
    p.append("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(Math.round(cart.shipping * 100)));
    p.append("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
    if (tax) {
      p.append("shipping_options[0][shipping_rate_data][tax_behavior]", "exclusive");
      p.append("shipping_options[0][shipping_rate_data][tax_code]", SHIPPING_TAX_CODE);
    }
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
      body: p.toString()
    });
    const data = await res.json();
    if (!res.ok) { console.error("Stripe error", data); return json({ error: "Couldn't start checkout. Please try again." }, 502); }
    await orders().setJSON("draft/" + id, { id, createdAt: new Date().toISOString(), sessionId: data.id, ...cart });
    return json({ url: data.url, orderId: id });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't reach the payment processor. Please try again." }, 500);
  }
};
export const config = { path: "/api/checkout" };
