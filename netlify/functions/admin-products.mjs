// GET /api/admin/products — catalog for editing
// PUT /api/admin/products — save prices and sold-out status (live on the site immediately)
import { getCatalog, saveCatalog } from "../lib/catalog.mjs";
import { json, readJSON, isAdmin, unauthorized } from "../lib/util.mjs";

export default async (req) => {
  if (!isAdmin(req)) return unauthorized();
  if (req.method === "GET") return json({ products: await getCatalog() });
  if (req.method === "PUT") {
    const b = (await readJSON(req)) || {};
    try { return json({ products: await saveCatalog(b.products || []) }); }
    catch (e) { return json({ error: e.message }, 400); }
  }
  return json({ error: "Method not allowed" }, 405);
};
export const config = { path: "/api/admin/products" };
