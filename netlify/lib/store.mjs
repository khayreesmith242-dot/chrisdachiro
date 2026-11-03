// Database layer — Netlify Blobs (built into every Netlify site, no setup needed).
// For local testing only, set CDC_LOCAL_STORE=/some/folder to use plain JSON files instead.
import { getStore } from "@netlify/blobs";
import fs from "node:fs";
import path from "node:path";

function fileStore(name) {
  const dir = path.join(process.env.CDC_LOCAL_STORE, name);
  fs.mkdirSync(dir, { recursive: true });
  const f = (key) => path.join(dir, encodeURIComponent(key) + ".json");
  return {
    async get(key) { try { return JSON.parse(fs.readFileSync(f(key), "utf8")); } catch { return null; } },
    async setJSON(key, val) { fs.writeFileSync(f(key), JSON.stringify(val)); },
    async delete(key) { try { fs.unlinkSync(f(key)); } catch {} },
    async list({ prefix = "" } = {}) {
      const blobs = fs.readdirSync(dir).map((n) => ({ key: decodeURIComponent(n.replace(/\.json$/, "")) }))
        .filter((b) => b.key.startsWith(prefix));
      return { blobs };
    }
  };
}

export function db(name) {
  if (process.env.CDC_LOCAL_STORE) return fileStore(name);
  const s = getStore({ name, consistency: "strong" });
  return {
    get: (key) => s.get(key, { type: "json" }),
    setJSON: (key, val) => s.setJSON(key, val),
    delete: (key) => s.delete(key),
    list: (opts) => s.list(opts)
  };
}

export const orders = () => db("orders");
export const settings = () => db("settings");

export async function saveOrder(order) {
  order.updatedAt = new Date().toISOString();
  await orders().setJSON("order/" + order.id, order);
  return order;
}
export const getOrder = (id) => orders().get("order/" + id);

export async function listOrders() {
  const s = orders();
  const { blobs } = await s.list({ prefix: "order/" });
  const all = await Promise.all(blobs.map((b) => s.get(b.key)));
  return all.filter(Boolean).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
