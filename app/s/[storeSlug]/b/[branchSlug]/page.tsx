import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ScannerPWA from "./scanner-pwa";

interface Props {
  params: Promise<{ storeSlug: string; branchSlug: string }>;
}

export default async function ScannerPage({ params }: Props) {
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
      tenant: { select: { name: true } },
    },
  });

  if (!branch) notFound();

  return (
    <ScannerPWA
      branchId={branch.id}
      branchName={branch.name}
      storeName={branch.tenant.name}
    />
  );
}
