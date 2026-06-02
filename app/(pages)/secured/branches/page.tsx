"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Edit2, Loader2, Monitor, Plus, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  is_active: boolean;
  created_on: string;
  kiosk_logo_url: string | null;
  kiosk_video_url: string | null;
  kiosk_headline: string | null;
  kiosk_subtitle: string | null;
  kiosk_cta_text: string | null;
  kiosk_accent_color: string | null;
};

type FormState = { name: string; address: string };
const EMPTY_FORM: FormState = { name: "", address: "" };

type KioskForm = {
  kiosk_logo_url: string;
  kiosk_video_url: string;
  kiosk_headline: string;
  kiosk_subtitle: string;
  kiosk_cta_text: string;
  kiosk_accent_color: string;
};
const EMPTY_KIOSK: KioskForm = {
  kiosk_logo_url: "", kiosk_video_url: "",
  kiosk_headline: "", kiosk_subtitle: "",
  kiosk_cta_text: "", kiosk_accent_color: "#2563eb",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm text-slate-700">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Kiosk config
  const [kioskTarget, setKioskTarget] = useState<Branch | null>(null);
  const [kioskForm, setKioskForm] = useState<KioskForm>(EMPTY_KIOSK);
  const [kioskSaving, setKioskSaving] = useState(false);
  const [kioskError, setKioskError] = useState("");

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/secured/branches", { credentials: "include" });
    const data = await res.json();
    if (data.success) setBranches(data.branches);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({ name: branch.name, address: branch.address ?? "" });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const url = editing ? `/api/secured/branches/${editing.id}` : "/api/secured/branches";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: form.name, address: form.address }),
    });
    const data = await res.json();

    if (!data.success) {
      setFormError(data.error ?? "Something went wrong");
    } else {
      closeModal();
      fetchBranches();
    }
    setSaving(false);
  }

  async function handleToggleActive(branch: Branch) {
    await fetch(`/api/secured/branches/${branch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !branch.is_active }),
    });
    fetchBranches();
  }

  function openKiosk(branch: Branch) {
    setKioskTarget(branch);
    setKioskForm({
      kiosk_logo_url:     branch.kiosk_logo_url     ?? "",
      kiosk_video_url:    branch.kiosk_video_url     ?? "",
      kiosk_headline:     branch.kiosk_headline      ?? "",
      kiosk_subtitle:     branch.kiosk_subtitle      ?? "",
      kiosk_cta_text:     branch.kiosk_cta_text      ?? "",
      kiosk_accent_color: branch.kiosk_accent_color  ?? "#2563eb",
    });
    setKioskError("");
  }

  async function handleKioskSave(e: React.FormEvent) {
    e.preventDefault();
    if (!kioskTarget) return;
    setKioskSaving(true); setKioskError("");
    const res = await fetch(`/api/secured/branches/${kioskTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kiosk_logo_url:     kioskForm.kiosk_logo_url     || null,
        kiosk_video_url:    kioskForm.kiosk_video_url     || null,
        kiosk_headline:     kioskForm.kiosk_headline      || null,
        kiosk_subtitle:     kioskForm.kiosk_subtitle      || null,
        kiosk_cta_text:     kioskForm.kiosk_cta_text      || null,
        kiosk_accent_color: kioskForm.kiosk_accent_color  || null,
      }),
    });
    const data = await res.json();
    if (!data.success) { setKioskError(data.error ?? "Something went wrong"); }
    else { setKioskTarget(null); fetchBranches(); }
    setKioskSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/secured/branches/${deleteTarget.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) {
      setDeleteTarget(null);
      fetchBranches();
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your store locations.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add branch
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No branches yet</p>
            <button
              type="button"
              onClick={openCreate}
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              Add your first branch
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Address</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{branch.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{branch.slug}</td>
                  <td className="px-5 py-3 text-slate-600">{branch.address || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        branch.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {branch.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(branch)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openKiosk(branch)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                        title="Kiosk settings"
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(branch)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title={branch.is_active ? "Deactivate" : "Activate"}
                      >
                        {branch.is_active ? (
                          <ToggleRight className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(branch)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <Modal title={editing ? "Edit branch" : "Add branch"} onClose={closeModal}>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Branch name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Koramangala"
                required
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Store address (optional)"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create branch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Kiosk config modal */}
      {kioskTarget && (
        <Modal title={`Kiosk settings — ${kioskTarget.name}`} onClose={() => setKioskTarget(null)}>
          <form onSubmit={handleKioskSave} className="space-y-4">
            {kioskError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{kioskError}</p>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Logo URL</label>
              <input type="url" value={kioskForm.kiosk_logo_url}
                onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Background video URL</label>
              <input type="url" value={kioskForm.kiosk_video_url}
                onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_video_url: e.target.value }))}
                placeholder="https://example.com/promo.mp4"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              <p className="text-xs text-slate-400">MP4 recommended. Plays silently and loops behind the idle screen.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Headline</label>
              <input type="text" value={kioskForm.kiosk_headline}
                onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_headline: e.target.value }))}
                placeholder={`Default: ${kioskTarget.name}`}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Subtitle</label>
              <input type="text" value={kioskForm.kiosk_subtitle}
                onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_subtitle: e.target.value }))}
                placeholder="e.g. Your neighbourhood supermarket"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Call-to-action text</label>
              <input type="text" value={kioskForm.kiosk_cta_text}
                onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_cta_text: e.target.value }))}
                placeholder="Default: Place product under the scanner"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Accent color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={kioskForm.kiosk_accent_color}
                  onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_accent_color: e.target.value }))}
                  className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200 p-1" />
                <input type="text" value={kioskForm.kiosk_accent_color}
                  onChange={(e) => setKioskForm((f) => ({ ...f, kiosk_accent_color: e.target.value }))}
                  placeholder="#2563eb"
                  className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-mono outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setKioskTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={kioskSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                {kioskSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save kiosk settings
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete branch "${deleteTarget.name}"? This will also remove all pricing configured for this branch.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
