"use client";

import { usePathname } from "next/navigation";

const HIDE_FOOTER_PATHS = ["/login", "/register", "/s"];

export default function LayoutFooter() {
  const pathname = usePathname();
  const shouldHide = HIDE_FOOTER_PATHS.some((p) => pathname.startsWith(p));
  if (shouldHide || pathname === "/") return null;

  return (
    <footer className="border-t border-slate-200 bg-white py-4">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} pscanner. All rights reserved.
      </div>
    </footer>
  );
}
