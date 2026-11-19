# PRELUXES — Agency Master Package & Integration Handoff

> **Brand**: Preluxes (`preluxes`) — *Temukan yang berharga. Rawat lebih lama.*
> **Model**: Single-Owner Curated Secondhand Fashion Marketplace (Bags, Apparel, Footwear, Accessories)
> **Currency / Timezone**: `IDR` / `Asia/Jakarta` (WIB)
> **Languages**: Indonesian (`id`), English (`en`), German (`de`), French (`fr`)
> **Target Agency AI Studio App**: `https://aistudio.google.com/apps/c6e048f9-6f7c-443c-a9fb-de31247fbd13?showPreview=true&showAssistant=true&fullscreenApplet=true`

---

## 1. Visual Identity & Design System

### Color Tokens
- **Main Peach (`#E9BBAA`)** — Primary CTAs, Announcement Bar, Active Badges, Brand Accent Cards
- **Peach Hover (`#DFA691`)** — Interactive hover/pressed state for `#E9BBAA`
- **Warm Ivory (`#FAF7F2`)** — Page background, soft editorial canvas
- **Pure White (`#FFFFFF`)** — Product cards, form containers, modals
- **Charcoal Ink (`#30302E`)** — Primary typography, hairline borders, logo wordmark
- **Pale Sky (`#BCD2DF`)** — Secondary soft badge & care highlight

### Typography
- **Headings / Editorial**: `Libre Baskerville` (serif, regular 400 / bold 700 / italic)
- **Body / UI Controls**: `Plus Jakarta Sans` (sans-serif, 400 / 500 / 600 / 700)
- **Prices / SKUs / Measurements**: `JetBrains Mono` (tabular-nums monospace)

### Brand Logo Files
1. **Original High-Res PNG Logo**: `/assets/aistudio/preluxes_52ad05c5.png`
2. **Vector Wordmark SVG (Charcoal)**: `/brand-kit/preluxes-logo-charcoal.svg`
3. **Social Header / Banner Card SVG (Peach `#E9BBAA`)**: `/brand-kit/preluxes-logo-peach-card.svg`
4. **Square Profile Avatar SVG (400×400)**: `/brand-kit/preluxes-logo-ivory-badge.svg`

---

## 2. Storefront Architecture & Navigation Map

- `/` — Editorial Home (Hero, Curated Categories, Featured Pieces, Preluxes Philosophy)
- `/shop`, `/new-arrivals`, `/sale`, `/category/:slug` — Filterable Catalog (Search, Condition Grade A–D, Fit/Gender, Availability, Sort)
- `/product/:slug` — Unique Piece Detail (Gallery, Exact CM Measurements, Open Defect Notes, Wishlist, Add to Cart)
- `/cart` (`Keranjang`) & `/checkout` — Server-validated cart, atomic stock reservation, courier selector, coupon support, WhatsApp Chat payment order creation
- `/order/:orderNumber` — Order Confirmation + Pre-filled WhatsApp Admin Payment Link (`https://wa.me/...`)
- `/about`, `/contact`, `/faq`, `/policies/:slug` — Editorial Story, Condition Grading Guide, Policies
- `/brand-kit` — Public Agency Brand Kit & Social Media Hub
- `/account/*` — Customer Profile, Saved Addresses, Order History & Tracking, Wishlist
- `/admin/dashboard` — Owner-only Admin Console (Products, Categories, Inventory Logs, Orders, WhatsApp Payment Confirmation, Coupons, CMS, Reports CSV, Master Package Export)

---

## 3. Live Agency & Social Studio API Integration

Your external Studio App (`c6e048f9-6f7c-443c-a9fb-de31247fbd13`) can pull live, CORS-enabled, PII-free store data directly over HTTPS:

| Endpoint | Auth | Purpose |
| :--- | :--- | :--- |
| `GET /api/integration/brand-kit.json` | Public (CORS `*`) | Brand colors, fonts, SVG/PNG logo URLs, CMS copy, grading definitions, 4-language tagline |
| `GET /api/integration/catalog-feed.json` | Public (CORS `*`) | Live published products (`isDemo` flag, IDR pricing, stock availability, cm measurements, image URLs, WhatsApp deep links, pre-built 4-language social captions) |
| `GET /api/integration/brand-assets.zip` | Public | Complete non-PII ZIP bundle (PNG + SVG logos, 7 editorial/product JPGs, brand tokens JSON, translations, handoff doc) |
| `GET /api/admin/master-package.zip` | Admin Bearer Token | Full codebase + Firestore schema/rules + tests + all Brand Kit visual assets ZIP |

---

## 4. Social Media Content Guidelines & Multilingual Templates

### Brand Voice
Warm, calm, transparent, refined, practical. Never exaggerate ("luxury steal!", "best price ever!"); always highlight **shape, material, exact cm measurements, and honest wear disclosures**.

### Copy Templates by Language
- **Indonesia (`id`)**:
  > *[Nama Produk]* · Grade [A/B/C/D]
  > Ukuran aktual: [Ukuran / CM] | Material: [Bahan]
  > Catatan kondisi: [Ringkasan jujur]
  > Harga: Rp [Harga] · Tersedia 1 unit unik.
  > Checkout via website atau chat Admin WhatsApp untuk reservasi.
  > *Temukan yang berharga. Rawat lebih lama.*
- **English (`en`)**:
  > *[Product Name]* · Condition Grade [A/B/C/D]
  > Measurements: [Size / CM] | Material: [Material]
  > Wear note: [Honest summary]
  > IDR [Price] · 1-of-1 curated piece. Reserve online or message Admin on WhatsApp.
- **Deutsch (`de`)**:
  > *[Artikelname]* · Zustand Note [A/B/C/D]
  > Maße: [Größe / CM] | Material: [Material]
  > Zustandshinweis: [Ehrliche Beschreibung]
  > IDR [Preis] · Einzelstück. Jetzt über den Shop oder per WhatsApp reservieren.
- **Français (`fr`)**:
  > *[Nom de l'article]* · État Grade [A/B/C/D]
  > Mesures réelles : [Taille / CM] | Matière : [Matière]
  > Remarque d’état : [Résumé transparent]
  > IDR [Prix] · Pièce unique. Commandez en ligne ou confirmez par WhatsApp.

---

## 5. Technical Stack & Security Boundaries

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express (`server.ts`, Node 22 compatible, port `3000`)
- **Database & Auth**: Firebase Auth + Cloud Firestore (`ai-studio-5e9b1765-ea67-4332-b3c2-a7c982f15320`)
- **Payment Workflow**: WhatsApp Chat confirmation (`paymentProvider: 'whatsapp_chat'`) with server-side optimistic concurrency stock reservation (`reservedQuantity`) and Admin-only settlement confirmation in `/api/payments/reconcile`.
- **Security**: Strict `firestore.rules` (only verified `hahspace@gmail.com` or `admins/{uid}` can manage store data or confirm payments; zero customer PII in public feeds).
