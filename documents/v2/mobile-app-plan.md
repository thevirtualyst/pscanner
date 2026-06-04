# pscanner Mobile App — v2 Plan

**Version:** 2.0  
**Status:** Planning  
**Stack:** Expo (React Native) · TypeScript · Existing pscanner REST API  
**Scope:** New standalone mobile app — existing PWA and kiosk are completely untouched

---

## 1. Why a Mobile App

The existing camera scanner PWA works but has a hard limitation on iOS — the browser cannot access Apple's native barcode detection hardware. A native Expo app uses `AVFoundation` (iOS) and ML Kit (Android) directly — instant detection on any size barcode, same as every scanner app on the App Store.

| Scanner | Small barcodes | Speed |
|---|---|---|
| Camera PWA (browser) | Struggles | Slow–Medium |
| Kiosk (Zebra CC6000) | Excellent | Instant |
| Native mobile app (Expo) | Excellent | Instant |

---

## 2. What Stays Unchanged

Everything that exists today remains exactly as-is. The mobile app is additive.

| Component | Status |
|---|---|
| Customer camera PWA (`/s/{store}/b/{branch}`) | No changes |
| Kiosk PWA (`/s/{store}/b/{branch}/kiosk`) | No changes |
| Admin portal (`/secured/...`) | No changes |
| All backend API routes | No changes |
| Database schema | No changes |

---

## 3. Phase 1 — Scope

**One sentence:** Customer launches the app, lands on a store+branch, taps scan, scans a barcode, sees product details, scans again.

**No login. No account. No sign-up.**

---

## 4. How a Customer Gets to the Right Store

Three entry points — all land on the same scanner screen for a specific store and branch.

### Entry Point A — GPS Auto-detect (best experience)
1. Customer walks into the store and opens the app
2. App requests location permission (once, on first launch)
3. App compares GPS coordinates to stored branch locations
4. If within ~100 metres of a branch → automatically navigates to that branch's scanner
5. No tapping needed — app just opens ready to scan

Each branch stores its latitude and longitude in the database. Store managers set this from the branch settings page in the admin portal.

### Entry Point B — QR Code at Shop
1. Store prints and displays the QR code generated from the admin portal (branch settings page)
2. Customer scans QR code with the app's built-in scanner
3. App opens directly on that store+branch scanner — no selection needed
4. If app is not installed → QR code URL opens the existing web PWA as fallback

### Entry Point C — Store List (manual fallback)
1. Customer opens the app, GPS doesn't match any branch nearby
2. App shows a searchable list of all active stores
3. Customer selects store → selects branch → lands on scanner
4. Selection is remembered — next launch skips this and goes straight to scanner

Priority order on launch: **GPS auto-detect → remembered selection → store list**.

---

## 5. Customer Flow

```
App launch
    │
    ├─ GPS matches a branch? ──Yes──► Scanner Screen (auto)
    │
    ├─ Branch remembered? ────Yes──► Scanner Screen
    │
    ├─ QR code scanned? ──────Yes──► Scanner Screen (deep link)
    │
    └─ None of above ──► Store List
                              │
                              └─ Select store ──► Branch List
                                                       │
                                                       └─ Select branch ──► Scanner Screen
                                                                                │
                                                                         Scan barcode
                                                                                │
                                                            ┌───────────────────┴──────────────────┐
                                                            │                                      │
                                                     Product found                           Not found
                                                            │                                      │
                                                    Product Detail                    "Not in this store"
                                                            │                                      │
                                                     [Scan again]                          [Scan again]
```

---

## 6. Screens

### Screen 1 — Store List
- Searchable list of all active stores (fetched from public API)
- Each store shows name and logo
- Tapping a store goes to Branch List

### Screen 2 — Branch List
- Lists all active branches for the selected store
- Shows branch name and address
- Tapping a branch saves selection and opens Scanner

### Screen 3 — Scanner
- Full-screen camera with scan guide overlay
- Store name and branch shown at top
- **Torch toggle** — for low-light conditions (important for real shelf scanning)
- **Change store** link — lets customer switch store/branch
- Scans automatically on detection — no button tap needed
- Supports: EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR Code

### Screen 4 — Product Detail
- Back button → returns to scanner (ready to scan again immediately)
- Product image gallery (swipeable)
- Name, brand, category, weight/volume
- MRP, selling price, offer price with discount badge
- Availability (Available / Limited / Out of Stock)
- Allergen warning (highlighted)
- Nutrition facts table
- Ingredients
- Usage & storage instructions
- Certifications
- Video link (if set)
- Legal / disclaimer

### Screen 5 — Product Not Found
- Clear message: product not in this store's catalogue
- One tap to scan again

---

## 7. QR Code Deep Link

Each branch has a unique deep link URL:

```
pscanner://s/{storeSlug}/b/{branchSlug}
```

Or as a universal/app link (fallback to web PWA if app not installed):

```
https://www.vmart.thevirtualyst.com/s/vmart/b/koramangala
```

When the QR code is scanned:
- **App installed** → Expo handles the deep link, opens scanner screen directly for that store+branch
- **App not installed** → URL opens in browser → existing web PWA loads (no broken experience)

The QR code for each branch is generated in the admin portal (existing Kiosk Setup page is the right place to add this — no code changes for v1 of the web app, this is a v2 web portal feature to generate and download the QR code PNG).

---

## 8. Technical Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Expo (managed workflow) | No native code needed, OTA updates via EAS |
| Language | TypeScript | Consistent with existing codebase |
| Navigation | Expo Router (file-based) | Mirrors Next.js App Router pattern |
| Barcode scanning | `expo-camera` with `onBarcodeScanned` | Native AVFoundation (iOS) + ML Kit (Android) |
| Local storage | `expo-secure-store` | Store selected branch locally |
| HTTP | `fetch` (built-in) | Already used in web app |
| Styling | NativeWind (Tailwind for RN) | Same utility classes as web app |
| Icons | `lucide-react-native` | Same icon set as web app |
| Deep linking | Expo Router deep links + Universal Links | QR code → app integration |

---

## 9. App Folder Structure

```
pscanner-mobile/
├── app/
│   ├── index.tsx               ← entry: redirect to scanner or store list
│   ├── stores.tsx              ← store list screen
│   ├── stores/
│   │   └── [storeSlug]/
│   │       └── branches.tsx    ← branch list for a store
│   ├── s/
│   │   └── [storeSlug]/
│   │       └── b/
│   │           └── [branchSlug]/
│   │               ├── index.tsx      ← scanner screen
│   │               └── product/
│   │                   └── [barcode].tsx  ← product detail
│   └── _layout.tsx
├── components/
│   ├── BarcodeScanner.tsx
│   ├── ProductDetail.tsx
│   ├── NutritionTable.tsx
│   ├── ImageGallery.tsx
│   └── PriceBlock.tsx
├── lib/
│   ├── api.ts                  ← fetch wrappers for pscanner API
│   ├── storage.ts              ← save/load selected branch
│   └── types.ts                ← product types (mirrors web app)
├── app.json
├── eas.json
└── tsconfig.json
```

---

## 10. API Integration

Zero backend changes. The app calls the same existing public APIs.

| API | Used for |
|---|---|
| `GET /api/public/store?slug=` | Load store + branches for onboarding |
| `GET /api/public/scan?branchId=&barcode=` | Fetch product after scan |

For the store list (Entry Point A), we need a public endpoint that returns all active stores. This is a small addition to the backend — one new public API route: `GET /api/public/stores` returning active tenant names, slugs, and logos.

---

## 11. What the Web App Needs (Additions)

### A. New public API — store list
```
GET /api/public/stores

Response:
{
  "stores": [
    {
      "name": "VMart",
      "slug": "vmart",
      "logo_url": null,
      "branches": [
        {
          "id": "...",
          "name": "Koramangala",
          "slug": "koramangala",
          "address": "...",
          "latitude": 12.9352,
          "longitude": 77.6245
        }
      ]
    }
  ]
}
```

### B. Schema addition — branch coordinates
Add `latitude` and `longitude` (optional decimal fields) to the `Branch` model.

### C. Admin portal — branch settings
- Add latitude/longitude inputs to the branch edit form
- Add **"Generate QR Code"** button on the branch settings page → downloads a branded QR code PNG ready to print

Everything else (scan API, store API) already exists.

---

## 12. Distribution

### Development & Testing
- **Expo Go** — scan QR code from `npx expo start`, runs on any device instantly, no build needed

### Client / Stakeholder Testing
- **EAS Build** → internal distribution link
- Android: APK download link (no Play Store needed)
- iOS: TestFlight invite

### Production
- **Android** → Play Store or direct APK sideload onto store devices
- **iOS** → App Store (requires Apple Developer account, $99/year)

---

## 13. Repo

Separate repository: `pscanner-mobile`

Keeps mobile and web completely independent. No risk of breaking the existing web app during mobile development.

---

## 14. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | App name | **Shelf** |
| 2 | Apple Developer account | Use Virtualist's account for now, move to a separate account at launch |
| 3 | Store list | Show all active stores on the platform |
| 4 | QR code deep linking | Phase 1 — web portal generates a QR code PNG per branch, app scans it to land directly on that branch's scanner |
| 5 | App icon / branding | Same green scanner icon as the web app for now |

---

## 15. Out of Scope for Phase 1

- Login or accounts of any kind
- Staff-specific features
- Inventory management
- Push notifications
- Scan history
- Product search by name
- Loyalty / royalty programme *(planned for a future phase)*
- Any changes to the existing web app, kiosk, or admin portal
