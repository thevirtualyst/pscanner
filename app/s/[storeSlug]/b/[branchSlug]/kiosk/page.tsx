import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import KioskPWA from "./kiosk-pwa";

interface Props {
  params: Promise<{ storeSlug: string; branchSlug: string }>;
}

export default async function KioskPage({ params }: Props) {
  const { storeSlug, branchSlug } = await params;

  const branch = await prisma.branch.findFirst({
    where: {
      slug: branchSlug,
      is_active: true,
      tenant: { slug: storeSlug, status: "active" },
    },
    select: {
      id: true,
      name: true,
      kiosk_logo_url: true,
      kiosk_video_url: true,
      kiosk_headline: true,
      kiosk_subtitle: true,
      kiosk_cta_text: true,
      kiosk_accent_color: true,
      tenant: { select: { name: true } },
    },
  });

  if (!branch) notFound();

  return (
    <KioskPWA
      branchId={branch.id}
      branchName={branch.name}
      storeName={branch.tenant.name}
      kioskConfig={{
        logoUrl:     branch.kiosk_logo_url,
        videoUrl:    branch.kiosk_video_url,
        headline:    branch.kiosk_headline,
        subtitle:    branch.kiosk_subtitle,
        ctaText:     branch.kiosk_cta_text,
        accentColor: branch.kiosk_accent_color,
      }}
    />
  );
}
