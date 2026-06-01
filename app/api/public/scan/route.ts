import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/public/scan?branchId=xxx&barcode=yyy
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId")?.trim();
  const barcode  = searchParams.get("barcode")?.trim();

  if (!branchId || !barcode) {
    return Response.json({ success: false, error: "branchId and barcode are required" }, { status: 400 });
  }

  const bp = await prisma.branchProduct.findFirst({
    where: {
      branch_id: branchId,
      is_active: true,
      product: { barcode },
    },
    include: {
      product: { select: { name: true, brand: true, category: true, image_url: true, barcode: true } },
      branch:  { select: { name: true, tenant: { select: { name: true } } } },
    },
  });

  if (!bp) {
    return Response.json({ success: false, error: "Product not found in this branch" }, { status: 404 });
  }

  // Log the scan (fire-and-forget — don't block the response)
  prisma.productScanLog.create({
    data: {
      tenant_id:   bp.tenant_id,
      branch_id:   bp.branch_id,
      product_id:  bp.product_id,
      device_type: req.headers.get("x-device-type") ?? "PWA",
    },
  }).catch(() => {});

  const stockQty = bp.stock_qty;
  const availability =
    stockQty === 0   ? "OUT_OF_STOCK" :
    stockQty <= 10   ? "LIMITED"      : "AVAILABLE";

  return Response.json({
    success: true,
    product: {
      name:         bp.product.name,
      brand:        bp.product.brand,
      category:     bp.product.category,
      image_url:    bp.product.image_url,
      barcode:      bp.product.barcode,
      mrp:          Number(bp.mrp),
      selling_price: Number(bp.selling_price),
      offer_price:  bp.offer_price ? Number(bp.offer_price) : null,
      availability,
    },
    branch: bp.branch.name,
    store:  bp.branch.tenant.name,
  });
}
