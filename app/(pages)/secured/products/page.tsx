"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Download, Edit2, FileSpreadsheet, ImageOff,
  Loader2, Package, Plus, Search, Trash2, X,
} from "lucide-react";
import Image from "next/image";
import ProductModal, { type ProductRecord } from "./product-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportResult = {
  total: number; created: number; updated: number;
  errors: { row: number; reason: string }[];
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ message, onConfirm, onCancel, loading }: {
  message: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadTemplate() {
  const csv = "barcode,name,brand,category\n8901030974654,Parle-G Biscuit 100g,Parle,Biscuits\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pscanner_products_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts]     = useState<ProductRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const LIMIT = 50;

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<ProductRecord | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const [importOpen, setImportOpen]     = useState(false);
  const [importFile, setImportFile]     = useState<File | null>(null);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (q = search, p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ q, page: String(p) });
    const res = await fetch(`/api/secured/products?${params}`, { credentials: "include" });
    const data = await res.json();
    if (data.success) { setProducts(data.products); setTotal(data.total); }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/secured/products/${deleteTarget.id}`, {
      method: "DELETE", credentials: "include",
    });
    if ((await res.json()).success) { setDeleteTarget(null); fetchProducts(); }
    setDeleting(false);
  }

  // ── Bulk import ────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!importFile) return;
    setImporting(true); setImportResult(null);
    const fd = new FormData();
    fd.append("file", importFile);
    const res = await fetch("/api/secured/products/bulk-import", {
      method: "POST", credentials: "include", body: fd,
    });
    const data = await res.json();
    if (data.success) setImportResult(data);
    setImporting(false);
  }

  function closeImport() { setImportOpen(false); setImportFile(null); setImportResult(null); }

  const totalPages = Math.ceil(total / LIMIT);

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">{total} product{total !== 1 ? "s" : ""} in catalog</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <FileSpreadsheet className="h-4 w-4" /> Bulk import
          </button>
          <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchProducts(search, 1); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, barcode, or brand..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
        </div>
        <button type="submit" className="rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setPage(1); fetchProducts("", 1); }}
            className="rounded-xl border border-slate-200 px-3 text-slate-500 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {search ? "No products match your search" : "No products yet"}
            </p>
            {!search && (
              <button type="button" onClick={() => { setEditing(null); setModalOpen(true); }}
                className="text-sm font-semibold text-blue-600 hover:underline">
                Add your first product
              </button>
            )}
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
                          <Image src={product.image_url} alt={product.name} width={40} height={40}
                            className="h-10 w-10 rounded-lg object-cover" />
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
                          <button type="button" onClick={() => { setEditing(product); setModalOpen(true); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(product)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-500">
                  Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button type="button" disabled={page === 1}
                    onClick={() => { setPage((p) => p - 1); fetchProducts(search, page - 1); }}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    Previous
                  </button>
                  <button type="button" disabled={page === totalPages}
                    onClick={() => { setPage((p) => p + 1); fetchProducts(search, page + 1); }}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product modal */}
      {modalOpen && (
        <ProductModal
          editing={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); fetchProducts(); }}
        />
      )}

      {/* Bulk import modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Bulk import products</h2>
                <p className="mt-0.5 text-xs text-slate-400">Upload a CSV or Excel file to add or update products.</p>
              </div>
              <button type="button" onClick={closeImport} className="mt-0.5 rounded-md p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {!importResult ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Download template</p>
                      <p className="text-xs text-slate-400">CSV with columns: barcode, name, brand, category</p>
                    </div>
                    <button type="button" onClick={downloadTemplate}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5" /> Template
                    </button>
                  </div>

                  <div onClick={() => importFileRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 transition ${
                      importFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}>
                    <FileSpreadsheet className={`h-8 w-8 ${importFile ? "text-blue-500" : "text-slate-300"}`} />
                    {importFile ? (
                      <div className="text-center">
                        <p className="text-sm font-semibold text-blue-700">{importFile.name}</p>
                        <p className="text-xs text-blue-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-600">Click to select file</p>
                        <p className="text-xs text-slate-400">CSV, .xlsx or .xls</p>
                      </div>
                    )}
                    <input ref={importFileRef} type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="hidden" />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={closeImport}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={handleImport} disabled={!importFile || importing}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                      {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : "Import products"}
                    </button>
                  </div>
                </div>
              ) : (
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
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-1">
                      <p className="text-xs font-semibold text-red-700">Row errors:</p>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {importResult.errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-sm text-slate-600">
                      Import complete — {importResult.created + importResult.updated} of {importResult.total} rows processed.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setImportFile(null); setImportResult(null); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Import another</button>
                    <button type="button" onClick={() => { closeImport(); fetchProducts(); }}
                      className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Done</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
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
