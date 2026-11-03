// POST /api/order — places a Cash App order: re-prices on the server, saves it, emails customer + admin
import { getCatalog, validateCart } from "../lib/catalog.mjs";
import { saveOrder } from "../lib/store.mjs";
import { json, readJSON, newOrderId, clean, siteUrl } from "../lib/util.mjs";
import { sendEmail, customerOrderEmail, adminNewOrderEmail } from "../lib/email.mjs";
import { calculateTax } from "../lib/tax.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const b = await readJSON(req);
  if (!b) return json({ error: "Bad request" }, 400);
  if (b.website) return json({ error: "Bad request" }, 400); // honeypot

  let cart;
  try { cart = validateCart(b.items, await getCatalog()); } catch (e) { return json({ error: e.message }, 400); }

  const c = b.customer || {}, a = b.address || {};
  const customer = { name: clean(c.name, 80), email: clean(c.email, 120).toLowerCase(), phone: clean(c.phone, 30), instagram: clean(c.instagram, 60) };
  const address = { name: customer.name, line1: clean(a.line1), line2: clean(a.line2), city: clean(a.city, 80), state: clean(a.state, 80), zip: clean(a.zip, 20), country: clean(a.country || "US", 40) };
  if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email) || !customer.phone) return json({ error: "Please fill in your name, email and phone." }, 400);
  if (!address.line1 || !address.city || !address.state || !address.zip) return json({ error: "Please fill in your full shipping address, including ZIP code." }, 400);
  if (!clean(b.cashappName)) return json({ error: "Please add your Cash App name." }, 400);

  const t = await calculateTax(cart.lines, cart.shipping, address);
  const tax = Math.round(t.tax * 100) / 100;
  const now = new Date().toISOString();
  const order = {
    id: newOrderId(), createdAt: now, method: "cashapp", status: "unpaid",
    items: cart.lines, subtotal: cart.subtotal, shipping: cart.shipping, tax, total: Math.round((cart.total + tax) * 100) / 100,
    taxCalculationId: t.calculationId || null,
    customer, address, cashappName: clean(b.cashappName, 60), notes: clean(b.notes, 1000),
    tracking: null, history: [{ at: now, status: "unpaid", by: "customer" }]
  };
  try { await saveOrder(order); } catch (e) { console.error(e); return json({ error: "We couldn't save your order. Please try again." }, 500); }

  await Promise.all([sendEmail(customerOrderEmail(order)), sendEmail(adminNewOrderEmail(order, siteUrl(req)))]);
  return json({ orderId: order.id, total: order.total, tax: order.tax, lines: order.items });
};
export const config = { path: "/api/order" };
