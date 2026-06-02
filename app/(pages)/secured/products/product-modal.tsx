"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Film, Link2, Loader2, Play, Plus, ScanLine,
  Sparkles, Star, Trash2, Upload, X,
} from "lucide-react";

const BarcodeScanner = dynamic(
  () => import("@/components/scanner/barcode-scanner"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductRecord = {
  id: string; barcode: string; name: string; brand: string | null;
  category: string | null; image_url: string | null; sku: string | null;
  weight_volume: string | null; manufacturer: string | null;
  country_of_origin: string | null; serving_size: string | null;
  nutrition_json: string | null; ingredients: string | null; allergens: string | null;
  usage_instructions: string | null; storage_instructions: string | null;
  shelf_life: string | null; disclaimer: string | null; legal_info: string | null;
  certifications: string | null; tags: string | null; video_url: string | null;
  alt_names: string | null;   // JSON array of alternate names from OFF
};

type SavedImage  = { id: string; url: string; is_primary: boolean; sort_order: number };
type PendingImage =
  | { type: "file"; id: string; file: File; preview: string }
  | { type: "url";  id: string; url: string };

type NutritionForm = {
  calories: string; fat: string; saturated_fat: string; trans_fat: string;
  carbohydrates: string; sugar: string; fiber: string; protein: string;
  sodium: string; salt: string; calcium: string; iron: string;
};

const EMPTY_NUTRITION: NutritionForm = {
  calories: "", fat: "", saturated_fat: "", trans_fat: "",
  carbohydrates: "", sugar: "", fiber: "", protein: "",
  sodium: "", salt: "", calcium: "", iron: "",
};

const NUTRIENT_LABELS: { key: keyof NutritionForm; label: string; unit: string }[] = [
  { key: "calories",      label: "Energy",        unit: "kcal" },
  { key: "fat",           label: "Total Fat",      unit: "g" },
  { key: "saturated_fat", label: "Saturated Fat",  unit: "g" },
  { key: "trans_fat",     label: "Trans Fat",      unit: "g" },
  { key: "carbohydrates", label: "Carbohydrates",  unit: "g" },
  { key: "sugar",         label: "Total Sugar",    unit: "g" },
  { key: "fiber",         label: "Dietary Fiber",  unit: "g" },
  { key: "protein",       label: "Protein",        unit: "g" },
  { key: "sodium",        label: "Sodium",         unit: "mg" },
  { key: "salt",          label: "Salt",           unit: "g" },
  { key: "calcium",       label: "Calcium",        unit: "g" },
  { key: "iron",          label: "Iron",           unit: "mg" },
];

const TABS = ["Basic", "Media", "Nutrition", "Details", "Legal"] as const;
type Tab = typeof TABS[number];

interface Props {
  editing: ProductRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

function nutritionToForm(json: string | null): NutritionForm {
  if (!json) return EMPTY_NUTRITION;
  try {
    const parsed = JSON.parse(json);
    return Object.fromEntries(
      Object.keys(EMPTY_NUTRITION).map((k) => [k, parsed[k] != null ? String(parsed[k]) : ""])
    ) as NutritionForm;
  } catch { return EMPTY_NUTRITION; }
}

function formToNutritionJson(form: NutritionForm): string | null {
  const obj: Record<string, number> = {};
  for (const [k, v] of Object.entries(form)) {
    const n = parseFloat(v);
    if (!isNaN(n)) obj[k] = n;
  }
  return Object.keys(obj).length ? JSON.stringify(obj) : null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ProductModal({ editing, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Basic");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // ── Basic ────────────────────────────────────────────────────────────────────
  const [barcode, setBarcode]   = useState(editing?.barcode ?? "");
  const [name, setName]         = useState(editing?.name ?? "");
  const [brand, setBrand]       = useState(editing?.brand ?? "");
  const [category, setCategory] = useState(editing?.category ?? "");
  const [sku, setSku]           = useState(editing?.sku ?? "");
  const [weightVolume, setWeightVolume]     = useState(editing?.weight_volume ?? "");
  const [manufacturer, setManufacturer]     = useState(editing?.manufacturer ?? "");
  const [countryOfOrigin, setCountryOfOrigin] = useState(editing?.country_of_origin ?? "");

  // ── Media — saved images (existing product) ──────────────────────────────────
  const [savedImages, setSavedImages]   = useState<SavedImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── Media — pending images (new product, processed after save) ───────────────
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  // ── Media — image URL input ──────────────────────────────────────────────────
  const [showImgUrl, setShowImgUrl] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Media — video ────────────────────────────────────────────────────────────
  const [videoMode, setVideoMode]   = useState<"url" | "upload">("url");
  const [videoUrl, setVideoUrl]     = useState(editing?.video_url ?? "");
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Nutrition ────────────────────────────────────────────────────────────────
  const [nutrition, setNutrition] = useState<NutritionForm>(() =>
    nutritionToForm(editing?.nutrition_json ?? null)
  );
  const [servingSize, setServingSize] = useState(editing?.serving_size ?? "");

  // ── Details ──────────────────────────────────────────────────────────────────
  const [ingredients, setIngredients]               = useState(editing?.ingredients ?? "");
  const [allergens, setAllergens]                   = useState(editing?.allergens ?? "");
  const [usageInstructions, setUsageInstructions]   = useState(editing?.usage_instructions ?? "");
  const [storageInstructions, setStorageInstructions] = useState(editing?.storage_instructions ?? "");
  const [shelfLife, setShelfLife]                   = useState(editing?.shelf_life ?? "");
  const [tags, setTags]                             = useState(editing?.tags ?? "");

  // ── Legal ────────────────────────────────────────────────────────────────────
  const [disclaimer, setDisclaimer]       = useState(editing?.disclaimer ?? "");
  const [legalInfo, setLegalInfo]         = useState(editing?.legal_info ?? "");
  const [certifications, setCertifications] = useState(editing?.certifications ?? "");

  // ── Barcode lookup / scanner ─────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [lookingUp, setLookingUp]       = useState(false);
  const [lookupResult, setLookupResult] = useState<Record<string, any> | null>(null);

  // ── Name suggestions ──────────────────────────────────────────────────────
  const [nameSuggestions, setNameSuggestions] = useState<string[]>(() => {
    if (!editing?.alt_names) return [];
    try { return JSON.parse(editing.alt_names); } catch { return []; }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load saved images for existing products
  useEffect(() => {
    if (!editing) return;
    setImagesLoading(true);
    fetch(`/api/secured/products/${editing.id}/images`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSavedImages(d.images); })
      .finally(() => setImagesLoading(false));
  }, [editing]);

  // ── Lookup ───────────────────────────────────────────────────────────────────

  async function triggerLookup(code: string) {
    if (!code.trim()) return;
    setLookingUp(true); setLookupResult(null);
    try {
      const res = await fetch(
        `/api/secured/products/barcode-lookup?barcode=${encodeURIComponent(code)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.found) {
        setLookupResult(data);
        if (data.name_suggestions?.length) setNameSuggestions(data.name_suggestions);
      }
    } finally { setLookingUp(false); }
  }

  function applyLookup() {
    if (!lookupResult) return;
    if (lookupResult.name)              setName(lookupResult.name);
    if (lookupResult.brand)             setBrand(lookupResult.brand);
    if (lookupResult.category)          setCategory(lookupResult.category);
    if (lookupResult.weight_volume)     setWeightVolume(lookupResult.weight_volume);
    if (lookupResult.manufacturer)      setManufacturer(lookupResult.manufacturer);
    if (lookupResult.country_of_origin) setCountryOfOrigin(lookupResult.country_of_origin);
    if (lookupResult.ingredients)       setIngredients(lookupResult.ingredients);
    if (lookupResult.allergens)         setAllergens(lookupResult.allergens);
    if (lookupResult.certifications)    setCertifications(lookupResult.certifications);
    if (lookupResult.serving_size)      setServingSize(lookupResult.serving_size);
    if (lookupResult.nutrition) {
      setNutrition(Object.fromEntries(
        Object.keys(EMPTY_NUTRITION).map((k) => [
          k, lookupResult.nutrition[k] != null ? String(lookupResult.nutrition[k]) : ""
        ])
      ) as NutritionForm);
    }

    // Import all OFF images (front, nutrition label, etc.) as URL-based pending/saved images
    const offImages: string[] = lookupResult.images ?? (lookupResult.image_url ? [lookupResult.image_url] : []);
    if (offImages.length > 0) {
      if (editing) {
        // Existing product — save immediately
        offImages.forEach((url) => {
          fetch(`/api/secured/products/${editing.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ url }),
          }).then((r) => r.json()).then((d) => {
            if (d.success) setSavedImages((prev) => [...prev, d.image]);
          });
        });
      } else {
        // New product — add to pending
        setPendingImages((prev) => [
          ...prev,
          ...offImages.map((url) => ({ type: "url" as const, id: crypto.randomUUID(), url })),
        ]);
      }
    }

    setLookupResult(null);
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (editing) {
      // Existing product → upload immediately
      files.forEach((file) => uploadImageFile(file));
    } else {
      // New product → add to pending
      files.forEach((file) => {
        setPendingImages((prev) => [
          ...prev,
          { type: "file", id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) },
        ]);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImageFile(file: File) {
    if (!editing) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/secured/products/${editing.id}/images`, {
        method: "POST", credentials: "include", body: fd,
      });
      const data = await res.json();
      if (data.success) setSavedImages((prev) => [...prev, data.image]);
    } finally { setUploadingImage(false); }
  }

  function handleAddImageUrl() {
    const url = imgUrlInput.trim();
    if (!url) return;

    if (editing) {
      // Existing product → save immediately
      fetch(`/api/secured/products/${editing.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      }).then((r) => r.json()).then((d) => {
        if (d.success) setSavedImages((prev) => [...prev, d.image]);
      });
    } else {
      // New product → add to pending
      setPendingImages((prev) => [
        ...prev,
        { type: "url", id: crypto.randomUUID(), url },
      ]);
    }
    setImgUrlInput(""); setShowImgUrl(false);
  }

  async function setSavedPrimary(imageId: string, imageUrl: string) {
    if (!editing) return;
    await fetch(`/api/secured/products/${editing.id}/images/${imageId}`, {
      method: "PUT", credentials: "include",
    });
    setSavedImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
  }

  async function deleteSavedImage(imageId: string) {
    if (!editing) return;
    await fetch(`/api/secured/products/${editing.id}/images/${imageId}`, {
      method: "DELETE", credentials: "include",
    });
    setSavedImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  function setPendingPrimary(id: string) {
    setPendingImages((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      const target = prev.find((p) => p.id === id)!;
      return [target, ...updated]; // move to front = first = primary
    });
  }

  function removePending(id: string) {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Video helpers ─────────────────────────────────────────────────────────────

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    if (videoInputRef.current) videoInputRef.current.value = "";

    if (!editing) return; // for new products, video file is deferred to handleSave

    await doVideoUpload(file, editing.id);
  }

  async function doVideoUpload(file: File, productId: string): Promise<string | null> {
    setVideoUploading(true); setVideoUploadProgress(0);
    try {
      const res = await fetch(`/api/secured/products/${productId}/video-upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const { uploadUrl, publicUrl } = await res.json();

      // Upload with XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setVideoUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload  = () => { resolve(); };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Save URL to product
      await fetch(`/api/secured/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ video_url: publicUrl }),
      });

      setVideoUrl(publicUrl);
      setVideoFile(null);
      return publicUrl;
    } finally {
      setVideoUploading(false); setVideoUploadProgress(0);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Product name is required."); setActiveTab("Basic"); return; }
    setSaving(true); setError("");

    try {
      const payload = {
        name, brand: brand || null, category: category || null,
        sku: sku || null, weight_volume: weightVolume || null,
        manufacturer: manufacturer || null, country_of_origin: countryOfOrigin || null,
        serving_size: servingSize || null,
        nutrition_json: formToNutritionJson(nutrition),
        ingredients: ingredients || null, allergens: allergens || null,
        usage_instructions: usageInstructions || null,
        storage_instructions: storageInstructions || null,
        shelf_life: shelfLife || null,
        disclaimer: disclaimer || null, legal_info: legalInfo || null,
        certifications: certifications || null,
        tags: tags || null,
        // video_url: include only if URL mode and no pending file
        ...(videoMode === "url" && { video_url: videoUrl || null }),
      };

      let productId: string;

      if (editing) {
        const res = await fetch(`/api/secured/products/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) { setError(data.error ?? "Failed to update"); return; }
        productId = editing.id;
      } else {
        if (!barcode.trim()) { setError("Barcode is required."); setActiveTab("Basic"); return; }
        const res = await fetch("/api/secured/products", {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify({ barcode, ...payload }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.error ?? "Failed to create"); return; }
        productId = data.product.id;

        // Process pending images for new product
        for (const pending of pendingImages) {
          if (pending.type === "file") {
            const fd = new FormData();
            fd.append("file", pending.file);
            await fetch(`/api/secured/products/${productId}/images`, {
              method: "POST", credentials: "include", body: fd,
            });
          } else {
            await fetch(`/api/secured/products/${productId}/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ url: pending.url }),
            });
          }
        }

        // Process pending video file for new product
        if (videoMode === "upload" && videoFile) {
          await doVideoUpload(videoFile, productId);
        }
      }

      onSaved();
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const allPendingPreviews = pendingImages.map((p, i) => ({
    id: p.id,
    url: p.type === "url" ? p.url : (p as any).preview,
    isPrimary: i === 0,
    label: p.type === "url" ? "URL" : "File",
  }));

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
            <h2 className="text-base font-semibold text-slate-900">
              {editing ? "Edit product" : "Add product"}
            </h2>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 px-6 pt-3">
            {TABS.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab
                    ? "border-b-2 border-blue-600 text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}>
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
              )}

              {/* ── BASIC ────────────────────────────────────────────────── */}
              {activeTab === "Basic" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Barcode *</label>
                    <div className="flex gap-2">
                      <input type="text" value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onBlur={(e) => triggerLookup(e.target.value)}
                        placeholder="e.g. 8901030974654"
                        disabled={!!editing}
                        className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400" />
                      {!editing && (
                        <button type="button" onClick={() => setScannerOpen(true)}
                          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700">
                          <ScanLine className="h-4 w-4" /> Scan
                        </button>
                      )}
                    </div>
                    {editing && <p className="text-xs text-slate-400">Barcode cannot be changed after creation.</p>}
                  </div>

                  {lookingUp && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Looking up barcode...
                    </div>
                  )}
                  {!lookingUp && lookupResult && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <div className="text-sm">
                            <p className="font-semibold text-emerald-800">
                              Found on {lookupResult.source === "openbeautyfacts" ? "Open Beauty Facts"
                                       : lookupResult.source === "openproductsfacts" ? "Open Products Facts"
                                       : "Open Food Facts"}
                            </p>
                            <p className="mt-0.5 text-emerald-700 text-xs">
                              {[lookupResult.name, lookupResult.brand, lookupResult.weight_volume].filter(Boolean).join(" · ")}
                            </p>
                            {lookupResult.nutrition && (
                              <p className="mt-0.5 text-emerald-600 text-xs">+ nutrition data available</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button type="button" onClick={applyLookup}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                            Apply all
                          </button>
                          <button type="button" onClick={() => setLookupResult(null)}
                            className="rounded-lg p-1 text-emerald-500 hover:text-emerald-800">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Product name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Parle-G Biscuit 100g" required
                      className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand"             value={brand}           onChange={setBrand}           placeholder="e.g. Parle" />
                    <Field label="Category"          value={category}        onChange={setCategory}        placeholder="e.g. Biscuits" />
                    <Field label="SKU"               value={sku}             onChange={setSku}             placeholder="Internal code" />
                    <Field label="Weight / Volume"   value={weightVolume}    onChange={setWeightVolume}    placeholder="e.g. 100g, 500ml" />
                    <Field label="Manufacturer"      value={manufacturer}    onChange={setManufacturer}    placeholder="Company name" />
                    <Field label="Country of origin" value={countryOfOrigin} onChange={setCountryOfOrigin} placeholder="e.g. India" />
                  </div>
                </div>
              )}

              {/* ── MEDIA ────────────────────────────────────────────────── */}
              {activeTab === "Media" && (
                <div className="space-y-6">

                  {/* ── Images ────────────────────────────────────────────── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Images</p>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { setShowImgUrl((v) => !v); }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <Link2 className="h-3.5 w-3.5" /> Add URL
                        </button>
                        <button type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          {uploadingImage
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Upload className="h-3.5 w-3.5" />}
                          Upload
                        </button>
                      </div>
                    </div>

                    {/* URL input */}
                    {showImgUrl && (
                      <div className="flex gap-2">
                        <input type="url" value={imgUrlInput}
                          onChange={(e) => setImgUrlInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddImageUrl(); } }}
                          placeholder="https://example.com/image.jpg"
                          className="h-10 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                        <button type="button" onClick={handleAddImageUrl}
                          className="rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
                          Add
                        </button>
                        <button type="button" onClick={() => { setShowImgUrl(false); setImgUrlInput(""); }}
                          className="rounded-xl border border-slate-200 px-3 text-slate-400 hover:bg-slate-50">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Saved images (existing product) */}
                    {editing && (
                      imagesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading images...
                        </div>
                      ) : savedImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {savedImages.map((img) => (
                            <div key={img.id} className="group relative">
                              <img src={img.url} alt="" className="h-24 w-full rounded-xl object-cover border border-slate-200" />
                              {img.is_primary && (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  Primary
                                </span>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                                {!img.is_primary && (
                                  <button type="button" onClick={() => setSavedPrimary(img.id, img.url)}
                                    className="rounded-full bg-white/90 p-1.5 text-blue-600 hover:bg-white" title="Set as primary">
                                    <Star className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button type="button" onClick={() => deleteSavedImage(img.id)}
                                  className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white" title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No images yet. Upload files or add URLs above.</p>
                      )
                    )}

                    {/* Pending images (new product) */}
                    {!editing && pendingImages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium">
                          {pendingImages.length} image{pendingImages.length > 1 ? "s" : ""} will be added after save.
                          First image will be primary.
                        </p>
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                          {allPendingPreviews.map((p) => (
                            <div key={p.id} className="group relative">
                              <img src={p.url} alt="" className="h-24 w-full rounded-xl object-cover border border-slate-200"
                                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f1f5f9'/%3E%3Ctext y='50' x='50' text-anchor='middle' fill='%2394a3b8' font-size='12'%3EURL%3C/text%3E%3C/svg%3E"; }} />
                              {p.isPrimary && (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Primary</span>
                              )}
                              <span className="absolute right-1.5 bottom-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{p.label}</span>
                              <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                                {!p.isPrimary && (
                                  <button type="button" onClick={() => setPendingPrimary(p.id)}
                                    className="rounded-full bg-white/90 p-1.5 text-blue-600 hover:bg-white" title="Set as primary">
                                    <Star className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button type="button" onClick={() => removePending(p.id)}
                                  className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white" title="Remove">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!editing && pendingImages.length === 0 && (
                      <p className="text-xs text-slate-400">Upload files or add image URLs above. Images will be saved when you create the product.</p>
                    )}

                    <p className="text-xs text-slate-400">
                      Hover an image to set as primary or remove. Primary image is shown in the scanner.
                    </p>

                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageFileChange} className="hidden" />
                  </div>

                  {/* ── Video ─────────────────────────────────────────────── */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Video</p>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl border border-slate-200 p-1 w-fit gap-1">
                      {(["url", "upload"] as const).map((mode) => (
                        <button key={mode} type="button"
                          onClick={() => { setVideoMode(mode); setVideoFile(null); }}
                          className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                            videoMode === mode
                              ? "bg-slate-950 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}>
                          {mode === "url" ? <><Link2 className="inline h-3.5 w-3.5 mr-1" />URL</> : <><Film className="inline h-3.5 w-3.5 mr-1" />Upload file</>}
                        </button>
                      ))}
                    </div>

                    {videoMode === "url" && (
                      <div className="space-y-1.5">
                        <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... or S3 link"
                          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
                        {videoUrl && (
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <Play className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                              className="truncate hover:underline">{videoUrl}</a>
                            <button type="button" onClick={() => setVideoUrl("")} className="shrink-0 text-slate-400 hover:text-slate-700">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {videoMode === "upload" && (
                      <div className="space-y-2">
                        {videoUploading ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              Uploading... {videoUploadProgress}%
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${videoUploadProgress}%` }} />
                            </div>
                          </div>
                        ) : videoFile ? (
                          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Film className="h-4 w-4 text-blue-500 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-slate-700">{videoFile.name}</p>
                                <p className="text-xs text-slate-400">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => setVideoFile(null)} className="text-slate-400 hover:text-slate-600">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : videoUrl && editing ? (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-700">
                            <Play className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Video already uploaded</span>
                            <button type="button" onClick={() => { setVideoUrl(""); fetch(`/api/secured/products/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ video_url: null }) }); }}
                              className="shrink-0 text-emerald-500 hover:text-emerald-800 ml-1">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => videoInputRef.current?.click()}
                            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition">
                            <Film className="h-7 w-7" />
                            <p className="text-sm font-medium">Click to select video</p>
                            <p className="text-xs">MP4, WebM, MOV — uploaded directly to S3</p>
                          </button>
                        )}
                        {!editing && videoFile && (
                          <p className="text-xs text-slate-400">Video will be uploaded after the product is saved.</p>
                        )}
                        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoFileUpload} className="hidden" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── NUTRITION ────────────────────────────────────────────── */}
              {activeTab === "Nutrition" && (
                <div className="space-y-4">
                  <Field label="Serving size" value={servingSize} onChange={setServingSize}
                    placeholder='e.g. "Per 100g" or "30g per serving"' />
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nutrition facts (per serving)</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {NUTRIENT_LABELS.map(({ key, label, unit }) => (
                        <div key={key} className="flex items-center justify-between px-4 py-2.5">
                          <label className="text-sm text-slate-700 w-40 shrink-0">{label}</label>
                          <div className="flex items-center gap-1.5">
                            <input type="number" min="0" step="0.01"
                              value={nutrition[key]}
                              onChange={(e) => setNutrition((n) => ({ ...n, [key]: e.target.value }))}
                              placeholder="—"
                              className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-right text-sm outline-none focus:border-slate-400" />
                            <span className="text-xs text-slate-400 w-8">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DETAILS ──────────────────────────────────────────────── */}
              {activeTab === "Details" && (
                <div className="space-y-4">
                  <TextareaField label="Ingredients" value={ingredients} onChange={setIngredients}
                    placeholder="Water, Sugar, Wheat Flour, ..." rows={3} />
                  <Field label="Allergens" value={allergens} onChange={setAllergens}
                    placeholder="Contains: milk, wheat, nuts" />
                  <TextareaField label="Usage instructions" value={usageInstructions} onChange={setUsageInstructions}
                    placeholder="How to use / directions for use..." rows={2} />
                  <Field label="Storage instructions" value={storageInstructions} onChange={setStorageInstructions}
                    placeholder="Store in a cool, dry place" />
                  <Field label="Shelf life" value={shelfLife} onChange={setShelfLife}
                    placeholder="18 months from date of manufacture" />
                  <Field label="Tags" value={tags} onChange={setTags}
                    placeholder="snacks, gluten-free, vegan (comma-separated)" />
                </div>
              )}

              {/* ── LEGAL ────────────────────────────────────────────────── */}
              {activeTab === "Legal" && (
                <div className="space-y-4">
                  <TextareaField label="Disclaimer" value={disclaimer} onChange={setDisclaimer}
                    placeholder="Not intended for medicinal use..." rows={2} />
                  <TextareaField label="Legal info" value={legalInfo} onChange={setLegalInfo}
                    placeholder="FSSAI Lic. No. 12345 | Marketed by ..." rows={3} />
                  <Field label="Certifications" value={certifications} onChange={setCertifications}
                    placeholder="FSSAI · ISO 9001 · Organic India" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add product"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onDetect={(code) => { setScannerOpen(false); setBarcode(code); triggerLookup(code); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400" />
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-none" />
    </div>
  );
}
