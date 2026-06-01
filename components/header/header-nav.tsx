"use client";

import { signOut } from "next-auth/react";
import { LogOut, ScanLine } from "lucide-react";

interface Props {
  user: { name?: string; email?: string } | null;
}

export default function HeaderNav({ user }: Props) {
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-blue-600" />
        <span className="text-sm font-bold tracking-tight text-slate-900">pscanner</span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {initials}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
