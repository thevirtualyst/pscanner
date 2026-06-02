import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { uploadToS3 } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const branch = await prisma.branch.findFirst({
      where: { id, tenant_id: user.tenant_id! },
      select: { id: true },
    });
    if (!branch) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ success: false, error: "No file provided" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { success: false, error: "Only JPG, PNG, WebP and SVG are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { success: false, error: "File exceeds 10 MB limit" },
        { status: 400 }
      );
    }

    const ext = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop()?.toLowerCase() ?? "png");
    const key = `tenants/${user.tenant_id}/kiosk/${id}/logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const logoUrl = await uploadToS3(key, buffer, file.type);

    await prisma.branch.update({
      where: { id },
      data: { kiosk_logo_url: logoUrl },
    });

    return Response.json({ success: true, logoUrl });
  } catch (err) {
    return authErrorResponse(err);
  }
}
