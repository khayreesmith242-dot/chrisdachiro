// Stripe Tax. Turned on by setting STRIPE_TAX=on in Netlify (after Tax is set up in the Stripe dashboard).
// Card / Apple Pay: Stripe Checkout calculates tax itself (automatic_tax).
// Cash App: we ask Stripe's Tax Calculation API for the tax, then record it when the order is marked paid.

export const PRODUCT_TAX_CODE = "txcd_99999999"; // Stripe tax code: General - Tangible Goods
export const SHIPPING_TAX_CODE = "txcd_92010001"; // Stripe tax code: Shipping

export const taxEnabled = () =>
  !!process.env.STRIPE_SECRET_KEY && /^(1|true|on|yes)$/i.test(process.env.STRIPE_TAX || "");

const STATES = { alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",connecticut:"CT",delaware:"DE",
  "district of columbia":"DC",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",
  kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",
  montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC",
  "north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",
  tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY",
  "puerto rico":"PR" };
export function stateCode(s) {
  const v = String(s || "").trim();
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return STATES[v.toLowerCase().replace(/\./g, "")] || "";
}

async function stripe(path, params) {
  const res = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || "Stripe error " + res.status);
  return data;
}

// Returns { tax, calculationId } — tax in dollars. Never throws: on any problem returns tax 0 and logs.
export async function calculateTax(lines, shipping, address) {
  if (!taxEnabled()) return { tax: 0, calculationId: null };
  try {
    const p = new URLSearchParams();
    p.append("currency", "usd");
    lines.forEach((l, i) => {
      p.append(`line_items[${i}][amount]`, String(Math.round(l.total * 100)));
      p.append(`line_items[${i}][quantity]`, String(l.qty));
      p.append(`line_items[${i}][reference]`, `${l.id}-${i}`);
      p.append(`line_items[${i}][tax_code]`, PRODUCT_TAX_CODE);
      p.append(`line_items[${i}][tax_behavior]`, "exclusive");
    });
    if (shipping > 0) {
      p.append("shipping_cost[amount]", String(Math.round(shipping * 100)));
      p.append("shipping_cost[tax_behavior]", "exclusive");
      p.append("shipping_cost[tax_code]", SHIPPING_TAX_CODE);
    }
    p.append("customer_details[address][line1]", address.line1 || "");
    if (address.line2) p.append("customer_details[address][line2]", address.line2);
    p.append("customer_details[address][city]", address.city || "");
    const st = stateCode(address.state);
    if (st) p.append("customer_details[address][state]", st);
    p.append("customer_details[address][postal_code]", address.zip || "");
    p.append("customer_details[address][country]", address.country || "US");
    p.append("customer_details[address_source]", "shipping");
    const c = await stripe("tax/calculations", p);
    return { tax: (c.tax_amount_exclusive || 0) / 100, calculationId: c.id };
  } catch (e) {
    console.error("[tax] calculation failed — order placed without tax:", e.message);
    return { tax: 0, calculationId: null, error: e.message };
  }
}

// Records a Cash App sale in Stripe Tax so it shows up in Stripe's tax reports.
export async function recordTax(calculationId, orderId) {
  if (!calculationId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const p = new URLSearchParams({ calculation: calculationId, reference: orderId });
    const t = await stripe("tax/transactions/create_from_calculation", p);
    return t.id;
  } catch (e) {
    console.error("[tax] could not record transaction:", e.message);
    return null;
  }
}
