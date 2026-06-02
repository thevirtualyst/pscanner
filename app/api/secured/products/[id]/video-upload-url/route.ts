import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { getPresignedUploadUrl } from "@/lib/s3";
import { NextRequest } from "next/server";

const ALLOWED_VIDEO_TYPES = [
  "video/mp4", "video/webm", "video/ogg",
  "video/quicktime", "video/x-msvideo",
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return Response.json({ success: false, error: "filename and contentType are required" }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return Response.json({ success: false, error: "Only MP4, WebM, OGG, MOV and AVI are allowed" }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "mp4";
    const key = `tenants/${user.tenant_id}/products/${id}/video.${ext}`;

    const uploadUrl = await getPresignedUploadUrl(key, contentType, 600); // 10 min for large files
    const publicUrl = `https://${process.env.SCN_AWS_S3_BUCKET}.s3.${process.env.SCN_AWS_REGION}.amazonaws.com/${key}`;

    return Response.json({ success: true, uploadUrl, publicUrl });
  } catch (err) {
    return authErrorResponse(err);
  }
}
