// Automatic emails via Resend (resend.com). Needs RESEND_API_KEY, EMAIL_FROM and ADMIN_EMAIL env vars.
// If they're missing, orders still save — emails are just skipped (and logged).
import { money } from "./util.mjs";

const CASHTAG = "$ChrisPelecanos";
const IG = "ChrisDaChiro";
const SITE = () => process.env.URL || "https://cdctherapytools.com";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const first = (n) => esc(String(n || "there").split(" ")[0]);

export async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ChrisDaChiro Therapy Tools <orders@cdctherapytools.com>";
  if (!key || !to) { console.log("[email skipped]", subject, "→", to || "(no recipient)"); return { skipped: true }; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    });
    if (!res.ok) console.error("[email failed]", res.status, await res.text());
    return { ok: res.ok };
  } catch (e) { console.error("[email error]", e); return { ok: false }; }
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4fafe;font-family:Helvetica,Arial,sans-serif;color:#1a2a36">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4fafe;padding:30px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe7ef">
    <tr><td align="center" style="padding:24px 28px 10px;border-bottom:3px solid #d9a774"><img src="${SITE()}/assets/logo-sm.png" width="200" alt="ChrisDaChiro Therapy Tools" style="border:0;display:block" /></td></tr>
    <tr><td style="padding:28px 28px 10px"><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;color:#12324a">${title}</h1>${body}</td></tr>
    <tr><td style="padding:20px 28px 28px;color:#5b6d7a;font-size:12px;border-top:1px solid #eef3f7">Take care of YOU · <a href="https://cdctherapytools.com" style="color:#5b6d7a">CDCTherapyTools.com</a> · Instagram <a href="https://instagram.com/${IG}" style="color:#5b6d7a">@${IG}</a></td></tr>
  </table></td></tr></table></body></html>`;
}

function itemsTable(o) {
  const rows = o.items.map((l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eef3f7">${esc(l.name)}<br><span style="color:#5b6d7a;font-size:13px">Qty ${l.qty}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #eef3f7">${money(l.total)}</td></tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;margin:16px 0">${rows}
  <tr><td style="padding:8px 0;color:#5b6d7a">Shipping</td><td align="right" style="color:#5b6d7a">${o.shipping ? money(o.shipping) : "Free"}</td></tr>
  ${o.tax ? `<tr><td style="padding:4px 0;color:#5b6d7a">Sales tax</td><td align="right" style="color:#5b6d7a">$${Number(o.tax).toFixed(2)}</td></tr>` : ""}
  <tr><td style="padding:6px 0;font-weight:700;font-size:17px;color:#12324a">Total</td><td align="right" style="font-weight:700;font-size:17px;color:#12324a">${money(o.total)}</td></tr></table>`;
}

const addr = (a) => a ? [a.name, a.line1, a.line2, [a.city, a.state, a.zip].filter(Boolean).join(", "), a.country].filter(Boolean).map(esc).join("<br>") : "";
const p = (t) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${t}</p>`;
const box = (t) => `<div style="background:#f4fafe;border:1px dashed #4f9bc9;border-radius:10px;padding:14px 16px;margin:14px 0;font-size:15px">${t}</div>`;
const btn = (href, label, color = "#12324a") => `<p style="margin:18px 0"><a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:700;font-size:14px">${label}</a></p>`;

/* ---------- Customer emails ---------- */
export function customerOrderEmail(o) {
  if (o.method === "cashapp") {
    const tag = CASHTAG.replace("$", "");
    return {
      to: o.customer.email,
      subject: `Order ${o.id} received — send ${money(o.total)} on Cash App`,
      html: layout("Order received", p(`Hi ${first(o.customer.name)}, thanks for your order! To lock it in, send your payment on Cash App:`) +
        box(`Pay <b>${CASHTAG}</b><br>Amount: <b>${money(o.total)}</b><br>Note: <b>${o.id}</b>`) +
        btn(`https://cash.app/$${tag}/${o.total}`, `Pay ${money(o.total)} with Cash App`, "#00c244") +
        p("Your order is prepared once payment is confirmed, and we'll email you when it is. Please allow about <b>2 weeks</b> for delivery.") +
        itemsTable(o) + (o.address ? p(`<b>Shipping to</b><br>${addr(o.address)}`) : ""))
    };
  }
  return {
    to: o.customer.email,
    subject: `Order ${o.id} confirmed — ChrisDaChiro Therapy Tools`,
    html: layout("Order confirmed", p(`Hi ${first(o.customer.name)}, your payment went through and your order is in.`) +
      box(`Order number: <b>${o.id}</b>`) +
      p("Please allow about <b>2 weeks</b> for delivery. We'll email you tracking as soon as it ships.") +
      itemsTable(o) + (o.address ? p(`<b>Shipping to</b><br>${addr(o.address)}`) : ""))
  };
}

export function customerPaidEmail(o) {
  return {
    to: o.customer.email,
    subject: `Payment received — order ${o.id}`,
    html: layout("Payment received", p(`Hi ${first(o.customer.name)}, we got your Cash App payment of <b>${money(o.total)}</b>. Your order is officially in.`) +
      box(`Order number: <b>${o.id}</b>`) +
      p("Please allow about <b>2 weeks</b> for delivery. We'll email you tracking as soon as it ships.") + itemsTable(o))
  };
}

export function customerShippedEmail(o) {
  const t = o.tracking || {};
  return {
    to: o.customer.email,
    subject: `Your ChrisDaChiro order ${o.id} has shipped`,
    html: layout("It's on the way", p(`Hi ${first(o.customer.name)}, your order just shipped.`) +
      box(`${t.carrier ? esc(t.carrier) + " tracking" : "Tracking"}: <b>${esc(t.number || "—")}</b>`) +
      (t.url ? btn(t.url, "Track your package") : "") +
      itemsTable(o) + (o.address ? p(`<b>Shipping to</b><br>${addr(o.address)}`) : "") +
      p("Thanks for taking care of you. Tag <b>@" + IG + "</b> when you put it to work."))
  };
}

/* ---------- Admin alert ---------- */
export function adminNewOrderEmail(o, site) {
  const how = o.method === "cashapp" ? `Cash App — <b>awaiting payment</b> from ${esc(o.cashappName || "?")}` : "Card / Apple Pay — <b>paid</b>";
  return {
    to: process.env.ADMIN_EMAIL,
    replyTo: o.customer.email,
    subject: `New order ${o.id} · ${money(o.total)} · ${o.method === "cashapp" ? "Cash App (unpaid)" : "Paid"}`,
    html: layout("New order", box(`<b>${o.id}</b><br>${how}`) +
      p(`<b>${esc(o.customer.name)}</b><br>${esc(o.customer.email)}<br>${esc(o.customer.phone || "")}`) +
      itemsTable(o) + (o.address ? p(`<b>Ship to</b><br>${addr(o.address)}`) : "") +
      (o.notes ? p(`<b>Notes</b><br>${esc(o.notes)}`) : "") +
      btn(site + "/admin/", "Open dashboard"))
  };
}
