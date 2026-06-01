import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const branches = await prisma.branch.findMany({
      where: { tenant_id: user.tenant_id! },
      orderBy: { created_on: "asc" },
    });
    return Response.json({ success: true, branches });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { name, address } = body;

    if (!name?.trim()) {
      return Response.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const slug = slugify(name.trim());

    const existing = await prisma.branch.findUnique({
      where: { tenant_id_slug: { tenant_id: user.tenant_id!, slug } },
    });
    if (existing) {
      return Response.json({ success: false, error: "A branch with this name already exists" }, { status: 409 });
    }

    const branch = await prisma.branch.create({
      data: {
        tenant_id: user.tenant_id!,
        name: name.trim(),
        slug,
        address: address?.trim() || null,
        is_active: true,
      },
    });

    return Response.json({ success: true, branch }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
