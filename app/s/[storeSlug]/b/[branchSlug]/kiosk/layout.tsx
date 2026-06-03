import type { Metadata } from "next";

interface Props {
  children: React.ReactNode;
  params: Promise<{ storeSlug: string; branchSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storeSlug, branchSlug } = await params;
  return {
    manifest: `/api/kiosk-manifest?store=${storeSlug}&branch=${branchSlug}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Product Scanner",
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
