"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import HeaderNav from "@/components/header/header-nav";

const HIDE_HEADER_PATHS = ["/login", "/register", "/s"];

export default function LayoutHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const shouldHide = HIDE_HEADER_PATHS.some((p) => pathname.startsWith(p));
  if (shouldHide || pathname === "/") return null;

  const user = session?.user
    ? {
        name: session.user.name ?? undefined,
        email: session.user.email ?? undefined,
      }
    : null;

  return <HeaderNav user={user} />;
}
