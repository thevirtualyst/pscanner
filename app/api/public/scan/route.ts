import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId")?.trim();
  const barcode  = searchParams.get("barcode")?.trim();

  if (!branchId || !barcode) {
    return Response.json({ success: false, error: "branchId and barcode are required" }, { status: 400 });
  }

  const bp = await prisma.branchProduct.findFirst({
    where: { branch_id: branchId, is_active: true, product: { barcode } },
    include: {
      product: {
        select: {
          name: true, brand: true, category: true, barcode: true,
          image_url: true, sku: true, weight_volume: true,
          ingredients: true, allergens: true,
          nutrition_json: true, serving_size: true,
          usage_instructions: true, storage_instructions: true, shelf_life: true,
          disclaimer: true, legal_info: true, certifications: true,
          video_url: true,
          images: {
            orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
            select: { url: true },
          },
        },
      },
      branch: { select: { name: true, tenant: { select: { name: true } } } },
    },
  });

  if (!bp) {
    return Response.json({ success: false, error: "Product not found in this branch" }, { status: 404 });
  }

  prisma.productScanLog.create({
    data: {
      tenant_id: bp.tenant_id,
      branch_id: bp.branch_id,
      product_id: bp.product_id,
      device_type: req.headers.get("x-device-type") ?? "PWA",
    },
  }).catch(() => {});

  const stockQty = bp.stock_qty;
  const availability =
    stockQty === 0  ? "OUT_OF_STOCK" :
    stockQty <= 10  ? "LIMITED"      : "AVAILABLE";

  const { product } = bp;

  return Response.json({
    success: true,
    product: {
      name: product.name, brand: product.brand, category: product.category,
      barcode: product.barcode, image_url: product.image_url,
      images: product.images,
      mrp: Number(bp.mrp),
      selling_price: Number(bp.selling_price),
      offer_price: bp.offer_price ? Number(bp.offer_price) : null,
      availability,
      sku: product.sku, weight_volume: product.weight_volume,
      ingredients: product.ingredients, allergens: product.allergens,
      nutrition_json: product.nutrition_json, serving_size: product.serving_size,
      usage_instructions: product.usage_instructions,
      storage_instructions: product.storage_instructions,
      shelf_life: product.shelf_life,
      disclaimer: product.disclaimer, legal_info: product.legal_info,
      certifications: product.certifications, video_url: product.video_url,
    },
    branch: bp.branch.name,
    store: bp.branch.tenant.name,
  });
}
