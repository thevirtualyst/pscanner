"use client";

import { useSession } from "next-auth/react";
import { BarChart2, Building2, Package, QrCode, ScanLine, Zap } from "lucide-react";
import Link from "next/link";

const QUICK_LINKS = [
  {
    label: "Branches",
    description: "Manage store locations",
    icon: Building2,
    href: "/secured/branches",
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Products",
    description: "Add or update products",
    icon: Package,
    href: "/secured/products",
    color: "bg-violet-50 text-violet-600",
  },
  {
    label: "POS Integration",
    description: "API keys & sync setup",
    icon: Zap,
    href: "/secured/integrations",
    color: "bg-amber-50 text-amber-600",
  },
  {
    label: "Analytics",
    description: "Scan trends & insights",
    icon: BarChart2,
    href: "/secured/analytics",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your store, products, and scan experience from here.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Store portal
        </span>
      </div>

      {/* How it works banner */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <ScanLine className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">How the scanner works</h3>
            <p className="mt-1 text-sm text-slate-600">
              Place a QR code in your store. Customers scan it, open the PWA in their browser,
              then scan any product barcode to instantly see the price, offers, and availability —
              no app download required.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                <QrCode className="h-3 w-3" /> 1. Store displays QR
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                <ScanLine className="h-3 w-3" /> 2. Customer scans product
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                <Package className="h-3 w-3" /> 3. Product info displayed instantly
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Quick access
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting started checklist */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">Getting started</h3>
        <p className="mt-1 text-sm text-slate-500">
          Complete these steps to go live.
        </p>
        <ol className="mt-4 space-y-3">
          {[
            { step: "1", text: "Create your first branch", href: "/secured/branches" },
            { step: "2", text: "Add products and set pricing", href: "/secured/products" },
            { step: "3", text: "Generate a POS API key and connect your billing software", href: "/secured/integrations" },
            { step: "4", text: "Print and place the branch QR code in-store", href: "/secured/branches" },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {item.step}
              </span>
              <Link
                href={item.href}
                className="text-sm text-slate-700 underline-offset-2 hover:text-blue-700 hover:underline"
              >
                {item.text}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
