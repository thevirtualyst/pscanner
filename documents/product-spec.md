# Smart Retail Product Scanner Platform

## Product Specification — MVP

**Version:** 1.0  
**Status:** Draft

---

## Executive Summary

Smart Retail Product Scanner Platform is a multi-tenant SaaS solution that enables retail stores to give customers instant product information through barcode scanning — no app installation required.

Customers scan a product barcode using their phone or an in-store kiosk and immediately see:

- Product name, image, brand, and category
- MRP, selling price, and active offer price
- Availability status (Available / Limited / Out of Stock)

The platform connects to each retailer's POS system via API so pricing and inventory stay synchronized automatically.

---

## Problem

**Customers inside stores:**
- Cannot easily verify prices
- Encounter missing or outdated shelf labels
- Have no visibility into current promotions
- Must find a staff member to answer basic questions

**Retailers:**
- Staff spend disproportionate time answering price queries
- POS systems are back-of-house tools with no customer-facing layer
- Limited in-store customer engagement
- No signal on which products customers are actually interested in

---

## Solution

A cloud platform with four integrated components:

| Component | Who Uses It | Access |
|---|---|---|
| Customer PWA | Shoppers | `app.domain.com/s/{store}/b/{branch}` |
| Kiosk App | In-store self-service | `kiosk.domain.com` (kiosk mode) |
| Store Management Portal | Retail admins | Web dashboard |
| POS Integration API | Retailer billing software | REST API + API keys |

---

## Target Market

**Primary:**
- Supermarkets and grocery chains
- Hypermarkets

**Secondary:**
- Pharmacies
- Electronics stores
- Bookstores
- Hardware stores

**Sweet spot for initial sales:** Retailers with 2–20 branches. Large enough to need automation, small enough that custom software is out of reach.

---

## Customer Journey

1. Store displays a QR code at the entrance or shelf.
2. Customer scans the QR with their phone.
3. Browser opens `app.domain.com/s/{store-slug}/b/{branch-slug}` — no install prompt, no sign-up.
4. Camera activates for barcode scanning.
5. Customer scans any product barcode.
6. Product details render instantly.

---

## Product Information Display

### Product Card (what the customer sees)

```
┌─────────────────────────────────┐
│  [Product Image]                │
│                                 │
│  Parle-G Biscuit                │
│  Parle · Biscuits & Snacks      │
│                                 │
│  MRP        ₹50                 │
│  Price      ₹45                 │
│  Offer      ₹42  ← if active    │
│                                 │
│  ● Available                    │
└─────────────────────────────────┘
```

### Availability Rules

Exact stock counts are never shown to customers (inventory changes between scan and billing).

| Stock Quantity | Display Label |
|---|---|
| > 10 | Available |
| 1 – 10 | Limited Availability |
| 0 | Out of Stock |

---

## Architecture

### Multi-Tenancy

Each retail company is a **Tenant**. All database records carry a `tenantId`. Data is never shared across tenants.

```
Platform
├── Tenant: ABC Supermarket
│   ├── Branch: Koramangala
│   └── Branch: Indiranagar
├── Tenant: XYZ Pharmacy
│   └── Branch: MG Road
└── Tenant: Electronics World
    └── Branch: Whitefield
```

### Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + Tailwind CSS + ShadCN UI | Single codebase for portal, PWA, and kiosk |
| Backend | Next.js Route Handlers | Co-located with frontend, reduces infra |
| ORM | Prisma | Type-safe DB access, easy migrations |
| Database | MySQL | Sufficient for projected scale; no PostgreSQL needed |
| File Storage | AWS S3 | Product images |
| Hosting | AWS Amplify | Managed deployment |
| Mobile | PWA | No app store approval; works on iOS and Android |

### Why PWA Instead of Native Apps

- Single codebase covers all platforms
- No App Store / Play Store submission cycle
- Instant deployment of updates
- Sufficient capability for scanning and display use cases
- Native apps can follow in a later phase if needed

---

## Database Schema (Logical)

```
Tenant
  id, name, slug, plan, createdAt

Branch
  id, tenantId, name, slug, address, isActive

Product
  id, tenantId, barcode, name, brand, category, imageUrl, createdAt

BranchProduct
  id, tenantId, branchId, productId
  mrp, sellingPrice, offerPrice
  stockQty, isActive

ProductScanLog
  id, tenantId, branchId, productId
  deviceType (PWA | KIOSK), scannedAt
```

---

## POS Integration API

### Authentication

Each tenant receives:
- A **production API key + secret**
- A **test API key + secret**

Every request must supply both. The platform resolves the tenant and branch from the key before processing.

### Product Sync Endpoint

`POST /api/v1/sync/product`

```json
{
  "barcode": "8901030974654",
  "name": "Parle-G Biscuit 100g",
  "brand": "Parle",
  "category": "Biscuits & Snacks",
  "mrp": 50,
  "sellingPrice": 45,
  "offerPrice": 42,
  "stockQty": 18
}
```

Platform response: upserts Product + BranchProduct records immediately.

### Behavior

- Unknown barcode → creates a new product record
- Known barcode → updates pricing and stock only
- `offerPrice` is optional; omit or set to `null` to remove active offer

---

## Store Management Portal

Retail administrators can perform the following:

**Branch Management**
- Create and update branch records
- Enable / disable branches

**Product Management**
- Add products manually
- Edit product metadata (name, brand, category)
- Upload product images to S3

**Pricing Management**
- Set or override MRP, selling price, offer price per branch
- Schedule or remove promotions

**POS Integration**
- Generate and rotate API keys
- View API request logs and error counts

**Analytics**
- Most-scanned products per branch
- Scan volume over time
- Customer interest signals (scanned but not purchased — future)

---

## Scalability Targets

| Metric | Target |
|---|---|
| Tenants | 100 |
| Branches per tenant | 5 (avg) |
| Products per tenant | 10,000 |
| Total products | ~1,000,000 |
| BranchProduct records | ~5,000,000 |

MySQL handles this comfortably. Redis caching is planned for Phase 2.

### Caching Plan (Phase 2)

Cache key: `product_price:{tenantId}:{branchId}:{barcode}`  
Store: AWS ElastiCache (Redis)  
Invalidation: on every POS sync write

---

## MVP Scope

### In Scope

- Multi-tenant SaaS platform
- Store management portal (branches, products, pricing, promotions)
- Customer PWA with barcode scanning
- In-store kiosk application
- POS integration REST API
- Product lookup with offer and availability display
- Scan analytics (volume, top products)

### Out of Scope (Future Phases)

| Feature | Phase |
|---|---|
| Loyalty programs | 2 |
| Digital coupons | 2 |
| Customer profiles | 2 |
| Shopping lists | 2 |
| Personalized offers | 3 |
| Push notifications | 3 |
| Product recommendations | 3 |
| Self-checkout | 4 |
| QR payments | 4 |
| AI / voice product search | 4 |
| Native iOS / Android apps | TBD |

---

## Revenue Model

| Plan | Branches | Target |
|---|---|---|
| Starter | 1 | Single-location stores |
| Growth | 2–10 | Regional chains |
| Enterprise | 10+ | Large chains + custom integrations |

Billing is monthly SaaS subscription. Per-branch pricing can be applied at the Growth tier and above.

---

## Success Criteria (MVP)

A customer can:
1. Walk into a participating store.
2. Scan the QR code at the entrance.
3. Open the scanner in their browser — no download required.
4. Scan any product barcode.
5. See accurate name, image, price, and availability in under two seconds.

A retailer can:
1. Onboard in under 30 minutes (create tenant, add branch, connect POS).
2. Keep product data synchronized automatically via API.
3. Push price changes and promotions that reflect immediately for scanning customers.

---

## Competitive Positioning

The platform is not a price checker. It is a **digital store assistant** — the first touchpoint in a broader customer engagement layer for physical retail.

The scanner is the entry point. The long-term product is a complete in-store digital experience platform: loyalty, recommendations, self-checkout, and payments — built on top of the identity established when a customer first scans a QR code.
