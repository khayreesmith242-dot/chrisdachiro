// GET /api/products — live prices and sold-out status for the storefront
import { getCatalog } from "../lib/catalog.mjs";
import { json } from "../lib/util.mjs";
import { taxEnabled } from "../lib/tax.mjs";

export default async () => json({ products: await getCatalog(), tax: taxEnabled() });
export const config = { path: "/api/products" };
