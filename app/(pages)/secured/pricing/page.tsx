"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ImageOff, Loader2, Tag, X } from "lucide-react";
import Image from "next/image";

type Branch = { id: string; name: string; is_active: boolean };

type Product = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
};

type BranchProduct = {
  id: string;
  mrp: string;
  selling_price: string;
  offer_price: string | null;
  stock_qty: number;
  is_active: boolean;
};

type PricingItem = { product: Product; branchProduct: BranchProduct | null };

type PricingForm = {
  mrp: string;
  selling_price: string;
  offer_price: string;
  stock_qty: string;
};

const EMPTY_PRICING: PricingForm = { mrp: "", selling_price: "", offer_price: "", stock_qty: "" };

function stockLabel(qty: number) {
  if (qty === 0) return { label: "Out of stock", cls: "bg-red-50 text-red-600" };
  if (qty <= 10) return { label: "Limited", cls: "bg-amber-50 text-amber-600" };
  return { label: "Available", cls: "bg-emerald-50 text-emerald-700" };
}

// ─── Pricing modal ────────────────────────────────────────────────────────────

function PricingModal({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: PricingItem;
  onClose: () => void;
  onSave: (form: PricingForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<PricingForm>(() => ({
    mrp: item.branchProduct?.mrp ?? "",
    selling_price: item.branchProduct?.selling_price ?? "",
    offer_price: item.branchProduct?.offer_price ?? "",
    stock_qty: item.branchProduct ? String(item.branchProduct.stock_qty) : "",
  }));
  const [error, setError] = useState("");

  function f(k: keyof PricingForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mrp || !form.selling_price || form.stock_qty === "") {
      setError("MRP, Selling price and Stock are required.");
      return;
    }
    if (parseFloat(form.selling_price) > parseFloat(form.mrp)) {
      setError("Selling price cannot exceed MRP.");
      return;
    }
    if (form.offer_price && parseFloat(form.offer_price) > parseFloat(form.selling_price)) {
      setError("Offer price cannot exceed Selling price.");
      return;
    }
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {item.branchProduct ? "Edit pricing" : "Set pricing"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{item.product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">MRP *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.mrp}
                  onChange={f("mrp")}
                  placeholder="0.00"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 pl-7 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Selling price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.selling_price}
                  onChange={f("selling_price")}
                  placeholder="0.00"
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 pl-7 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Offer price
                <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.offer_price}
                  onChange={f("offer_price")}
                  placeholder="—"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-7 pr-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
              <p className="text-xs text-slate-400">Clear to remove offer</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Stock qty *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_qty}
                onChange={f("stock_qty")}
                placeholder="0"
                required
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {item.branchProduct ? "Save changes" : "Set pricing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const [items, setItems] = useState<PricingItem[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);

  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load branches
  useEffect(() => {
    fetch("/api/secured/branches", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBranches(d.branches);
          if (d.branches.length > 0) setSelectedBranch(d.branches[0]);
        }
      })
      .finally(() => setBranchesLoading(false));
  }, []);

  const fetchPricing = useCallback(async (branchId: string) => {
    setPricingLoading(true);
    const res = await fetch(`/api/secured/branch-products?branchId=${branchId}`, { credentials: "include" });
    const data = await res.json();
    if (data.success) setItems(data.items);
    setPricingLoading(false);
  }, []);

  useEffect(() => {
    if (selectedBranch) fetchPricing(selectedBranch.id);
  }, [selectedBranch, fetchPricing]);

  async function handleSavePricing(form: PricingForm) {
    if (!editingItem || !selectedBranch) return;
    setSaving(true);

    const payload = {
      branch_id: selectedBranch.id,
      product_id: editingItem.product.id,
      mrp: parseFloat(form.mrp),
      selling_price: parseFloat(form.selling_price),
      offer_price: form.offer_price ? parseFloat(form.offer_price) : null,
      stock_qty: parseInt(form.stock_qty, 10),
    };

    if (editingItem.branchProduct) {
      // Update existing
      await fetch(`/api/secured/branch-products/${editingItem.branchProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } else {
      // Create new
      await fetch("/api/secured/branch-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }

    setEditingItem(null);
    setSaving(false);
    fetchPricing(selectedBranch.id);
  }

  async function handleRemove(item: PricingItem) {
    if (!item.branchProduct || !selectedBranch) return;
    setRemovingId(item.branchProduct.id);
    await fetch(`/api/secured/branch-products/${item.branchProduct.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setRemovingId(null);
    fetchPricing(selectedBranch.id);
  }

  const configured = items.filter((i) => i.branchProduct !== null).length;
  const unconfigured = items.length - configured;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pricing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set MRP, selling price, offer price, and stock per branch.
        </p>
      </div>

      {/* Branch selector */}
      {branchesLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading branches...
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No branches found. Create a branch first.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Branch dropdown */}
            <div className="relative">
              <select
                value={selectedBranch?.id ?? ""}
                onChange={(e) => {
                  const b = branches.find((br) => br.id === e.target.value);
                  if (b) setSelectedBranch(b);
                }}
                className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{!b.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Summary */}
            {!pricingLoading && items.length > 0 && (
              <div className="flex gap-3 text-xs">
                <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  {configured} configured
                </span>
                {unconfigured > 0 && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">
                    {unconfigured} not set
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {pricingLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Tag className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-500">No products in catalog. Add products first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Product</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">MRP</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Selling price</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Offer price</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Stock</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Availability</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const bp = item.branchProduct;
                      const stock = bp ? stockLabel(bp.stock_qty) : null;
                      const isRemoving = bp && removingId === bp.id;

                      return (
                        <tr key={item.product.id} className={`hover:bg-slate-50 ${!bp ? "opacity-60" : ""}`}>
                          {/* Product */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {item.product.image_url ? (
                                <Image src={item.product.image_url} alt={item.product.name} width={36} height={36} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                              ) : (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                  <ImageOff className="h-4 w-4 text-slate-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-slate-900">{item.product.name}</p>
                                <p className="text-xs text-slate-400 font-mono">{item.product.barcode}</p>
                              </div>
                            </div>
                          </td>

                          {/* MRP */}
                          <td className="px-5 py-3 tabular-nums text-slate-700">
                            {bp ? `₹${parseFloat(bp.mrp).toFixed(2)}` : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Selling price */}
                          <td className="px-5 py-3 tabular-nums font-semibold text-slate-900">
                            {bp ? `₹${parseFloat(bp.selling_price).toFixed(2)}` : <span className="text-slate-300 font-normal">—</span>}
                          </td>

                          {/* Offer price */}
                          <td className="px-5 py-3 tabular-nums">
                            {bp?.offer_price ? (
                              <span className="font-semibold text-emerald-600">₹{parseFloat(bp.offer_price).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Stock qty */}
                          <td className="px-5 py-3 tabular-nums text-slate-700">
                            {bp ? bp.stock_qty : <span className="text-slate-300">—</span>}
                          </td>

                          {/* Availability badge */}
                          <td className="px-5 py-3">
                            {stock ? (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.cls}`}>
                                {stock.label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                                Not configured
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                {bp ? "Edit" : "Set pricing"}
                              </button>
                              {bp && (
                                <button
                                  type="button"
                                  onClick={() => handleRemove(item)}
                                  disabled={!!isRemoving}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                                  title="Remove from branch"
                                >
                                  {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Pricing modal */}
      {editingItem && (
        <PricingModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSavePricing}
          saving={saving}
        />
      )}
    </div>
  );
}
