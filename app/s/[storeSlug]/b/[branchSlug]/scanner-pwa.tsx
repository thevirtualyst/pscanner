"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import {
  AlertCircle, ArrowLeft, ChevronLeft, ChevronRight,
  Loader2, Package, Play, QrCode, ScanLine, XCircle,
} from "lucide-react";
import Image from "next/image";

const BarcodeScanner = dynamic(
  () => import("@/components/scanner/barcode-scanner"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Availability = "AVAILABLE" | "LIMITED" | "OUT_OF_STOCK";

type NutritionData = {
  calories?: number | null; fat?: number | null; saturated_fat?: number | null;
  trans_fat?: number | null; carbohydrates?: number | null; sugar?: number | null;
  fiber?: number | null; protein?: number | null; sodium?: number | null;
  salt?: number | null; calcium?: number | null; iron?: number | null;
};

type ScannedProduct = {
  name: string; brand: string | null; category: string | null;
  barcode: string; image_url: string | null; images: { url: string }[];
  mrp: number; selling_price: number; offer_price: number | null;
  availability: Availability;
  // extended fields
  sku: string | null; weight_volume: string | null;
  ingredients: string | null; allergens: string | null;
  nutrition_json: string | null; serving_size: string | null;
  usage_instructions: string | null; storage_instructions: string | null;
  shelf_life: string | null; disclaimer: string | null;
  legal_info: string | null; certifications: string | null;
  video_url: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVAILABILITY: Record<Availability, { label: string; cls: string; dot: string }> = {
  AVAILABLE:    { label: "Available",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  LIMITED:      { label: "Limited Availability", cls: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500"   },
  OUT_OF_STOCK: { label: "Out of Stock",         cls: "bg-red-50 text-red-700 border-red-200",            dot: "bg-red-500"     },
};

const NUTRIENT_ROWS: { key: keyof NutritionData; label: string; unit: string; indent?: boolean }[] = [
  { key: "calories",      label: "Energy",          unit: "kcal" },
  { key: "fat",           label: "Total Fat",        unit: "g" },
  { key: "saturated_fat", label: "Saturated Fat",    unit: "g",  indent: true },
  { key: "trans_fat",     label: "Trans Fat",        unit: "g",  indent: true },
  { key: "carbohydrates", label: "Total Carbs",      unit: "g" },
  { key: "sugar",         label: "Total Sugar",      unit: "g",  indent: true },
  { key: "fiber",         label: "Dietary Fiber",    unit: "g",  indent: true },
  { key: "protein",       label: "Protein",          unit: "g" },
  { key: "sodium",        label: "Sodium",           unit: "mg" },
  { key: "salt",          label: "Salt",             unit: "g" },
  { key: "calcium",       label: "Calcium",          unit: "g" },
  { key: "iron",          label: "Iron",             unit: "mg" },
];

function parseNutrition(json: string | null): NutritionData | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

// ─── Image gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images, name }: { images: { url: string }[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center bg-slate-50">
        <Package className="h-16 w-16 text-slate-200" />
      </div>
    );
  }
  return (
    <div>
      {/* Main image */}
      <div className="relative overflow-hidden bg-white">
        <Image src={images[idx].url} alt={name} width={400} height={280}
          className="h-56 w-full object-contain p-4" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white">
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <button type="button" onClick={() => setIdx((i) => (i + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white">
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t border-slate-100">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === idx ? "border-blue-500" : "border-slate-200"
              }`}>
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, storeName, branchName, onScanAgain }: {
  product: ScannedProduct; storeName: string; branchName: string; onScanAgain: () => void;
}) {
  const avail = AVAILABILITY[product.availability];
  const hasOffer = product.offer_price !== null && product.offer_price < product.selling_price;
  const activePrice = hasOffer ? product.offer_price! : product.selling_price;
  const discount = hasOffer
    ? Math.round(((product.selling_price - product.offer_price!) / product.selling_price) * 100)
    : null;
  const nutrition = parseNutrition(product.nutrition_json);
  const allImages = product.images?.length ? product.images : (product.image_url ? [{ url: product.image_url }] : []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button type="button" onClick={onScanAgain}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{storeName}</p>
          <p className="truncate text-xs text-slate-400">{branchName}</p>
        </div>
        <button type="button" onClick={onScanAgain}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <ScanLine className="h-3.5 w-3.5" /> Scan again
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="mx-auto max-w-sm space-y-4">

          {/* Image gallery */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ImageGallery images={allImages} name={product.name} />
          </div>

          {/* Identity + pricing */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900">{product.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.brand && <Chip>{product.brand}</Chip>}
                {product.category && <Chip>{product.category}</Chip>}
                {product.weight_volume && <Chip>{product.weight_volume}</Chip>}
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">MRP</span>
                <span className={`font-medium ${hasOffer ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  ₹{product.mrp.toFixed(2)}
                </span>
              </div>
              {hasOffer && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Price</span>
                  <span className="font-medium text-slate-400 line-through">₹{product.selling_price.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{hasOffer ? "Offer price" : "Price"}</span>
                <div className="flex items-center gap-2">
                  {discount && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {discount}% off
                    </span>
                  )}
                  <span className="text-2xl font-extrabold text-slate-900">₹{activePrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${avail.cls}`}>
              <span className={`h-2 w-2 rounded-full ${avail.dot}`} />
              {avail.label}
            </div>
          </div>

          {/* Allergens — highlighted */}
          {product.allergens && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Allergen info</p>
              <p className="mt-1 text-sm text-amber-900">{product.allergens}</p>
            </div>
          )}

          {/* Nutrition facts */}
          {nutrition && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-900 bg-slate-900 px-4 py-3">
                <p className="text-sm font-bold text-white">Nutrition Facts</p>
                {product.serving_size && (
                  <p className="text-xs text-slate-400 mt-0.5">Serving size: {product.serving_size}</p>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {NUTRIENT_ROWS.map(({ key, label, unit, indent }) => {
                  const val = nutrition[key];
                  if (val == null) return null;
                  return (
                    <div key={key} className={`flex items-center justify-between px-4 py-2 ${indent ? "pl-8 bg-slate-50/50" : ""}`}>
                      <span className={`text-sm ${indent ? "text-slate-500" : "font-medium text-slate-700"}`}>{label}</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {key === "sodium" ? `${val} mg` : `${val} g`}
                        {key === "calories" && " kcal"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ingredients</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{product.ingredients}</p>
            </div>
          )}

          {/* Usage & Storage */}
          {(product.usage_instructions || product.storage_instructions || product.shelf_life) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              {product.usage_instructions && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">How to use</p>
                  <p className="mt-1 text-sm text-slate-700">{product.usage_instructions}</p>
                </div>
              )}
              {product.storage_instructions && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Storage</p>
                  <p className="mt-1 text-sm text-slate-700">{product.storage_instructions}</p>
                </div>
              )}
              {product.shelf_life && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shelf life</p>
                  <p className="mt-1 text-sm text-slate-700">{product.shelf_life}</p>
                </div>
              )}
            </div>
          )}

          {/* Certifications */}
          {product.certifications && (
            <div className="flex flex-wrap gap-2">
              {product.certifications.split("·").map((c) => c.trim()).filter(Boolean).map((cert) => (
                <span key={cert} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {cert}
                </span>
              ))}
            </div>
          )}

          {/* Video */}
          {product.video_url && (
            <a href={product.video_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100">
              <Play className="h-4 w-4 shrink-0" />
              Watch product video
            </a>
          )}

          {/* Legal / disclaimer */}
          {(product.disclaimer || product.legal_info) && (
            <div className="space-y-1.5">
              {product.disclaimer && (
                <p className="text-xs text-slate-400 leading-relaxed">{product.disclaimer}</p>
              )}
              {product.legal_info && (
                <p className="text-xs text-slate-400 leading-relaxed">{product.legal_info}</p>
              )}
            </div>
          )}

          {/* Barcode */}
          <p className="text-center text-xs text-slate-400 font-mono">Barcode: {product.barcode}</p>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

// ─── Idle screen ──────────────────────────────────────────────────────────────

function IdleScreen({ storeName, branchName, onStartScan }: {
  storeName: string; branchName: string; onStartScan: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-lg shadow-blue-600/30">
          <ScanLine className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{storeName}</h1>
          <p className="mt-1 text-sm text-slate-500">{branchName}</p>
        </div>
        <button type="button" onClick={onStartScan}
          className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95">
          <QrCode className="h-6 w-6" /> Scan a product
        </button>
        <p className="text-xs text-slate-400">
          Point your camera at any product barcode to see price and availability.
        </p>
      </div>
    </div>
  );
}

// ─── PWA root ─────────────────────────────────────────────────────────────────

export default function ScannerPWA({ branchId, branchName, storeName }: {
  branchId: string; branchName: string; storeName: string;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning]       = useState(false);
  const [product, setProduct]         = useState<ScannedProduct | null>(null);
  const [notFound, setNotFound]       = useState(false);
  const [apiError, setApiError]       = useState("");

  const handleDetect = useCallback(async (barcode: string) => {
    setScannerOpen(false); setScanning(true);
    setProduct(null); setNotFound(false); setApiError("");
    try {
      const res = await fetch(
        `/api/public/scan?branchId=${encodeURIComponent(branchId)}&barcode=${encodeURIComponent(barcode)}`,
        { headers: { "x-device-type": "PWA" } }
      );
      const data = await res.json();
      if (data.success)          setProduct(data.product);
      else if (res.status === 404) setNotFound(true);
      else                        setApiError(data.error ?? "Something went wrong");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [branchId]);

  function reset() {
    setProduct(null); setNotFound(false); setApiError(""); setScanning(false);
  }

  if (scanning) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-sm font-medium text-slate-500">Looking up product...</p>
    </div>
  );

  if (product) return (
    <ProductCard product={product} storeName={storeName} branchName={branchName}
      onScanAgain={() => { reset(); setScannerOpen(true); }} />
  );

  if (notFound || apiError) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        {notFound
          ? <><XCircle className="mx-auto h-16 w-16 text-slate-300" />
              <div>
                <p className="text-lg font-bold text-slate-900">Product not found</p>
                <p className="mt-1 text-sm text-slate-500">
                  This product isn't available in {branchName} yet.
                </p>
              </div></>
          : <><AlertCircle className="mx-auto h-16 w-16 text-red-300" />
              <div>
                <p className="text-lg font-bold text-slate-900">Something went wrong</p>
                <p className="mt-1 text-sm text-slate-500">{apiError}</p>
              </div></>
        }
        <button type="button" onClick={() => { reset(); setScannerOpen(true); }}
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700">
          <ScanLine className="h-5 w-5" /> Try again
        </button>
        <button type="button" onClick={reset} className="text-sm text-slate-400 hover:text-slate-600">Back</button>
      </div>
    </div>
  );

  return (
    <>
      <IdleScreen storeName={storeName} branchName={branchName} onStartScan={() => setScannerOpen(true)} />
      {scannerOpen && (
        <BarcodeScanner onDetect={handleDetect} onClose={() => setScannerOpen(false)} />
      )}
    </>
  );
}
