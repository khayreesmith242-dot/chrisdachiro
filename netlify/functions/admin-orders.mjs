// GET  /api/admin/orders — every order, newest first
// PATCH /api/admin/orders — update status / tracking / internal note; emails the customer when asked
import { listOrders, getOrder, saveOrder } from "../lib/store.mjs";
import { json, readJSON, isAdmin, unauthorized, STATUSES, trackingUrl, clean } from "../lib/util.mjs";
import { sendEmail, customerPaidEmail, customerShippedEmail } from "../lib/email.mjs";
import { recordTax } from "../lib/tax.mjs";

export default async (req) => {
  if (!isAdmin(req)) return unauthorized();

  if (req.method === "GET") return json({ orders: await listOrders() });

  if (req.method === "PATCH") {
    const b = (await readJSON(req)) || {};
    const o = await getOrder(clean(b.id, 40));
    if (!o) return json({ error: "Order not found." }, 404);

    const prev = o.status;
    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return json({ error: "Invalid status." }, 400);
      o.status = b.status;
    }
    if (b.tracking !== undefined) {
      const carrier = clean(b.tracking && b.tracking.carrier, 20);
      const number = clean(b.tracking && b.tracking.number, 60);
      o.tracking = number ? { carrier, number, url: trackingUrl(carrier, number) } : null;
    }
    if (b.adminNote !== undefined) o.adminNote = clean(b.adminNote, 2000);
    if (o.status === "shipped" && !o.tracking) return json({ error: "Add a tracking number before marking shipped." }, 400);

    const emailed = [];
    if (o.status !== prev) {
      // Cash App sale confirmed → record it in Stripe Tax reports (once)
      if (o.status === "paid" && o.method === "cashapp" && o.taxCalculationId && !o.taxTransactionId) {
        o.taxTransactionId = await recordTax(o.taxCalculationId, o.id);
      }
      o.history = [...(o.history || []), { at: new Date().toISOString(), status: o.status, by: "admin" }];
      if (b.notify !== false && o.customer && o.customer.email) {
        if (o.status === "paid" && o.method === "cashapp") { await sendEmail(customerPaidEmail(o)); emailed.push("payment confirmation"); }
        if (o.status === "shipped") { await sendEmail(customerShippedEmail(o)); emailed.push("shipping + tracking"); }
      }
    }
    await saveOrder(o);
    return json({ order: o, emailed });
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: "/api/admin/orders" };
