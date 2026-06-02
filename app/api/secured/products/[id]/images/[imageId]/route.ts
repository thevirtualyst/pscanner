import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// PUT — set as primary
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    const user = await requireAuthenticatedUser(req);

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, product_id: id, tenant_id: user.tenant_id! },
    });
    if (!image) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    // Unset all primary flags for this product, then set this one
    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { product_id: id },
        data: { is_primary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { is_primary: true },
      }),
      // Keep product.image_url in sync
      prisma.product.update({
        where: { id },
        data: { image_url: image.url },
      }),
    ]);

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE — remove image
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    const user = await requireAuthenticatedUser(req);

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, product_id: id, tenant_id: user.tenant_id! },
    });
    if (!image) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    await prisma.productImage.delete({ where: { id: imageId } });

    // If we deleted the primary, promote the next image (lowest sort_order)
    if (image.is_primary) {
      const next = await prisma.productImage.findFirst({
        where: { product_id: id },
        orderBy: { sort_order: "asc" },
      });
      if (next) {
        await prisma.$transaction([
          prisma.productImage.update({ where: { id: next.id }, data: { is_primary: true } }),
          prisma.product.update({ where: { id }, data: { image_url: next.url } }),
        ]);
      } else {
        // No images left — clear image_url
        await prisma.product.update({ where: { id }, data: { image_url: null } });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
