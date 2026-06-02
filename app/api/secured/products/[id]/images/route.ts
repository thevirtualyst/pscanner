import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const product = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
      select: { id: true },
    });
    if (!product) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const images = await prisma.productImage.findMany({
      where: { product_id: id },
      orderBy: [{ is_primary: "desc" }, { sort_order: "asc" }],
    });

    return Response.json({ success: true, images });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const product = await prisma.product.findFirst({
      where: { id, tenant_id: user.tenant_id! },
      select: { id: true, image_url: true },
    });
    if (!product) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const count = await prisma.productImage.count({ where: { product_id: id } });
    const isFirst = count === 0;
    let url: string;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      // ── URL-based image ──────────────────────────────────────────────────────
      const body = await req.json();
      if (!body.url?.trim()) {
        return Response.json({ success: false, error: "url is required" }, { status: 400 });
      }
      url = body.url.trim();
    } else {
      // ── File upload ──────────────────────────────────────────────────────────
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ success: false, error: "No file provided" }, { status: 400 });

      if (!ALLOWED_TYPES.includes(file.type)) {
        return Response.json({ success: false, error: "Only JPG, PNG, WebP and GIF are allowed" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return Response.json({ success: false, error: "File exceeds 5 MB limit" }, { status: 400 });
      }

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const imageId = crypto.randomUUID();
      const key = `tenants/${user.tenant_id}/products/${id}/${imageId}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      url = await uploadToS3(key, buffer, file.type);
    }

    const image = await prisma.productImage.create({
      data: {
        product_id: id,
        tenant_id: user.tenant_id!,
        url,
        sort_order: count,
        is_primary: isFirst,
      },
    });

    if (isFirst) {
      await prisma.product.update({ where: { id }, data: { image_url: url } });
    }

    return Response.json({ success: true, image }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
