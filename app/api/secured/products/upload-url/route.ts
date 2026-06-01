import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { getPresignedUploadUrl } from "@/lib/s3";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { productId, filename, contentType } = await req.json();

    if (!productId || !filename || !contentType) {
      return Response.json({ success: false, error: "productId, filename, and contentType are required" }, { status: 400 });
    }

    const ext = filename.split(".").pop() ?? "jpg";
    const key = `tenants/${user.tenant_id}/products/${productId}.${ext}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType, 300);
    const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return Response.json({ success: true, uploadUrl, publicUrl });
  } catch (err) {
    return authErrorResponse(err);
  }
}
