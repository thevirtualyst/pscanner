import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 50;

    const where = {
      tenant_id: user.tenant_id!,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { barcode: { contains: search } },
          { brand: { contains: search } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return Response.json({ success: true, products, total, page, limit });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const {
      barcode, name, brand, category, alt_names,
      sku, weight_volume, manufacturer, country_of_origin,
      serving_size, nutrition_json, ingredients, allergens,
      usage_instructions, storage_instructions, shelf_life,
      disclaimer, legal_info, certifications, tags, video_url,
    } = body;

    if (!barcode?.trim()) return Response.json({ success: false, error: "Barcode is required" }, { status: 400 });
    if (!name?.trim()) return Response.json({ success: false, error: "Name is required" }, { status: 400 });

    const existing = await prisma.product.findUnique({
      where: { tenant_id_barcode: { tenant_id: user.tenant_id!, barcode: barcode.trim() } },
    });
    if (existing) {
      return Response.json({ success: false, error: "A product with this barcode already exists" }, { status: 409 });
    }

    const product = await prisma.product.create({
      data: {
        tenant_id: user.tenant_id!,
        barcode: barcode.trim(),
        name: name.trim(),
        brand: brand?.trim() || null,
        category: category?.trim() || null,
        alt_names: alt_names || null,
        sku: sku?.trim() || null,
        weight_volume: weight_volume?.trim() || null,
        manufacturer: manufacturer?.trim() || null,
        country_of_origin: country_of_origin?.trim() || null,
        serving_size: serving_size?.trim() || null,
        nutrition_json: nutrition_json || null,
        ingredients: ingredients?.trim() || null,
        allergens: allergens?.trim() || null,
        usage_instructions: usage_instructions?.trim() || null,
        storage_instructions: storage_instructions?.trim() || null,
        shelf_life: shelf_life?.trim() || null,
        disclaimer: disclaimer?.trim() || null,
        legal_info: legal_info?.trim() || null,
        certifications: certifications?.trim() || null,
        tags: tags?.trim() || null,
        video_url: video_url?.trim() || null,
      },
    });

    return Response.json({ success: true, product }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
