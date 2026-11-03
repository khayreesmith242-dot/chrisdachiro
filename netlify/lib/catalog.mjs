// Product catalog. Defaults live here; anything edited in /admin is saved to the database and wins.
import { settings } from "./store.mjs";

export const SHIPPING = 5; // flat shipping per order in USD

export const DEFAULTS = [
  { id: "pillow", name: "Cervical Traction Pillow", price: 20, soldOut: false },
  { id: "gun",    name: "Compact Massage Gun",      price: 80, soldOut: false }
];

export async function getCatalog() {
  let saved = null;
  try { saved = await settings().get("catalog"); } catch (e) { console.error("catalog read failed", e); }
  return DEFAULTS.map((d) => {
    const s = saved && saved[d.id];
    if (!s) return { ...d };
    return { ...d, price: Number.isFinite(s.price) ? s.price : d.price, soldOut: !!s.soldOut };
  });
}

export async function saveCatalog(list) {
  const out = {};
  for (const p of list) {
    const d = DEFAULTS.find((x) => x.id === p.id);
    if (!d) throw new Error("Unknown product " + p.id);
    const price = Math.round(Number(p.price) * 100) / 100;
    if (!(price > 0 && price <= 10000)) throw new Error("Price for " + d.name + " must be between $1 and $10,000.");
    out[p.id] = { price, soldOut: !!p.soldOut };
  }
  await settings().setJSON("catalog", out);
  return getCatalog();
}

export function validateCart(items, catalog) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Your cart is empty.");
  if (items.length > 20) throw new Error("Too many line items.");
  const lines = items.map((it) => {
    const p = catalog.find((c) => c.id === (it && it.id));
    if (!p) throw new Error("Unknown product.");
    if (p.soldOut) throw new Error(p.name + " is sold out. Please remove it from your cart.");
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error("Invalid quantity for " + p.name + ".");
    return { id: p.id, name: p.name, qty, unit: p.price, total: Math.round(p.price * qty * 100) / 100 };
  });
  const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
  return { lines, subtotal, shipping: SHIPPING, total: Math.round((subtotal + SHIPPING) * 100) / 100 };
}
