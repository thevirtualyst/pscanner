import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storeSlug: string; branchSlug: string }> }
) {
  const { storeSlug, branchSlug } = await params;

  const branch = await prisma.branch.findFirst({
    where: { slug: branchSlug, tenant: { slug: storeSlug } },
    select: {
      name: true,
      kiosk_accent_color: true,
      tenant: { select: { name: true } },
    },
  });

  const storeName  = branch?.tenant.name ?? "Product Scanner";
  const branchName = branch?.name ?? "";
  const accent     = branch?.kiosk_accent_color ?? "#2563eb";

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
      {
        src: "/icons/scanner-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
