import { prisma } from "@/lib/prisma";

// GET /api/public/stores  →  all active stores with active branches + coordinates
export async function GET() {
  const tenants = await prisma.tenant.findMany({
    where: { status: "active" },
    select: {
      name: true,
      slug: true,
      branches: {
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          latitude: true,
          longitude: true,
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const stores = tenants.map((t) => ({
    name: t.name,
    slug: t.slug,
    logo_url: null,
    branches: t.branches,
  }));

  return Response.json({ stores });
}
