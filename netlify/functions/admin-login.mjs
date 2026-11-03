// POST /api/admin/login — checks ADMIN_PASSWORD and returns a 7-day session token
import { json, readJSON, checkPassword, makeToken } from "../lib/util.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!process.env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD isn't set in Netlify yet." }, 503);
  const b = (await readJSON(req)) || {};
  if (!checkPassword(b.password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "Wrong password." }, 401);
  }
  return json({ token: makeToken() });
};
export const config = { path: "/api/admin/login" };
