"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check, ChevronRight, Copy, ExternalLink,
  Monitor, Settings, Smartphone, Tablet,
} from "lucide-react";

type Branch = { id: string; name: string; slug: string; is_active: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }
  return { copied, copy };
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copied, copy } = useClipboard();
  return (
    <button type="button" onClick={() => copy(text, id)}
      className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
      {copied === id ? <><Check className="h-3 w-3 text-emerald-500" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

function StepCard({ number, title, children }: {
  number: number; title: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {number}
      </div>
      <div className="flex-1 pb-6">
        <p className="font-semibold text-slate-900">{title}</p>
        <div className="mt-1.5 text-sm text-slate-600 space-y-1">{children}</div>
      </div>
    </div>
  );
}

function Callout({ color, children }: { color: "blue" | "amber" | "emerald"; children: React.ReactNode }) {
  const cls = {
    blue:    "border-blue-200 bg-blue-50 text-blue-800",
    amber:   "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[color];
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>
  );
}

// ─── Platform guides ──────────────────────────────────────────────────────────

function AndroidGuide({ kioskUrl }: { kioskUrl: string }) {
  return (
    <div className="space-y-0">
      <StepCard number={1} title="Open Chrome on your Android tablet">
        <p>Make sure you're using <strong>Google Chrome</strong> — the install feature doesn't work in other browsers.</p>
      </StepCard>

      <StepCard number={2} title="Navigate to your kiosk URL">
        <p>Type or paste the URL below into the Chrome address bar:</p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs break-all">
          <span className="flex-1 text-slate-700">{kioskUrl}</span>
          <CopyButton text={kioskUrl} id="android-url" />
        </div>
      </StepCard>

      <StepCard number={3} title="Install the app">
        <p>You will see one of these install options:</p>
        <ul className="mt-1.5 space-y-1.5">
          <li className="flex items-start gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span>A banner at the bottom of the screen saying <strong>"Add to Home screen"</strong> — tap it</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span>An <strong>install icon</strong> (⊕) in the address bar — tap it</span>
          </li>
          <li className="flex items-start gap-2">
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <span>Or look for the <strong>"Install as app"</strong> button on the idle screen itself</span>
          </li>
        </ul>
        <p className="mt-1.5">Tap <strong>Install</strong> on the confirmation dialog.</p>
      </StepCard>

      <StepCard number={4} title="Launch the app">
        <p>Find the <strong>pscanner</strong> icon on your home screen and tap it. It will open in full-screen — no browser bar visible.</p>
      </StepCard>

      <StepCard number={5} title="Keep the screen always on">
        <p>Go to <strong>Settings → Display → Screen timeout</strong> and set it to <strong>Never</strong> (or the longest available option).</p>
      </StepCard>

      <StepCard number={6} title="Lock to kiosk mode with Screen Pinning">
        <ol className="space-y-1 list-decimal list-inside">
          <li>Go to <strong>Settings → Security</strong> (may be under "Biometrics and security" on Samsung)</li>
          <li>Find <strong>Screen pinning</strong> or <strong>App pinning</strong> → turn it <strong>ON</strong></li>
          <li>Switch back to the kiosk app</li>
          <li>Tap the <strong>Recent Apps</strong> button (the square ▢ at the bottom)</li>
          <li>Tap the <strong>app icon</strong> at the top of the kiosk card</li>
          <li>Tap <strong>"Pin"</strong></li>
        </ol>
        <Callout color="blue">
          <strong>To unpin later:</strong> Hold the <strong>Back</strong> and <strong>Recent Apps</strong> buttons simultaneously for 2 seconds.
        </Callout>
      </StepCard>
    </div>
  );
}

function IpadGuide({ kioskUrl }: { kioskUrl: string }) {
  return (
    <div className="space-y-0">
      <StepCard number={1} title="Open Safari on your iPad">
        <p>You must use <strong>Safari</strong> on iPad — other browsers don't support "Add to Home Screen" with full-screen launch.</p>
      </StepCard>

      <StepCard number={2} title="Navigate to your kiosk URL">
        <p>Type or paste the URL below into the Safari address bar:</p>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs break-all">
          <span className="flex-1 text-slate-700">{kioskUrl}</span>
          <CopyButton text={kioskUrl} id="ipad-url" />
        </div>
      </StepCard>

      <StepCard number={3} title="Add to Home Screen">
        <ol className="space-y-1 list-decimal list-inside">
          <li>Tap the <strong>Share button</strong> (the box with an arrow pointing up ↑) in the Safari toolbar</li>
          <li>Scroll down in the share sheet and tap <strong>"Add to Home Screen"</strong></li>
          <li>You can rename the app if you like, then tap <strong>"Add"</strong> in the top-right</li>
        </ol>
      </StepCard>

      <StepCard number={4} title="Launch the app">
        <p>Find the icon on your iPad home screen and tap it. It launches in full-screen with no Safari browser bar.</p>
      </StepCard>

      <StepCard number={5} title="Keep the screen always on">
        <p>Go to <strong>Settings → Display & Brightness → Auto-Lock</strong> and set it to <strong>Never</strong>.</p>
      </StepCard>

      <StepCard number={6} title="Lock to kiosk mode with Guided Access">
        <p className="font-medium text-slate-700">First-time setup (do this once):</p>
        <ol className="mt-1 space-y-1 list-decimal list-inside">
          <li>Go to <strong>Settings → Accessibility → Guided Access</strong></li>
          <li>Turn <strong>Guided Access ON</strong></li>
          <li>Tap <strong>Passcode Settings → Set Guided Access Passcode</strong> and choose a PIN — this is what staff use to unlock the kiosk</li>
        </ol>

        <p className="mt-3 font-medium text-slate-700">Each time you start the kiosk:</p>
        <ol className="mt-1 space-y-1 list-decimal list-inside">
          <li>Open the kiosk app</li>
          <li><strong>Triple-click</strong> the side button (or Home button on older iPads)</li>
          <li>Tap <strong>"Start"</strong> in the bottom-right corner</li>
        </ol>
        <Callout color="blue">
          <strong>To exit Guided Access:</strong> Triple-click the side button → enter your passcode → tap <strong>"End"</strong>.
        </Callout>
      </StepCard>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KioskSetupPage() {
  const [branches, setBranches]     = useState<Branch[]>([]);
  const [storeSlug, setStoreSlug]   = useState("");
  const [loading, setLoading]       = useState(true);
  const [platform, setPlatform]     = useState<"android" | "ipad">("android");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const fetchBranches = useCallback(async () => {
    const res  = await fetch("/api/secured/branches", { credentials: "include" });
    const data = await res.json();
    if (data.success) {
      setBranches(data.branches);
      setStoreSlug(data.store_slug ?? "");
      const first = data.branches.find((b: Branch) => b.is_active) ?? data.branches[0] ?? null;
      setSelectedBranch(first);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const kioskUrl = selectedBranch && storeSlug
    ? `${origin}/s/${storeSlug}/b/${selectedBranch.slug}/kiosk`
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kiosk Setup Guide</h1>
        <p className="mt-1 text-sm text-slate-500">
          Follow these steps to install the product scanner as a full-screen kiosk app on your tablet.
        </p>
      </div>

      {/* Before you start */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-500" />
          Before you start
        </h2>
        <p className="text-sm text-slate-600">
          Make sure you've configured your kiosk appearance in{" "}
          <a href="/secured/branches" className="font-medium text-blue-600 hover:underline">
            Branches
          </a>{" "}
          — tap the <Monitor className="inline h-3.5 w-3.5" /> icon next to your branch to set a logo, background video, and brand colors.
        </p>

        {/* Branch selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Select branch to install</label>
          {loading ? (
            <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
          ) : branches.length === 0 ? (
            <Callout color="amber">
              No branches found. <a href="/secured/branches" className="underline font-medium">Add a branch</a> first.
            </Callout>
          ) : (
            <select
              value={selectedBranch?.id ?? ""}
              onChange={(e) => setSelectedBranch(branches.find((b) => b.id === e.target.value) ?? null)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{!b.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          )}

          {kioskUrl && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Your kiosk URL</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="flex-1 break-all font-mono text-xs text-slate-700">{kioskUrl}</span>
                <CopyButton text={kioskUrl} id="main-url" />
                <a href={kioskUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button type="button"
            onClick={() => setPlatform("android")}
            className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
              platform === "android"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}>
            <Smartphone className="h-4 w-4" /> Android Tablet
          </button>
          <button type="button"
            onClick={() => setPlatform("ipad")}
            className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm font-semibold transition ${
              platform === "ipad"
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}>
            <Tablet className="h-4 w-4" /> iPad
          </button>
        </div>

        <div className="p-6">
          {platform === "android"
            ? <AndroidGuide kioskUrl={kioskUrl || "https://yourapp.com/s/store/b/branch/kiosk"} />
            : <IpadGuide    kioskUrl={kioskUrl || "https://yourapp.com/s/store/b/branch/kiosk"} />
          }
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-slate-900">Recommended setup tips</h2>
        <ul className="space-y-2.5 text-sm text-slate-600">
          {[
            "Use a tablet stand or wall mount so customers can easily scan products.",
            "Connect the tablet to a stable Wi-Fi network — the kiosk needs internet to look up products.",
            "Pair with a USB or Bluetooth barcode scanner for hands-free scanning. The kiosk detects scanner input automatically.",
            "If using a USB scanner, connect it to the tablet using a USB-C to USB-A adapter.",
            "Keep the tablet plugged in at all times to prevent it from powering off.",
            "For multi-branch setups, each branch has its own kiosk URL and can have its own branding.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
