import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeSlug  = searchParams.get("store")  ?? "";
  const branchSlug = searchParams.get("branch") ?? "";

  let storeName  = "Product Scanner";
  let branchName = "";
  let accent     = "#2563eb";

  try {
    const branch = await prisma.branch.findFirst({
      where: { slug: branchSlug, tenant: { slug: storeSlug } },
      select: { name: true, kiosk_accent_color: true, tenant: { select: { name: true } } },
    });
    if (branch) {
      storeName  = branch.tenant.name;
      branchName = branch.name;
      accent     = branch.kiosk_accent_color ?? "#2563eb";
    }
  } catch {
    // DB unavailable — serve a valid manifest with defaults
  }

  const manifest = {
    name: branchName ? `${storeName} — ${branchName}` : storeName,
    short_name: storeName,
    description: "Scan any product to see price, nutrition, and details instantly.",
    start_url: `/s/${storeSlug}/b/${branchSlug}/kiosk`,
    scope: `/s/${storeSlug}/b/${branchSlug}/kiosk`,
    display: "fullscreen",
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: accent,
    icons: [
      { src: "/api/kiosk-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/kiosk-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/kiosk-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
