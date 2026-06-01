"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CheckCircle2, Download, Edit2, FileSpreadsheet, ImageOff,
  Loader2, Package, Plus, ScanLine, Search, Sparkles,
  Trash2, Upload, X,
} from "lucide-react";
import Image from "next/image";

// ZXing is browser-only — load only on client
const BarcodeScanner = dynamic(
  () => import("@/components/scanner/barcode-scanner"),
  { ssr: false }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
};

type LookupResult = {
  found: boolean;
  source?: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  image_url?: string | null;
};

type ImportResult = {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; reason: string }[];
};

type FormState = { barcode: string; name: string; brand: string; category: string };
const EMPTY_FORM: FormState = { barcode: "", name: "", brand: "", category: "" };

// ─── Shared modal shell ───────────────────────────────────────────────────────

function Modal({
  title, subtitle = "", onClose, wide = false, children,
}: {
  title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="mt-0.5 rounded-md p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  message, onConfirm, onCancel, loading,
}: { message: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CSV template download ────────────────────────────────────────────────────

function downloadTemplate() {
  const csv = "barcode,name,brand,category\n8901030974654,Parle-G Biscuit 100g,Parle,Biscuits\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pscanner_products_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  // ── List state ──────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  // ── Product form modal ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Image upload ────────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Barcode scanner ─────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);

  // ── Barcode lookup ──────────────────────────────────────────────────────────
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Bulk import ─────────────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (q = search, p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ q, page: String(p) });
    const res = await fetch(`/api/secured/products?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.success) { setProducts(data.products); setTotal(data.total); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Barcode lookup ────────────────────────────────────────────────────────

  const triggerLookup = useCallback(async (barcode: string) => {
    if (!barcode.trim() || editing) return; // don't auto-lookup when editing
    setLookingUp(true);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/secured/products/barcode-lookup?barcode=${encodeURIComponent(barcode)}`,
        { credentials: "include" }
      );
      const data: LookupResult = await res.json();
      setLookupResult(data);
    } finally {
      setLookingUp(false);
    }
  }, [editing]);

  function applyLookup() {
    if (!lookupResult?.found) return;
    setForm((f) => ({
      ...f,
      name: lookupResult.name || f.name,
      brand: lookupResult.brand || f.brand,
      category: lookupResult.category || f.category,
    }));
    setLookupResult(null);
  }

  // ── Scanner ───────────────────────────────────────────────────────────────

  function handleScanDetect(barcode: string) {
    setScannerOpen(false);
    setForm((f) => ({ ...f, barcode }));
    triggerLookup(barcode);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null); setImagePreview(null);
    setFormError(""); setLookupResult(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ barcode: p.barcode, name: p.name, brand: p.brand ?? "", category: p.category ?? "" });
    setImageFile(null); setImagePreview(p.image_url);
    setFormError(""); setLookupResult(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false); setEditing(null);
    setForm(EMPTY_FORM); setImageFile(null); setImagePreview(null);
    setFormError(""); setLookupResult(null);
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(productId: string): Promise<string | null> {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      fd.append("productId", productId);
      const res = await fetch("/api/secured/products/upload-image", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      return data.success ? data.imageUrl : null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setFormError("");
    try {
      let productId = editing?.id;

      if (editing) {
        const res = await fetch(`/api/secured/products/${editing.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ name: form.name, brand: form.brand, category: form.category }),
        });
        const data = await res.json();
        if (!data.success) { setFormError(data.error ?? "Failed to update product"); return; }
      } else {
        const res = await fetch("/api/secured/products", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ barcode: form.barcode, name: form.name, brand: form.brand, category: form.category }),
        });
        const data = await res.json();
        if (!data.success) { setFormError(data.error ?? "Failed to create product"); return; }
        productId = data.product.id;
      }

      if (imageFile && productId) {
        await uploadImage(productId); // uploads to S3 and saves image_url in one server-side call
      }

      closeModal();
      fetchProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/secured/products/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
    if ((await res.json()).success) { setDeleteTarget(null); fetchProducts(); }
    setDeleting(false);
  }

  // ── Bulk import ───────────────────────────────────────────────────────────

  async function handleImport() {
    if (!importFile) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch("/api/secured/products/bulk-import", { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    if (data.success) setImportResult(data);
    setImporting(false);
  }

  function closeImport() {
    setImportOpen(false); setImportFile(null); setImportResult(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">{total} product{total !== 1 ? "s" : ""} in catalog</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Bulk import
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchProducts(search, 1); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, barcode, or brand..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
        <button type="submit" className="rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setPage(1); fetchProducts("", 1); }} className="rounded-xl border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{search ? "No products match your search" : "No products yet"}</p>
            {!search && <button type="button" onClick={openCreate} className="text-sm font-semibold text-blue-600 hover:underline">Add your first product</button>}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Image</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Barcode</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Brand</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Category</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <ImageOff className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{product.barcode}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{product.name}</td>
                      <td className="px-5 py-3 text-slate-600">{product.brand || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3 text-slate-600">{product.category || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEdit(product)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setDeleteTarget(product)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={page === 1} onClick={() => { setPage((p) => p - 1); fetchProducts(search, page - 1); }} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
                  <button type="button" disabled={page === totalPages} onClick={() => { setPage((p) => p + 1); fetchProducts(search, page + 1); }} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit product modal ────────────────────────────────────────── */}
      {modalOpen && (
        <Modal title={editing ? "Edit product" : "Add product"} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</p>
            )}

            {/* Image upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Product image</label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                    : <ImageOff className="h-7 w-7 text-slate-300" />}
                </div>
                <div className="flex-1 space-y-1">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    {imagePreview ? "Change image" : "Upload image"}
                  </button>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="ml-2 text-xs text-red-500 hover:underline">Remove</button>
                  )}
                  <p className="text-xs text-slate-400">JPG, PNG, WebP — max 5 MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            </div>

            {/* Barcode + scan button */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Barcode *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  onBlur={(e) => triggerLookup(e.target.value)}
                  placeholder="e.g. 8901030974654"
                  required
                  disabled={!!editing}
                  className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                />
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    title="Scan barcode with camera"
                  >
                    <ScanLine className="h-4 w-4" />
                    Scan
                  </button>
                )}
              </div>
              {editing && <p className="text-xs text-slate-400">Barcode cannot be changed after creation.</p>}
            </div>

            {/* Lookup result banner */}
            {lookingUp && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Looking up barcode on Open Food Facts...
              </div>
            )}
            {!lookingUp && lookupResult && (
              lookupResult.found ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <div className="text-sm">
                        <p className="font-semibold text-emerald-800">Found on Open Food Facts</p>
                        <p className="mt-0.5 text-emerald-700">
                          {[lookupResult.name, lookupResult.brand, lookupResult.category].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={applyLookup} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                        Apply
                      </button>
                      <button type="button" onClick={() => setLookupResult(null)} className="rounded-lg p-1 text-emerald-500 hover:text-emerald-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Product name *</label>
              <input
                type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Parle-G Biscuit 100g" required
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Brand + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Brand</label>
                <input
                  type="text" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Parle"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Category</label>
                <input
                  type="text" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Biscuits"
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || uploadingImage} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {(saving || uploadingImage) && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploadingImage ? "Uploading image..." : editing ? "Save changes" : "Add product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Bulk import modal ───────────────────────────────────────────────── */}
      {importOpen && (
        <Modal title="Bulk import products" subtitle="Upload a CSV or Excel file to add or update products in one shot." onClose={closeImport} wide>
          {!importResult ? (
            <div className="space-y-5">
              {/* Template download */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Download template</p>
                  <p className="text-xs text-slate-400">CSV with required columns: barcode, name, brand, category</p>
                </div>
                <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" /> Template
                </button>
              </div>

              {/* File picker */}
              <div
                onClick={() => importFileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition ${
                  importFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <FileSpreadsheet className={`h-8 w-8 ${importFile ? "text-blue-500" : "text-slate-300"}`} />
                {importFile ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-blue-700">{importFile.name}</p>
                    <p className="text-xs text-blue-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-600">Click to select file</p>
                    <p className="text-xs text-slate-400">CSV, .xlsx or .xls supported</p>
                  </div>
                )}
                <input
                  ref={importFileRef} type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="hidden"
                />
              </div>

              {/* Column reference */}
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-600">Expected columns (row 1 = header):</p>
                <p><span className="font-mono font-semibold text-slate-700">barcode</span> — required · unique key per product</p>
                <p><span className="font-mono font-semibold text-slate-700">name</span> — required</p>
                <p><span className="font-mono font-semibold text-slate-700">brand</span>, <span className="font-mono font-semibold text-slate-700">category</span> — optional</p>
                <p className="pt-1 text-slate-400">Existing barcodes will be updated, new barcodes will be created.</p>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeImport} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                <button
                  type="button" onClick={handleImport} disabled={!importFile || importing}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : "Import products"}
                </button>
              </div>
            </div>
          ) : (
            /* Import results */
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-600">Created</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                  <p className="mt-1 text-xs font-medium text-blue-600">Updated</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${importResult.errors.length > 0 ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
                  <p className={`text-2xl font-bold ${importResult.errors.length > 0 ? "text-red-600" : "text-slate-400"}`}>{importResult.errors.length}</p>
                  <p className={`mt-1 text-xs font-medium ${importResult.errors.length > 0 ? "text-red-500" : "text-slate-400"}`}>Errors</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-red-700">Row errors:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Row {e.row}: {e.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-sm text-slate-600">
                  Import complete — {importResult.created + importResult.updated} of {importResult.total} rows processed successfully.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setImportFile(null); setImportResult(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Import another</button>
                <button type="button" onClick={() => { closeImport(); fetchProducts(); }} className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Done</button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ── Camera scanner overlay ──────────────────────────────────────────── */}
      {scannerOpen && (
        <BarcodeScanner
          onDetect={handleScanDetect}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"? This removes it from all branches.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
