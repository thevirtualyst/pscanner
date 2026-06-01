"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ScanLine, Store } from "lucide-react";

export default function StoreSelectorPage() {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = slug.trim().toLowerCase();
    if (!cleaned) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/public/store?slug=${encodeURIComponent(cleaned)}`);
    const data = await res.json();

    if (!data.success) {
      setError("Store not found. Check the store code and try again.");
      setLoading(false);
      return;
    }

    const { tenant } = data;

    if (tenant.branches.length === 0) {
      setError("This store has no active branches.");
      setLoading(false);
      return;
    }

    if (tenant.branches.length === 1) {
      // Single branch → go straight to scanner
      router.push(`/s/${tenant.slug}/b/${tenant.branches[0].slug}`);
    } else {
      // Multiple branches → let user pick (handled below via state)
      setBranches(tenant.branches);
      setTenantSlug(tenant.slug);
      setTenantName(tenant.name);
      setLoading(false);
    }
  }

  const [branches, setBranches] = useState<{ id: string; name: string; slug: string; address: string | null }[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantName, setTenantName] = useState("");

  if (branches.length > 0) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 pt-10">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
              <Store className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{tenantName}</h1>
            <p className="mt-1 text-sm text-slate-500">Select your branch to continue</p>
          </div>

          <div className="space-y-2">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => router.push(`/s/${tenantSlug}/b/${b.slug}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div>
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  {b.address && <p className="mt-0.5 text-xs text-slate-400">{b.address}</p>}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setBranches([])}
            className="w-full text-center text-sm text-slate-400 hover:text-slate-600"
          >
            ← Different store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <ScanLine className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Product Scanner</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter your store code to start scanning products.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Store code (e.g. vmart)"
            autoFocus
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-base text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={loading || !slug.trim()}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ArrowRight className="h-5 w-5" /> Continue</>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Or scan the QR code at the store entrance.
        </p>
      </div>
    </div>
  );
}
