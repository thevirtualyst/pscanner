import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { uploadToS3 } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const productId = formData.get("productId") as string | null;

    if (!file || !productId) {
      return Response.json({ success: false, error: "file and productId are required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ success: false, error: "Only JPG, PNG, WebP and GIF are allowed" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ success: false, error: "File exceeds 5 MB limit" }, { status: 400 });
    }

    // Verify product belongs to this tenant
    const product = await prisma.product.findFirst({
      where: { id: productId, tenant_id: user.tenant_id! },
      select: { id: true },
    });
    if (!product) {
      return Response.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `tenants/${user.tenant_id}/products/${productId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const imageUrl = await uploadToS3(key, buffer, file.type);

    // Persist the URL immediately so callers don't need a second PUT
    await prisma.product.update({
      where: { id: productId },
      data: { image_url: imageUrl },
    });

    return Response.json({ success: true, imageUrl });
  } catch (err) {
    return authErrorResponse(err);
  }
}
