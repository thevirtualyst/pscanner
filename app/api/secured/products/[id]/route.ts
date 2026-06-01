import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const product = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!product) return Response.json({ success: false, error: "Not found" }, { status: 404 });
    return Response.json({ success: true, product });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { name, brand, category, image_url } = body;

    const existing = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(brand !== undefined && { brand: brand?.trim() || null }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(image_url !== undefined && { image_url }),
      },
    });

    return Response.json({ success: true, product });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const existing = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    await prisma.branchProduct.deleteMany({ where: { product_id: id } });
    await prisma.productScanLog.deleteMany({ where: { product_id: id } });
    await prisma.product.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
