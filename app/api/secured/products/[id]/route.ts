import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const product = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
      include: { images: { orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }] } },
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

    const existing = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const {
      name, brand, category, image_url, alt_names,
      sku, weight_volume, manufacturer, country_of_origin,
      serving_size, nutrition_json, ingredients, allergens,
      usage_instructions, storage_instructions, shelf_life,
      disclaimer, legal_info, certifications,
      tags, video_url,
    } = body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name               !== undefined && { name: name?.trim() }),
        ...(brand              !== undefined && { brand: brand?.trim() || null }),
        ...(category           !== undefined && { category: category?.trim() || null }),
        ...(image_url          !== undefined && { image_url }),
        ...(alt_names          !== undefined && { alt_names: alt_names || null }),
        ...(sku                !== undefined && { sku: sku?.trim() || null }),
        ...(weight_volume      !== undefined && { weight_volume: weight_volume?.trim() || null }),
        ...(manufacturer       !== undefined && { manufacturer: manufacturer?.trim() || null }),
        ...(country_of_origin  !== undefined && { country_of_origin: country_of_origin?.trim() || null }),
        ...(serving_size       !== undefined && { serving_size: serving_size?.trim() || null }),
        ...(nutrition_json     !== undefined && { nutrition_json: nutrition_json || null }),
        ...(ingredients        !== undefined && { ingredients: ingredients?.trim() || null }),
        ...(allergens          !== undefined && { allergens: allergens?.trim() || null }),
        ...(usage_instructions !== undefined && { usage_instructions: usage_instructions?.trim() || null }),
        ...(storage_instructions !== undefined && { storage_instructions: storage_instructions?.trim() || null }),
        ...(shelf_life         !== undefined && { shelf_life: shelf_life?.trim() || null }),
        ...(disclaimer         !== undefined && { disclaimer: disclaimer?.trim() || null }),
        ...(legal_info         !== undefined && { legal_info: legal_info?.trim() || null }),
        ...(certifications     !== undefined && { certifications: certifications?.trim() || null }),
        ...(tags               !== undefined && { tags: tags?.trim() || null }),
        ...(video_url          !== undefined && { video_url: video_url?.trim() || null }),
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
    await prisma.productImage.deleteMany({ where: { product_id: id } });
    await prisma.product.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
