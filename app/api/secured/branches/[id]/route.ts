import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const branch = await prisma.branch.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!branch) return Response.json({ success: false, error: "Not found" }, { status: 404 });
    return Response.json({ success: true, branch });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const {
      name, address, is_active,
      kiosk_logo_url, kiosk_video_url, kiosk_headline,
      kiosk_subtitle, kiosk_cta_text, kiosk_accent_color,
    } = body;

    const existing = await prisma.branch.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(name       !== undefined && { name: name.trim() }),
        ...(address    !== undefined && { address: address?.trim() || null }),
        ...(is_active  !== undefined && { is_active }),
        ...(kiosk_logo_url     !== undefined && { kiosk_logo_url:     kiosk_logo_url?.trim()     || null }),
        ...(kiosk_video_url    !== undefined && { kiosk_video_url:    kiosk_video_url?.trim()    || null }),
        ...(kiosk_headline     !== undefined && { kiosk_headline:     kiosk_headline?.trim()     || null }),
        ...(kiosk_subtitle     !== undefined && { kiosk_subtitle:     kiosk_subtitle?.trim()     || null }),
        ...(kiosk_cta_text     !== undefined && { kiosk_cta_text:     kiosk_cta_text?.trim()     || null }),
        ...(kiosk_accent_color !== undefined && { kiosk_accent_color: kiosk_accent_color?.trim() || null }),
      },
    });

    return Response.json({ success: true, branch });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuthenticatedUser(req);

    const existing = await prisma.branch.findFirst({
      where: { id, tenant_id: user.tenant_id! },
    });
    if (!existing) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    await prisma.branchProduct.deleteMany({ where: { branch_id: id } });
    await prisma.branch.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
