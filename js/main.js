/* Prices, shipping and sold-out status are checked again on the server (netlify/lib/catalog.mjs)
   and can be changed from /admin. The values below are what shows before the live prices load. */
/* =========================================================
   ChrisDaChiro Therapy Tools — site settings
   Edit the values in CONFIG and PRODUCTS to update the site.
   ========================================================= */
const CONFIG = {
  shippingFlat: 5,                 // flat shipping per order (USD)
  cashtag: "ChrisPelecanos",       // Cash App $cashtag (no $)
  instagram: "ChrisDaChiro",
};

const PRODUCTS = [
  {
    id: "pillow",
    name: "Cervical Traction Pillow",
    price: 20,
    tag: "Neck relief",
    // Gallery, in order. The first image is the shop thumbnail. Each name maps to
    // assets/products/<name>.png plus <name>.webp and <name>-600.webp.
    images: [
      { src: "neck-mobility-tool-01-logo", alt: "Front view of the black neck mobility tool with the gold logo." },
      { src: "neck-mobility-tool-02-side", alt: "Side view of the black neck mobility tool showing its curved profile." },
      { src: "neck-mobility-tool-03-six-nodes", alt: "Black neck mobility tool showing six raised massage nodes." },
    ],
    desc: "A contoured traction pillow that cradles the neck in a gentle curve, made for unwinding after long hours at a desk, behind the wheel or on your feet.",
    features: [
      "Contoured design supports the natural curve of the neck",
      "Helps ease tension from screens and long workdays",
      "Lightweight, easy to use at home or take on the go",
    ],
  },
  {
    id: "gun",
    name: "Compact Massage Gun",
    price: 80,
    tag: "Muscle recovery",
    images: [
      { src: "mint-massage-gun-kit", alt: "Mint massage gun with a ball head and three interchangeable heads." },
    ],
    desc: "Percussive massage that fits in a bag. Work out soreness and tight spots before or after workouts, or whenever the day catches up with you.",
    features: [
      "Compact, travel-friendly size",
      "Multiple speed settings for warm-up and recovery",
      "Targets soreness, fatigue and muscle tension",
    ],
  },
];

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const money = (n) => "$" + n.toFixed(2);
const findP = (id) => PRODUCTS.find((p) => p.id === id);

/* ---------- cart state ---------- */
let cart = {};
try { cart = JSON.parse(localStorage.getItem("cdc-cart")) || {}; } catch (e) { cart = {}; }
const save = () => { try { localStorage.setItem("cdc-cart", JSON.stringify(cart)); } catch (e) {} };
const itemCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const subtotal = () => Object.entries(cart).reduce((s, [id, q]) => s + (findP(id)?.price || 0) * q, 0);
const shipping = () => (itemCount() > 0 ? CONFIG.shippingFlat : 0);
const total = () => subtotal() + shipping();

/* ---------- product images ---------- */
const IMG = "assets/products/";
function picture(im, cls) {
  return `<picture>
    <source type="image/webp" srcset="${IMG}${im.src}-600.webp 600w, ${IMG}${im.src}.webp 1200w" sizes="(max-width: 760px) 92vw, 560px" />
    <img class="${cls}" src="${IMG}${im.src}.png" alt="${im.alt}" width="1254" height="1254" loading="lazy" decoding="async" />
  </picture>`;
}

/* ---------- render products ---------- */
function renderProducts() {
  $("#products").innerHTML = PRODUCTS.map((p) => `
    <article class="product reveal" data-id="${p.id}">
      <div class="p-gallery">
        <div class="p-media">
          <span class="p-tag">${p.tag}</span>
          ${picture(p.images[0], "p-photo")}
        </div>
        ${p.images.length > 1 ? `<div class="p-thumbs" role="tablist" aria-label="${p.name} photos">
          ${p.images.map((im, i) => `<button type="button" class="p-thumb${i ? "" : " on"}" data-img="${i}" role="tab" aria-selected="${i ? "false" : "true"}" aria-label="Photo ${i + 1} of ${p.images.length}">
            <img src="${IMG}${im.src}-600.webp" alt="" loading="lazy" width="80" height="80" /></button>`).join("")}
        </div>` : ""}
      </div>
      <div class="p-body">
        <div class="p-top"><h3>${p.name}</h3><span class="price">${money(p.price)}</span></div>
        <p class="p-desc">${p.desc}</p>
        <ul class="p-feats">${p.features.map((f) => `<li>${f}</li>`).join("")}</ul>
        <div class="p-actions">
          <div class="qty" aria-label="Quantity">
            <button type="button" data-q="-1" aria-label="Decrease">−</button>
            <span class="q">1</span>
            <button type="button" data-q="1" aria-label="Increase">+</button>
          </div>
          <button class="btn btn-primary add" type="button" ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Sold out" : "Add to cart"}</button>
        </div>
      </div>
    </article>`).join("");

  document.querySelectorAll(".product").forEach((card) => {
    const qEl = $(".q", card);
    const prod = findP(card.dataset.id);
    card.querySelectorAll(".p-thumb").forEach((t) => t.addEventListener("click", () => {
      const im = prod.images[+t.dataset.img];
      $(".p-media picture", card).outerHTML = picture(im, "p-photo");
      card.querySelectorAll(".p-thumb").forEach((x) => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    }));
    card.querySelectorAll("[data-q]").forEach((b) =>
      b.addEventListener("click", () => {
        qEl.textContent = Math.max(1, Math.min(20, +qEl.textContent + +b.dataset.q));
      })
    );
    $(".add", card).addEventListener("click", () => {
      const id = card.dataset.id, q = +qEl.textContent;
      cart[id] = (cart[id] || 0) + q;
      qEl.textContent = 1;
      save(); renderCart(true);
      toast(`Added ${q} × ${findP(id).name}`);
    });
  });
}

/* ---------- cart drawer ---------- */
function renderCart(bump) {
  const ids = Object.keys(cart).filter((id) => cart[id] > 0 && findP(id));
  $("#cartItems").innerHTML = ids.length
    ? ids.map((id) => {
        const p = findP(id);
        return `<div class="c-item" data-id="${id}">
          <img src="${IMG}${p.images[0].src}-600.webp" alt="" />
          <div>
            <h4>${p.name}</h4>
            <div class="qty"><button data-c="-1" aria-label="Decrease">−</button><span>${cart[id]}</span><button data-c="1" aria-label="Increase">+</button></div>
            <button class="remove">Remove</button>
          </div>
          <div class="line">${money(p.price * cart[id])}</div>
        </div>`;
      }).join("")
    : `<p class="empty">Your cart is empty.<br/><a href="#shop" class="close-link">Shop the tools →</a></p>`;

  $("#cartItems").querySelectorAll(".c-item").forEach((row) => {
    const id = row.dataset.id;
    row.querySelectorAll("[data-c]").forEach((b) => b.addEventListener("click", () => {
      cart[id] += +b.dataset.c;
      if (cart[id] <= 0) delete cart[id];
      save(); renderCart();
    }));
    $(".remove", row).addEventListener("click", () => { delete cart[id]; save(); renderCart(); });
  });
  const cl = $(".close-link"); if (cl) cl.addEventListener("click", closeCart);

  $("#subtotal").textContent = money(subtotal());
  $("#shipping").textContent = money(shipping());
  $("#total").textContent = money(total());
  $("#checkoutBtn").disabled = !ids.length;
  const c = $("#cartCount");
  c.textContent = itemCount();
  if (bump) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
}

const overlay = $("#overlay"), drawer = $("#cart"), modal = $("#checkout");
function openCart() { drawer.classList.add("open"); overlay.classList.add("show"); drawer.setAttribute("aria-hidden", "false"); }
function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("show"); drawer.setAttribute("aria-hidden", "true"); }
$("#cartOpen").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

/* ---------- checkout ---------- */
function orderItems() {
  return Object.entries(cart).filter(([id, q]) => q > 0 && findP(id)).map(([id, qty]) => ({ id, qty }));
}
function payMethod() { return ($('#orderForm input[name="payment"]:checked') || {}).value || "card"; }
function syncPayFields() {
  const cash = payMethod() === "cashapp";
  $("#cashFields").hidden = !cash;
  $("#cardFields").hidden = cash;
  $("#placeOrder").textContent = cash ? `Place order · ${money(total())}` : "Continue to secure checkout";
  showError("");
}
function showError(msg) { const e = $("#coError"); e.textContent = msg; e.hidden = !msg; }

function openCheckout() {
  closeCart();
  $("#coSummary").innerHTML =
    Object.entries(cart).map(([id, q]) => `<div><span>${q} × ${findP(id).name}</span><span>${money(findP(id).price * q)}</span></div>`).join("") +
    `<div><span>Shipping</span><span>${money(shipping())}</span></div>
     <div class="grand"><span>Total</span><span>${money(total())}</span></div>`;
  $("#coForm").hidden = false; $("#coDone").hidden = true;
  syncPayFields();
  modal.classList.add("show"); modal.setAttribute("aria-hidden", "false");
}
function closeCheckout() { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); }
$("#checkoutBtn").addEventListener("click", openCheckout);
$("#coClose").addEventListener("click", closeCheckout);
modal.addEventListener("click", (e) => { if (e.target === modal) closeCheckout(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCheckout(); closeCart(); } });
document.querySelectorAll('#orderForm input[name="payment"]').forEach((r) => r.addEventListener("change", syncPayFields));
$("#orderForm").addEventListener("input", () => showError(""));

const encode = (data) => new URLSearchParams(data).toString();
async function postForm(data) { // contact form → Netlify Forms
  if (location.protocol === "file:") return;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  try { await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: encode(data), signal: ctrl.signal }); }
  catch (err) {} finally { clearTimeout(t); }
}
async function postJSON(url, body) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
    let data = {}; try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  } catch (e) {
    if (e.name === "AbortError" || e instanceof TypeError) throw new Error("We couldn't reach checkout. Check your connection and try again.");
    throw e;
  } finally { clearTimeout(t); }
}

$("#orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target, d = Object.fromEntries(new FormData(form)), method = payMethod();
  const btn = $("#placeOrder"), label = btn.textContent;
  showError("");

  if (method === "cashapp") {
    const need = { name: "your name", email: "your email", phone: "your phone", cashappName: "your Cash App name", line1: "your street address", city: "your city", state: "your state", zip: "your ZIP code" };
    const missing = Object.keys(need).find((k) => !String(d[k] || "").trim());
    if (missing) { showError("Please add " + need[missing] + "."); form.querySelector(`[name="${missing}"]`).focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(d.email)) { showError("Please enter a valid email."); return; }
  }

  btn.disabled = true; btn.textContent = method === "cashapp" ? "Placing order…" : "Opening secure checkout…";
  try {
    if (method === "card") {
      const r = await postJSON("/api/checkout", { items: orderItems() });
      location.href = r.url; // Stripe's hosted checkout (card, Apple Pay, Google Pay)
      return;
    }
    const r = await postJSON("/api/order", {
      items: orderItems(), website: d.website,
      customer: { name: d.name, email: d.email, phone: d.phone },
      address: { line1: d.line1, line2: d.line2, city: d.city, state: d.state, zip: d.zip, country: "US" },
      cashappName: d.cashappName, notes: d.notes,
    });
    const amt = money(r.total);
    $("#doneId").textContent = r.orderId;
    $("#doneMsg").innerHTML = `Thanks, ${d.name.trim().split(" ")[0]}! To finish, send <strong>${amt}</strong> to <strong>$${CONFIG.cashtag}</strong> on Cash App and put your order number in the note.${r.tax ? ` (Includes $${r.tax.toFixed(2)} sales tax.)` : ""} We've emailed you these details too.`;
    $("#payLink").href = `https://cash.app/$${CONFIG.cashtag}/${Number(r.total).toFixed(2)}`;
    $("#payLink").textContent = `Pay ${amt} on Cash App`;
    $("#coForm").hidden = true; $("#coDone").hidden = false;
    cart = {}; save(); renderCart(); form.reset();
  } catch (err) {
    showError(err.message);
  }
  btn.disabled = false; btn.textContent = label;
});

/* ---------- live prices from the server ---------- */
async function loadLivePrices() {
  if (location.protocol === "file:") return;
  try {
    const res = await fetch("/api/products", { cache: "no-store" });
    if (!res.ok) return;
    const { products } = await res.json();
    (products || []).forEach((lp) => { const p = findP(lp.id); if (p) { p.price = lp.price; p.soldOut = !!lp.soldOut; } });
    Object.keys(cart).forEach((id) => { if (findP(id) && findP(id).soldOut) delete cart[id]; });
    save(); renderProducts(); renderCart();
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  } catch (e) {}
}

/* ---------- contact form ---------- */
$("#contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await postForm(data);
  $("#contactNote").textContent = "Thanks! Your message was sent. We'll be in touch soon.";
  e.target.reset();
});

/* ---------- UI niceties ---------- */
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}
const menuBtn = $("#menuBtn"), nav = $("#nav");
menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("open"); menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => { nav.classList.remove("open"); menuBtn.classList.remove("open"); }));
window.addEventListener("scroll", () => $(".site-header").classList.toggle("scrolled", scrollY > 10), { passive: true });
$("#year").textContent = new Date().getFullYear();

renderProducts();
renderCart();
loadLivePrices();

const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: 0.12 })
  : null;
document.querySelectorAll(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
