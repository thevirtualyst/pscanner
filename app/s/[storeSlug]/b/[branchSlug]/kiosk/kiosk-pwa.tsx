"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle, ArrowLeft, ChevronLeft, ChevronRight,
  Download, Loader2, Package, Play, ScanLine, XCircle,
} from "lucide-react";

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
  sku: string | null; weight_volume: string | null;
  ingredients: string | null; allergens: string | null;
  nutrition_json: string | null; serving_size: string | null;
  usage_instructions: string | null; storage_instructions: string | null;
  shelf_life: string | null; disclaimer: string | null;
  legal_info: string | null; certifications: string | null;
  video_url: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_RESET_SECONDS = 30;

const AVAILABILITY: Record<Availability, { label: string; cls: string; dot: string }> = {
  AVAILABLE:    { label: "Available",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  LIMITED:      { label: "Limited Availability", cls: "bg-amber-50 text-amber-700 border-amber-200",      dot: "bg-amber-500"   },
  OUT_OF_STOCK: { label: "Out of Stock",         cls: "bg-red-50 text-red-700 border-red-200",            dot: "bg-red-500"     },
};

const NUTRIENT_ROWS: { key: keyof NutritionData; label: string; unit: string; indent?: boolean }[] = [
  { key: "calories",      label: "Energy",          unit: "kcal" },
  { key: "fat",           label: "Total Fat",        unit: "g" },
  { key: "saturated_fat", label: "Saturated Fat",    unit: "g", indent: true },
  { key: "trans_fat",     label: "Trans Fat",        unit: "g", indent: true },
  { key: "carbohydrates", label: "Total Carbs",      unit: "g" },
  { key: "sugar",         label: "Total Sugar",      unit: "g", indent: true },
  { key: "fiber",         label: "Dietary Fiber",    unit: "g", indent: true },
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onDismiss, countdown }: {
  product: ScannedProduct; onDismiss: () => void; countdown: number;
}) {
  const avail = AVAILABILITY[product.availability];
  const hasOffer = product.offer_price !== null && product.offer_price < product.selling_price;
  const activePrice = hasOffer ? product.offer_price! : product.selling_price;
  const discount = hasOffer
    ? Math.round(((product.selling_price - product.offer_price!) / product.selling_price) * 100)
    : null;
  const nutrition = parseNutrition(product.nutrition_json);
  const allImages = product.images?.length ? product.images : (product.image_url ? [{ url: product.image_url }] : []);
  const progress = (countdown / AUTO_RESET_SECONDS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
        <button type="button" onClick={onDismiss}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">Scan another product</p>
          <p className="truncate text-xs text-slate-400">Auto-reset in {countdown}s</p>
        </div>
        {/* Countdown progress bar */}
        <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="mx-auto max-w-sm space-y-4">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ImageGallery images={allImages} name={product.name} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h1 className="text-xl font-bold leading-tight text-slate-900">{product.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.brand && <Chip>{product.brand}</Chip>}
                {product.category && <Chip>{product.category}</Chip>}
                {product.weight_volume && <Chip>{product.weight_volume}</Chip>}
              </div>
            </div>

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

            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${avail.cls}`}>
              <span className={`h-2 w-2 rounded-full ${avail.dot}`} />
              {avail.label}
            </div>
          </div>

          {product.allergens && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Allergen info</p>
              <p className="mt-1 text-sm text-amber-900">{product.allergens}</p>
            </div>
          )}

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

          {product.ingredients && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ingredients</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{product.ingredients}</p>
            </div>
          )}

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

          {product.certifications && (
            <div className="flex flex-wrap gap-2">
              {product.certifications.split("·").map((c) => c.trim()).filter(Boolean).map((cert) => (
                <span key={cert} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {cert}
                </span>
              ))}
            </div>
          )}

          {product.video_url && (
            <a href={product.video_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100">
              <Play className="h-4 w-4 shrink-0" />
              Watch product video
            </a>
          )}

          {(product.disclaimer || product.legal_info) && (
            <div className="space-y-1.5">
              {product.disclaimer && <p className="text-xs text-slate-400 leading-relaxed">{product.disclaimer}</p>}
              {product.legal_info  && <p className="text-xs text-slate-400 leading-relaxed">{product.legal_info}</p>}
            </div>
          )}

          <p className="text-center text-xs text-slate-400 font-mono">Barcode: {product.barcode}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Idle screen ──────────────────────────────────────────────────────────────

type KioskConfig = {
  logoUrl:     string | null | undefined;
  videoUrl:    string | null | undefined;
  headline:    string | null | undefined;
  subtitle:    string | null | undefined;
  ctaText:     string | null | undefined;
  accentColor: string | null | undefined;
};

function IdleScreen({ storeName, branchName, config, onInstall, canInstall }: {
  storeName: string; branchName: string; config: KioskConfig;
  canInstall: boolean; onInstall: () => void;
}) {
  const accent  = config.accentColor || "#2563eb";
  const headline = config.headline   || storeName;
  const subtitle = config.subtitle   || branchName;
  const cta      = config.ctaText    || "Place product under the scanner";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 select-none overflow-hidden bg-slate-900">
      {/* Background video */}
      {config.videoUrl && (
        <video
          src={config.videoUrl}
          autoPlay loop muted playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}

      {/* Overlay gradient so text is always readable */}
      <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/50" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        {/* Logo or animated scan icon */}
        {config.logoUrl ? (
          <img src={config.logoUrl} alt={headline}
            className="mx-auto h-20 w-auto object-contain drop-shadow-lg" />
        ) : (
          <div
            className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl shadow-xl animate-pulse"
            style={{ backgroundColor: accent, boxShadow: `0 20px 40px ${accent}50` }}
          >
            <ScanLine className="h-14 w-14 text-white" />
          </div>
        )}

        <div>
          <h1 className="text-4xl font-bold text-white drop-shadow">{headline}</h1>
          <p className="mt-2 text-lg text-white/70">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-5">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: accent }}>
            <ScanLine className="h-5 w-5 text-white" />
          </div>
          <p className="text-lg font-semibold text-white">{cta}</p>
          <p className="mt-1 text-sm text-white/60">Product details will appear automatically</p>
        </div>

        {/* Install prompt — only shown when browser supports it and app isn't installed yet */}
        {canInstall && (
          <button type="button" onClick={onInstall}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur-sm hover:bg-white/20 transition">
            <Download className="h-4 w-4" />
            Install as app
          </button>
        )}
      </div>
    </div>
  );
}

// Capture install prompt as early as possible — before React hydrates
let _installPrompt: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); _installPrompt = e; });
}

// ─── Debug panel ─────────────────────────────────────────────────────────────

function DebugPanel({ log, onClear }: { log: string[]; onClear: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-300 font-mono">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-sm font-bold text-slate-800">DEBUG — {log.length} lines</span>
        <button
          type="button"
          onClick={onClear}
          className="rounded bg-red-500 px-3 py-1 text-sm font-bold text-white"
        >
          Clear
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto px-3 py-2 space-y-0.5">
        {log.length === 0 && <p className="text-sm text-slate-400">No events yet — scan something</p>}
        {log.map((line, i) => (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              line.startsWith("──")    ? "text-slate-400" :
              line.startsWith(">>>")   ? "text-blue-700 font-bold" :
              line.startsWith("SKIP")  ? "text-slate-400" :
              line.startsWith("ENTER") ? "text-green-700 font-bold" :
              "text-slate-800"
            }`}
          >
            {line}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Kiosk root ───────────────────────────────────────────────────────────────

export default function KioskPWA({ branchId, branchName, storeName, kioskConfig }: {
  branchId: string; branchName: string; storeName: string; kioskConfig: KioskConfig;
}) {
  const [product, setProduct]   = useState<ScannedProduct | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState("");
  const [countdown, setCountdown] = useState(AUTO_RESET_SECONDS);
  const [canInstall, setCanInstall] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    setDebugMode(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  const bufferRef        = useRef("");
  const countdownRef     = useRef<ReturnType<typeof setInterval>>();
  const installPromptRef = useRef<any>(null);
  const hiddenInputRef   = useRef<HTMLInputElement>(null);
  const scanTimerRef     = useRef<ReturnType<typeof setTimeout>>();

  function reset() {
    setProduct(null); setNotFound(false); setApiError(""); setScanning(false);
    clearInterval(countdownRef.current);
  }

  const fetchProduct = useCallback(async (barcode: string) => {
    setScanning(true); setProduct(null); setNotFound(false); setApiError("");
    try {
      const res = await fetch(
        `/api/public/scan?branchId=${encodeURIComponent(branchId)}&barcode=${encodeURIComponent(barcode)}`,
        { headers: { "x-device-type": "KIOSK" } }
      );
      const data = await res.json();
      if (data.success)           setProduct(data.product);
      else if (res.status === 404) setNotFound(true);
      else                         setApiError(data.error ?? "Something went wrong");
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [branchId]);

  // Register service worker + sync install prompt state
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/kiosk-sw.js", { scope: "/" }).catch(() => {});
    }
    // Pick up the prompt if it already fired before React mounted
    if (_installPrompt) {
      installPromptRef.current = _installPrompt;
      setCanInstall(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      _installPrompt = e;
      installPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => { _installPrompt = null; setCanInstall(false); });
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function handleInstall() {
    if (!installPromptRef.current) return;
    installPromptRef.current.prompt();
    await installPromptRef.current.userChoice;
    installPromptRef.current = null;
    setCanInstall(false);
  }

  // Keep hidden input focused so Android scanner input lands in it
  useEffect(() => {
    const input = hiddenInputRef.current;
    if (!input) return;
    input.focus();
    const refocus = () => setTimeout(() => input.focus(), 50);
    input.addEventListener("blur", refocus);
    return () => input.removeEventListener("blur", refocus);
  }, []);

  function submitBarcode(raw: string) {
    const barcode = raw.trim().replace(/[\n\r]/g, "");
    if (debugMode) setDebugLog((l) => [...l, `>>> SUBMIT "${barcode}" len=${barcode.length}`]);
    if (barcode.length >= 3) fetchProduct(barcode);
  }

  // Physical scanner keyboard listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Add separator at the start of each new scan (first key after buffer was empty)
      if (debugMode && bufferRef.current === "") {
        setDebugLog((l) => [...l, `──── scan ────`]);
      }

      // Enter — submit whatever is in the buffer
      if (e.key === "Enter" || e.keyCode === 13) {
        clearTimeout(scanTimerRef.current);
        const barcode = bufferRef.current.trim();
        bufferRef.current = "";
        if (debugMode) setDebugLog((l) => [...l, `ENTER → buf="${barcode}"`]);
        submitBarcode(barcode);
        return;
      }

      // Readable character (desktop / some scanners)
      if (e.key.length === 1 && e.key !== "Unidentified") {
        bufferRef.current += e.key;
        if (debugMode) setDebugLog((l) => [...l, `key="${e.key}" buf="${bufferRef.current}"`]);
        return;
      }

      // Android "Unidentified" — reconstruct char from keyCode
      let char = "";
      if (e.keyCode >= 48 && e.keyCode <= 57) {
        char = String(e.keyCode - 48);
      } else if (e.keyCode >= 96 && e.keyCode <= 105) {
        char = String(e.keyCode - 96);
      } else if (e.keyCode >= 65 && e.keyCode <= 90) {
        char = String.fromCharCode(e.keyCode);
      }

      if (char) {
        bufferRef.current += char;
        if (debugMode) setDebugLog((l) => [...l, `kc=${e.keyCode} → "${char}" buf="${bufferRef.current}"`]);
      } else {
        if (debugMode) setDebugLog((l) => [...l, `SKIP key="${e.key}" kc=${e.keyCode}`]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fetchProduct, debugMode]);

  // Auto-reset countdown when product is displayed
  useEffect(() => {
    if (!product) return;
    setCountdown(AUTO_RESET_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { reset(); return AUTO_RESET_SECONDS; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [product]);

  if (scanning) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="text-base font-medium text-slate-500">Looking up product...</p>
    </div>
  );

  if (product) return (
    <ProductCard product={product} onDismiss={reset} countdown={countdown} />
  );

  if (notFound || apiError) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        {notFound
          ? <><XCircle className="mx-auto h-20 w-20 text-slate-300" />
              <div>
                <p className="text-xl font-bold text-slate-900">Product not found</p>
                <p className="mt-1 text-sm text-slate-500">
                  This product isn't available in {branchName} yet.
                </p>
              </div></>
          : <><AlertCircle className="mx-auto h-20 w-20 text-red-300" />
              <div>
                <p className="text-xl font-bold text-slate-900">Something went wrong</p>
                <p className="mt-1 text-sm text-slate-500">{apiError}</p>
              </div></>
        }
        <p className="text-sm text-slate-400">Scan another product to continue</p>
        <button type="button" onClick={reset}
          className="text-sm text-slate-400 underline hover:text-slate-600">
          Back to idle
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Captures Android scanner input — inputMode="none" prevents soft keyboard */}
      <input
        ref={hiddenInputRef}
        inputMode="none"
        aria-hidden="true"
        style={{ position: "fixed", opacity: 0, top: 0, left: 0, width: 1, height: 1, pointerEvents: "none", zIndex: -1 }}
        onKeyDown={(e) => {
          const curVal = e.currentTarget.value;
          if (debugMode) setDebugLog((l) => [`[input] key="${e.key}" keyCode=${e.keyCode} val="${curVal}"`, ...l].slice(0, 12));
          // Catch Enter — Zebra sends keyCode=13 but key may be "Unidentified"
          if (e.key === "Enter" || e.keyCode === 13 || e.which === 13) {
            clearTimeout(scanTimerRef.current);
            const val = e.currentTarget.value;
            e.currentTarget.value = "";
            submitBarcode(val);
          }
        }}
        onInput={(e) => {
          const val = (e.currentTarget as HTMLInputElement).value;
          if (debugMode) setDebugLog((l) => [`[input event] val="${val}"`, ...l].slice(0, 12));
          // Some scanners append \n or \r instead of firing Enter key
          if (val.includes("\n") || val.includes("\r")) {
            clearTimeout(scanTimerRef.current);
            const barcode = val.replace(/[\n\r]/g, "");
            (e.target as HTMLInputElement).value = "";
            submitBarcode(barcode);
            return;
          }
          // Debounce fallback: submit 300ms after last character
          // handles scanners with no Enter/newline terminator
          clearTimeout(scanTimerRef.current);
          scanTimerRef.current = setTimeout(() => {
            const input = hiddenInputRef.current;
            if (!input?.value) return;
            const barcode = input.value;
            input.value = "";
            submitBarcode(barcode);
          }, 300);
        }}
      />
      <IdleScreen storeName={storeName} branchName={branchName} config={kioskConfig} canInstall={canInstall} onInstall={handleInstall} />
      {debugMode && (
        <DebugPanel log={debugLog} onClear={() => setDebugLog([])} />
      )}
    </>
  );
}
