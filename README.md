# CDCTherapyTools.com — Site Guide

## What's in here
| Path | What it does |
|---|---|
| `index.html` | Storefront: hero, products, about, shipping, FAQ, contact |
| `success.html` | Thank-you page after a card / Apple Pay payment |
| `css/style.css` | All styling |
| `js/main.js` | Product display text, cart, checkout |
| `admin/index.html` | Password-protected dashboard (orders + products) |
| `netlify/functions/*.mjs` | **Back end**: card checkout, Cash App orders, Stripe webhook, admin API, live prices |
| `netlify/lib/*.mjs` | Database, product catalog + shipping, emails, sales tax, auth |
| `assets/` | Logo, favicon, product placeholder illustrations |

## Checkout
- **Card / Apple Pay / Google Pay:** the customer is sent to Stripe's secure checkout page, which collects the shipping address and payment. When Stripe confirms the payment, the order shows up in /admin as **Paid** and both emails go out.
- **Cash App ($ChrisPelecanos):** the customer enters their details on the site, the order is saved as **Awaiting payment**, and they get a Cash App button with the exact total. Mark it **Paid** in /admin once the money arrives; that emails the customer a confirmation.
- Shipping is a flat **$5 per order** (`SHIPPING` in `netlify/lib/catalog.mjs`).

## Product photos
Photos live in `assets/products/`. Each one has three versions: `name.png` (original), `name.webp` (1200px) and `name-600.webp` (thumbnails and phones). Browsers load the WebP files; the PNG is only a fallback.

To add or swap a photo:
1. Save it as a square image, then create the WebP versions (any converter works, e.g. squoosh.app), using the same name.
2. In `js/main.js`, add it to the product's `images` list with alt text. The first image is the shop thumbnail; with more than one, a thumbnail gallery appears under the main photo.

Photos are shown square and uncropped (`object-fit: contain`) on every screen size.

Chris's photo: in `index.html`, replace `<div class="photo-placeholder">…</div>` in the About section with
`<img src="assets/chris.jpg" alt="Chris" style="width:100%;height:100%;object-fit:cover">`.

## Admin dashboard: cdctherapytools.com/admin
- **Orders:** every card and Cash App order. Filter, search, open an order for items, customer, address and payment, and export to CSV.
- **Statuses:** Awaiting payment → Paid → Preparing → Shipped (or Cancelled). Marking *Shipped* requires a tracking number and emails the customer a tracking link.
- **Products:** change prices and sold-out status. Saves go live instantly and are what customers are charged.

Orders are stored in **Netlify Blobs** (built in, nothing to set up).

## Stripe: use the ChrisDaChiro account, not BWF's
Create a separate account for this business in Stripe (account menu, top left → **New account**), named *ChrisDaChiro Therapy Tools*, and finish its business + bank verification. All keys below come from **that** account, so payouts, statements and reports stay separate from BWFClothing.

## Environment variables (Netlify → Site configuration → Environment variables)
| Name | What it is | Needed for |
|---|---|---|
| `ADMIN_PASSWORD` | Password for /admin (make it long) | Dashboard |
| `STRIPE_SECRET_KEY` | ChrisDaChiro Stripe account → Developers → API keys → Secret key | Card / Apple Pay |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`, see below) | Card orders marked paid automatically |
| `RESEND_API_KEY` | resend.com → API Keys | Automatic emails |
| `EMAIL_FROM` | e.g. `ChrisDaChiro Therapy Tools <orders@cdctherapytools.com>` | Emails |
| `ADMIN_EMAIL` | Where new-order alerts go | Order alerts |
| `STRIPE_TAX` | `on`, only after Stripe Tax is set up | Automatic sales tax |

Redeploy after adding or changing any of these.

### Stripe webhook (one time, in the ChrisDaChiro account)
Developers → Webhooks → **Add endpoint**
- URL: `https://cdctherapytools.com/api/stripe-webhook` (or the `.netlify.app` address until the domain is connected)
- Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`
- Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

### Sales tax (optional)
Stripe → Settings → Tax: add the origin address and the states where the business is registered to collect tax, then set `STRIPE_TAX` = `on`.

### Emails (Resend)
Add `cdctherapytools.com` under Domains in Resend, add its DNS records, then create an API key. Until then, orders still save to the dashboard and emails are skipped.

## Deploying
The back end only deploys through **GitHub** or the **Netlify CLI**, not drag-and-drop. Connect this repo in Netlify (Add new project → Import from Git) and it deploys on every push. With drag-and-drop the storefront loads but checkout and the dashboard won't work.

## Domain
Netlify → Domain management → add `cdctherapytools.com`, then point the domain's DNS at Netlify.
