"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart2,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Package,
  Settings,
  Tag,
  Users,
  X,
  Zap,
} from "lucide-react";

type NavChild = { label: string; path: string };
type NavItem = {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: NavChild[];
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/secured/dashboard" },
    ],
  },
  {
    label: "Store",
    items: [
      { icon: Building2, label: "Branches", path: "/secured/branches" },
      { icon: Package, label: "Products", path: "/secured/products" },
      { icon: Tag, label: "Pricing", path: "/secured/pricing" },
      { icon: Monitor, label: "Kiosk Setup", path: "/secured/kiosk-setup" },
    ],
  },
  {
    label: "Integration",
    items: [
      { icon: Zap, label: "POS Integration", path: "/secured/integrations" },
    ],
  },
  {
    label: "Insights",
    items: [
      { icon: BarChart2, label: "Analytics", path: "/secured/analytics" },
    ],
  },
  {
    label: "Admin",
    items: [
      { icon: Users, label: "Users", path: "/secured/users" },
      {
        icon: Settings,
        label: "Settings",
        children: [
          { label: "Roles", path: "/secured/roles" },
        ],
      },
    ],
  },
];

function ScannerLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const h = size === "sm" ? 18 : 22;
  return (
    <div className="flex items-center gap-2">
      <svg width={h} height={h} viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="8" height="8" rx="2" stroke="#3b82f6" strokeWidth="2" />
        <rect x="13" y="1" width="8" height="8" rx="2" stroke="#3b82f6" strokeWidth="2" />
        <rect x="1" y="13" width="8" height="8" rx="2" stroke="#3b82f6" strokeWidth="2" />
        <path d="M13 13h2v2h-2zM17 13h2v2h-2zM13 17h2v2h-2zM17 17h2v2h-2z" fill="#3b82f6" />
      </svg>
      <span className={`${size === "sm" ? "text-sm" : "text-base"} font-bold tracking-tight text-slate-900`}>
        pscanner
      </span>
    </div>
  );
}

function NavItemRow({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100"
        >
          <div className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        {open && (
          <div className="ml-3.5 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
            {item.children.map((child) => (
              <button
                key={child.label}
                type="button"
                onClick={() => router.push(child.path)}
                className="flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
              >
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = item.path ? pathname === item.path || pathname.startsWith(item.path + "/") : false;

  return (
    <button
      type="button"
      onClick={() => item.path && router.push(item.path)}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "border border-blue-100 bg-blue-50 font-semibold text-blue-700"
          : "cursor-pointer text-slate-800 hover:bg-slate-100"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </button>
  );
}

export default function SecuredLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <ScannerLogo />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItemRow key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session?.user?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-slate-400">{session?.user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md p-1 text-slate-400 transition hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <ScannerLogo size="sm" />
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
