import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { mrp, selling_price, offer_price, stock_qty, is_active } = body;

    const existing = await prisma.branchProduct.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const branchProduct = await prisma.branchProduct.update({
      where: { id },
      data: {
        ...(mrp !== undefined && { mrp }),
        ...(selling_price !== undefined && { selling_price }),
        ...(offer_price !== undefined && { offer_price: offer_price ?? null }),
        ...(stock_qty !== undefined && { stock_qty }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return Response.json({ success: true, branchProduct });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const existing = await prisma.branchProduct.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    await prisma.branchProduct.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
