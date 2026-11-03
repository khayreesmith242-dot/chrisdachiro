import crypto from "node:crypto";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function readJSON(req) {
  try { return await req.json(); } catch { return null; }
}

export function newOrderId() {
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return "CDC-" + t + r;
}

export const money = (n) => "$" + Number(n).toFixed(Number(n) % 1 ? 2 : 0);
export const clean = (v, max = 200) => String(v == null ? "" : v).trim().slice(0, max);
export const siteUrl = (req) => process.env.URL || new URL(req.url).origin;

export const STATUSES = ["unpaid", "paid", "in_production", "shipped", "cancelled"];
export const STATUS_LABEL = { unpaid: "Awaiting payment", paid: "Paid", in_production: "In production", shipped: "Shipped", cancelled: "Cancelled" };

export function trackingUrl(carrier, number) {
  const n = encodeURIComponent(number || "");
  return ({
    USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels=" + n,
    UPS: "https://www.ups.com/track?tracknum=" + n,
    FedEx: "https://www.fedex.com/fedextrack/?trknbr=" + n,
    DHL: "https://www.dhl.com/us-en/home/tracking.html?tracking-id=" + n
  })[carrier] || "";
}

/* ---------- Admin auth (signed token, expires in 7 days) ---------- */
const secret = () => (process.env.ADMIN_PASSWORD || "") + "|" + (process.env.ADMIN_SECRET || "cdc");
const sign = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function checkPassword(pw) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = crypto.createHash("sha256").update(String(pw || "")).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}
export function makeToken() {
  const data = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 864e5 })).toString("base64url");
  return data + "." + sign(data);
}
export function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const h = req.headers.get("authorization") || "";
  const tok = h.replace(/^Bearer\s+/i, "");
  const [data, sig] = tok.split(".");
  if (!data || !sig) return false;
  const good = sign(data);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return false;
  try { return JSON.parse(Buffer.from(data, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
export const unauthorized = () => json({ error: "Please log in again." }, 401);
