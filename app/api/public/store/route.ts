import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/public/store?slug=vmart  →  tenant + active branches
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return Response.json({ success: false, error: "slug is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      branches: {
        where: { is_active: true },
        select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!tenant || tenant.status !== "active") {
    return Response.json({ success: false, error: "Store not found" }, { status: 404 });
  }

  return Response.json({ success: true, tenant });
}
