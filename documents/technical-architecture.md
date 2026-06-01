# Smart Retail Product Scanner — Technical Architecture

**Reference implementation:** `D:\Work\GitHub\Virtualist\gtm`  
**Stack:** Next.js 16 (App Router) · NextAuth.js v4 · Prisma 6 · MySQL · AWS S3 · AWS Amplify · ShadCN + Tailwind v4

---

## Folder Structure

Mirrors the `gtm` project layout exactly. No `src/` wrapper.

```
pscanner/
├── app/
│   ├── layout.tsx                    # Root layout: SessionProvider, global providers
│   ├── page.tsx                      # Redirect to /dashboard or /login
│   ├── globals.css
│   ├── favicon.ico
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts
│   │   ├── register/
│   │   │   └── route.ts              # Tenant onboarding (admin account creation)
│   │   ├── secured/                  # All routes here require auth
│   │   │   ├── tenants/              # Super-admin only
│   │   │   ├── branches/
│   │   │   ├── products/
│   │   │   ├── branch-products/
│   │   │   ├── promotions/
│   │   │   ├── integrations/         # API key management
│   │   │   ├── analytics/
│   │   │   ├── users/
│   │   │   └── roles/
│   │   ├── pos/                      # POS integration endpoints (API key auth)
│   │   │   └── v1/
│   │   │       └── sync/
│   │   │           └── product/route.ts
│   │   └── public/                   # No auth — customer-facing scan API
│   │       └── scan/route.ts
│   ├── (pages)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── unauthorized/
│   │   │   └── page.tsx
│   │   └── secured/                  # Protected — layout enforces auth
│   │       ├── layout.tsx            # Shared sidebar + header for portal
│   │       ├── dashboard/
│   │       │   └── page.tsx
│   │       ├── branches/
│   │       │   ├── page.tsx
│   │       │   └── [branchId]/page.tsx
│   │       ├── products/
│   │       │   ├── page.tsx
│   │       │   └── [productId]/page.tsx
│   │       ├── pricing/
│   │       │   └── page.tsx
│   │       ├── integrations/
│   │       │   └── page.tsx          # API key generation + usage logs
│   │       ├── analytics/
│   │       │   └── page.tsx
│   │       ├── users/
│   │       │   └── page.tsx
│   │       └── roles/
│   │           └── page.tsx
│   ├── s/                            # Customer-facing scanner PWA
│   │   └── [storeSlug]/
│   │       └── b/
│   │           └── [branchSlug]/
│   │               └── page.tsx      # Scan UI — public, no auth
│   └── providers/
│       ├── session-provider-wrapper.tsx
│       └── layout-header.tsx
├── components/
│   ├── ui/                           # ShadCN primitives
│   ├── dashboard/
│   ├── header/
│   ├── footer/
│   ├── table/                        # Shared TableContent, Pagination, Filter
│   ├── scanner/                      # BarcodeScanner, ProductCard, AvailabilityBadge
│   └── products/
├── lib/
│   ├── auth.ts                       # NextAuth config (authOptions)
│   ├── authz.ts                      # requirePermission(), requireAuthenticatedUser()
│   ├── prisma.ts                     # Prisma client singleton
│   ├── s3.ts                         # S3 upload helpers
│   └── utils.ts                      # cn(), misc helpers
├── hooks/
│   └── use-barcode-scanner.ts
├── types/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── middleware.ts
├── next.config.ts
├── components.json
├── tsconfig.json
└── package.json
```

---

## Authentication

Identical pattern to `gtm`. **NextAuth.js v4** with credentials provider.

### `lib/auth.ts`

```ts
// authOptions shared between route handler and getServerSession calls
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !await bcrypt.compare(credentials.password, user.password_hash)) {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          is_active: user.is_active,
          permissions: [], // loaded separately if RBAC needed
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user);
      return token;
    },
    async session({ session, token }) {
      session.user = token as any;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};
```

### `app/utils/getUserSession.ts`

```ts
// Same pattern as gtm — supports both cookie session and Bearer JWT fallback
export async function getUserSession(req?: Request) {
  const session = await getServerSession(authOptions);
  if (session) return session;

  // Bearer token fallback for POS API integrations
  const bearer = req?.headers.get("authorization")?.replace("Bearer ", "");
  if (bearer) {
    const decoded = jwt.verify(bearer, process.env.NEXTAUTH_SECRET!);
    return { user: decoded };
  }
  return null;
}
```

### `middleware.ts`

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|register|api|_next/static|_next/image|favicon.ico|s/).*)",
  ],
};
```

The customer scanner routes (`/s/*`) are excluded — they are public.

---

## Multi-Tenancy

Same approach as `gtm`: **row-level isolation via `tenant_id`**.

- Every user belongs to one tenant (`user.tenant_id`)
- Every business record carries `tenant_id`
- Session provides `session.user.tenant_id` automatically
- API routes filter all queries by tenant: `where: { tenant_id: session.user.tenant_id }`
- No middleware enforcing multi-tenancy — application-level filtering (same as gtm)

**POS API requests** authenticate via API key rather than session. The API key record maps to a `tenant_id` + `branch_id`, providing the same tenant scope.

---

## Database Schema (Prisma)

File: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─── Tenant (Retail Company) ──────────────────────────────────────────────

model Tenant {
  id         String   @id @default(uuid())
  name       String
  slug       String   @unique
  status     String   @default("active") // active | suspended | closed
  plan       String   @default("starter") // starter | growth | enterprise
  created_on DateTime @default(now())

  branches       Branch[]
  products       Product[]
  users          User[]
  api_keys       ApiKey[]
  scan_logs      ProductScanLog[]
}

// ─── Branch ───────────────────────────────────────────────────────────────

model Branch {
  id         String   @id @default(uuid())
  tenant_id  String
  name       String
  slug       String
  address    String?
  is_active  Boolean  @default(true)
  created_on DateTime @default(now())

  tenant         Tenant           @relation(fields: [tenant_id], references: [id])
  branch_products BranchProduct[]
  scan_logs      ProductScanLog[]
  api_keys       ApiKey[]

  @@unique([tenant_id, slug])
}

// ─── Product ──────────────────────────────────────────────────────────────

model Product {
  id          String   @id @default(uuid())
  tenant_id   String
  barcode     String
  name        String
  brand       String?
  category    String?
  image_url   String?
  created_on  DateTime @default(now())
  updated_on  DateTime @updatedAt

  tenant          Tenant          @relation(fields: [tenant_id], references: [id])
  branch_products BranchProduct[]
  scan_logs       ProductScanLog[]

  @@unique([tenant_id, barcode])
}

// ─── BranchProduct (pricing + inventory per branch) ─────────────────────

model BranchProduct {
  id             String   @id @default(uuid())
  tenant_id      String
  branch_id      String
  product_id     String
  mrp            Decimal  @db.Decimal(10, 2)
  selling_price  Decimal  @db.Decimal(10, 2)
  offer_price    Decimal? @db.Decimal(10, 2)
  stock_qty      Int      @default(0)
  is_active      Boolean  @default(true)
  updated_on     DateTime @updatedAt

  branch  Branch  @relation(fields: [branch_id], references: [id])
  product Product @relation(fields: [product_id], references: [id])

  @@unique([branch_id, product_id])
  @@index([tenant_id, branch_id, product_id])
}

// ─── API Key (POS integration) ────────────────────────────────────────────

model ApiKey {
  id          String    @id @default(uuid())
  tenant_id   String
  branch_id   String
  label       String?
  key_hash    String    @unique  // bcrypt hash of the actual key
  environment String    @default("production") // production | test
  is_active   Boolean   @default(true)
  last_used   DateTime?
  created_on  DateTime  @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  branch Branch @relation(fields: [branch_id], references: [id])
}

// ─── ProductScanLog (analytics) ───────────────────────────────────────────

model ProductScanLog {
  id          String   @id @default(uuid())
  tenant_id   String
  branch_id   String
  product_id  String
  device_type String   // PWA | KIOSK
  scanned_at  DateTime @default(now())

  tenant  Tenant  @relation(fields: [tenant_id], references: [id])
  branch  Branch  @relation(fields: [branch_id], references: [id])
  product Product @relation(fields: [product_id], references: [id])

  @@index([tenant_id, branch_id, scanned_at])
}

// ─── User ─────────────────────────────────────────────────────────────────

model User {
  id            String   @id @default(uuid())
  tenant_id     String
  email         String   @unique
  name          String
  role          String   @default("staff") // super_admin | admin | staff
  password_hash String
  is_active     Boolean  @default(true)
  created_on    DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])
}
```

---

## API Route Patterns

### Protected routes — `lib/authz.ts`

Mirror of gtm's `requireAuthenticatedUser` / `requirePermission`:

```ts
export async function requireAuthenticatedUser(req?: Request) {
  const session = await getUserSession(req);
  if (!session?.user) throw new Error("UNAUTHORIZED");
  if (!session.user.is_active) throw new Error("INACTIVE_USER");
  return session;
}

export function requireRole(role: string) {
  return async (req?: Request) => {
    const session = await requireAuthenticatedUser(req);
    if (session.user.role !== role && session.user.role !== "super_admin") {
      throw new Error("FORBIDDEN");
    }
    return session;
  };
}
```

### Example secured route — `app/api/secured/products/route.ts`

```ts
export async function GET(req: Request) {
  const session = await requireAuthenticatedUser(req);
  const { tenant_id } = session.user;

  const products = await prisma.product.findMany({
    where: { tenant_id },
    orderBy: { created_on: "desc" },
  });

  return Response.json(products);
}
```

### POS sync route — `app/api/pos/v1/sync/product/route.ts`

```ts
export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const keyRecord = await resolveApiKey(apiKey); // hashes and looks up ApiKey row
  if (!keyRecord) return Response.json({ error: "INVALID_KEY" }, { status: 401 });

  const body = await req.json();
  const { tenant_id, branch_id } = keyRecord;

  // Upsert product
  const product = await prisma.product.upsert({
    where: { tenant_id_barcode: { tenant_id, barcode: body.barcode } },
    update: { name: body.name, brand: body.brand, category: body.category },
    create: { tenant_id, barcode: body.barcode, name: body.name, brand: body.brand, category: body.category },
  });

  // Upsert branch pricing + stock
  await prisma.branchProduct.upsert({
    where: { branch_id_product_id: { branch_id, product_id: product.id } },
    update: {
      mrp: body.mrp,
      selling_price: body.sellingPrice,
      offer_price: body.offerPrice ?? null,
      stock_qty: body.stockQty,
    },
    create: {
      tenant_id,
      branch_id,
      product_id: product.id,
      mrp: body.mrp,
      selling_price: body.sellingPrice,
      offer_price: body.offerPrice ?? null,
      stock_qty: body.stockQty,
    },
  });

  return Response.json({ ok: true });
}
```

### Public scan route — `app/api/public/scan/route.ts`

```ts
// GET /api/public/scan?branchId=xxx&barcode=yyy
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const barcode = searchParams.get("barcode");

  const bp = await prisma.branchProduct.findFirst({
    where: {
      branch: { id: branchId },
      product: { barcode: barcode! },
      is_active: true,
    },
    include: { product: true },
  });

  if (!bp) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

  // Log the scan
  await prisma.productScanLog.create({
    data: {
      tenant_id: bp.tenant_id,
      branch_id: bp.branch_id,
      product_id: bp.product_id,
      device_type: req.headers.get("x-device-type") ?? "PWA",
    },
  });

  return Response.json({
    name: bp.product.name,
    brand: bp.product.brand,
    category: bp.product.category,
    imageUrl: bp.product.image_url,
    mrp: bp.mrp,
    sellingPrice: bp.selling_price,
    offerPrice: bp.offer_price,
    availability: stockToAvailability(bp.stock_qty),
  });
}

function stockToAvailability(qty: number) {
  if (qty === 0) return "OUT_OF_STOCK";
  if (qty <= 10) return "LIMITED";
  return "AVAILABLE";
}
```

---

## Customer PWA Route

`app/s/[storeSlug]/b/[branchSlug]/page.tsx`

This page:
1. Resolves `storeSlug` + `branchSlug` → `branchId` (server component, single DB query)
2. Passes `branchId` to `<ScannerPage>` client component
3. `ScannerPage` activates camera, detects barcodes, calls `/api/public/scan`
4. Renders `<ProductCard>` with the result

No authentication. No redirect. Fully public.

---

## Environment Variables

```env
# Database
DATABASE_URL="mysql://user:password@host:3306/pscanner"

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://app.domain.com"

# AWS
AWS_REGION="ap-south-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="pscanner-assets"

# App
NEXT_PUBLIC_APP_URL="https://app.domain.com"
```

---

## Key Dependencies

Mirror `gtm` package.json — only differences noted:

| Package | Purpose |
|---|---|
| `next-auth` | Authentication (same as gtm) |
| `@prisma/client` + `prisma` | ORM (same as gtm) |
| `bcrypt` | Password + API key hashing |
| `@aws-sdk/client-s3` | Product image uploads |
| `@zxing/library` | Barcode scanning in browser (PWA) |
| `@radix-ui/*` + `tailwindcss` v4 | UI (same as gtm) |
| `lucide-react` | Icons (same as gtm) |

`reactflow`, `web-push`, `nodemailer`, `xlsx` from gtm are **not needed** for MVP.

---

## AWS Amplify Deployment

Same setup as `gtm`:

- Connect GitHub repo to Amplify
- Set environment variables in Amplify console
- Build command: `npx prisma generate && next build`
- Output: `.next` (SSR mode)
- Database: MySQL RDS in `ap-south-1` (reuse same RDS instance, separate database)

---

## Deviations from gtm

| Area | gtm | pscanner |
|---|---|---|
| Tenant field name | `client_id` | `tenant_id` (clearer for multi-tenant SaaS context) |
| Public routes | None (all routes behind auth) | `/s/*` and `/api/public/*` are fully open |
| POS API auth | Not present | API key (`x-api-key` header) for `/api/pos/*` |
| Barcode scanning | Not present | `@zxing/library` in PWA + kiosk |
| RBAC granularity | Fine-grained permissions table | Role-only for MVP (`super_admin`, `admin`, `staff`) |
| Push notifications | Yes | Not in MVP |
| Real-time | Not present | Not in MVP (polling on scan is sufficient) |
