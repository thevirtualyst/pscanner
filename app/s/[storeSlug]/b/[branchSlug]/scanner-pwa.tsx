"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import {
  AlertCircle, ArrowLeft, CheckCircle, Loader2,
  Package, QrCode, ScanLine, ShoppingBag, XCircle,
} from "lucide-react";
import Image from "next/image";

const BarcodeScanner = dynamic(
  () => import("@/components/scanner/barcode-scanner"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Availability = "AVAILABLE" | "LIMITED" | "OUT_OF_STOCK";

type ScannedProduct = {
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  barcode: string;
  mrp: number;
  selling_price: number;
  offer_price: number | null;
  availability: Availability;
};

// ─── Availability display ─────────────────────────────────────────────────────

const AVAILABILITY: Record<Availability, { label: string; cls: string; dot: string }> = {
  AVAILABLE:    { label: "Available",         cls: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  LIMITED:      { label: "Limited Availability", cls: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-500"   },
  OUT_OF_STOCK: { label: "Out of Stock",      cls: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500"     },
};

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  storeName,
  branchName,
  onScanAgain,
}: {
  product: ScannedProduct;
  storeName: string;
  branchName: string;
  onScanAgain: () => void;
}) {
  const avail = AVAILABILITY[product.availability];
  const hasOffer = product.offer_price !== null && product.offer_price < product.selling_price;
  const activePrice = hasOffer ? product.offer_price! : product.selling_price;
  const discount = hasOffer
    ? Math.round(((product.selling_price - product.offer_price!) / product.selling_price) * 100)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={onScanAgain}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Scan another product"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{storeName}</p>
          <p className="truncate text-xs text-slate-400">{branchName}</p>
        </div>
        <button
          type="button"
          onClick={onScanAgain}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <ScanLine className="h-3.5 w-3.5" />
          Scan again
        </button>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-sm space-y-4">

          {/* Product image */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={400}
                height={300}
                className="h-56 w-full object-contain p-4"
              />
            ) : (
              <div className="flex h-44 items-center justify-center bg-slate-50">
                <Package className="h-16 w-16 text-slate-200" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            {/* Name + brand/category */}
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900">{product.name}</h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {product.brand && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {product.brand}
                  </span>
                )}
                {product.category && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {product.category}
                  </span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              {/* MRP */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">MRP</span>
                <span className={`font-medium ${hasOffer ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  ₹{product.mrp.toFixed(2)}
                </span>
              </div>

              {/* Selling price (show only if different from offer) */}
              {hasOffer && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Price</span>
                  <span className="font-medium text-slate-400 line-through">₹{product.selling_price.toFixed(2)}</span>
                </div>
              )}

              {/* Active price */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {hasOffer ? "Offer price" : "Price"}
                </span>
                <div className="flex items-center gap-2">
                  {discount && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      {discount}% off
                    </span>
                  )}
                  <span className="text-2xl font-extrabold text-slate-900">
                    ₹{activePrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${avail.cls}`}>
              <span className={`h-2 w-2 rounded-full ${avail.dot}`} />
              {avail.label}
            </div>
          </div>

          {/* Barcode */}
          <p className="text-center text-xs text-slate-400 font-mono">
            Barcode: {product.barcode}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Idle / scan prompt ───────────────────────────────────────────────────────

function IdleScreen({
  storeName,
  branchName,
  onStartScan,
}: {
  storeName: string;
  branchName: string;
  onStartScan: () => void;
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

        <button
          type="button"
          onClick={onStartScan}
          className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95"
        >
          <QrCode className="h-6 w-6" />
          Scan a product
        </button>

        <p className="text-xs text-slate-400">
          Point your camera at any product barcode to see price and availability.
        </p>
      </div>
    </div>
  );
}

// ─── PWA root component ───────────────────────────────────────────────────────

export default function ScannerPWA({
  branchId,
  branchName,
  storeName,
}: {
  branchId: string;
  branchName: string;
  storeName: string;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false); // true = fetching product
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleDetect = useCallback(async (barcode: string) => {
    setScannerOpen(false);
    setScanning(true);
    setProduct(null);
    setNotFound(false);
    setApiError("");

    try {
      const res = await fetch(
        `/api/public/scan?branchId=${encodeURIComponent(branchId)}&barcode=${encodeURIComponent(barcode)}`,
        { headers: { "x-device-type": "PWA" } }
      );
      const data = await res.json();

      if (data.success) {
        setProduct(data.product);
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        setApiError(data.error ?? "Something went wrong");
      }
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [branchId]);

  function reset() {
    setProduct(null);
    setNotFound(false);
    setApiError("");
    setScanning(false);
  }

  // ── Fetching result ──────────────────────────────────────────────────────────
  if (scanning) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Looking up product...</p>
      </div>
    );
  }

  // ── Product found ─────────────────────────────────────────────────────────────
  if (product) {
    return (
      <ProductCard
        product={product}
        storeName={storeName}
        branchName={branchName}
        onScanAgain={() => { reset(); setScannerOpen(true); }}
      />
    );
  }

  // ── Product not found ─────────────────────────────────────────────────────────
  if (notFound || apiError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm space-y-5 text-center">
          {notFound ? (
            <>
              <XCircle className="mx-auto h-16 w-16 text-slate-300" />
              <div>
                <p className="text-lg font-bold text-slate-900">Product not found</p>
                <p className="mt-1 text-sm text-slate-500">
                  This product isn't available in {branchName} yet. Ask a store associate for help.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-red-300" />
              <div>
                <p className="text-lg font-bold text-slate-900">Something went wrong</p>
                <p className="mt-1 text-sm text-slate-500">{apiError}</p>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => { reset(); setScannerOpen(true); }}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
          >
            <ScanLine className="h-5 w-5" />
            Try scanning again
          </button>
          <button type="button" onClick={reset} className="text-sm text-slate-400 hover:text-slate-600">
            Back
          </button>
        </div>
      </div>
    );
  }

  // ── Idle / home ───────────────────────────────────────────────────────────────
  return (
    <>
      <IdleScreen
        storeName={storeName}
        branchName={branchName}
        onStartScan={() => setScannerOpen(true)}
      />
      {scannerOpen && (
        <BarcodeScanner
          onDetect={handleDetect}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}
