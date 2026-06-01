import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { NextRequest } from "next/server";

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories_tags?: string[];
  image_front_url?: string;
  image_url?: string;
}

function cleanCategory(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, "")          // remove "en:" prefix
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);

    const barcode = new URL(req.url).searchParams.get("barcode")?.trim();
    if (!barcode) {
      return Response.json({ found: false });
    }

    // ── Open Food Facts ────────────────────────────────────────────────────────
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { headers: { "User-Agent": "pscanner/1.0 (retail product scanner)" }, next: { revalidate: 86400 } }
    );

    if (offRes.ok) {
      const data = await offRes.json();

      if (data.status === 1) {
        const p: OpenFoodFactsProduct = data.product;

        const name = p.product_name?.trim() || null;
        const brand = p.brands?.split(",")[0]?.trim() || null;
        const category =
          p.categories_tags?.find((t) => t.startsWith("en:"))
            ? cleanCategory(p.categories_tags.find((t) => t.startsWith("en:"))!)
            : null;
        const image_url = p.image_front_url || p.image_url || null;

        if (name) {
          return Response.json({ found: true, source: "openfoodfacts", name, brand, category, image_url });
        }
      }
    }

    // ── Nothing found ─────────────────────────────────────────────────────────
    return Response.json({ found: false });
  } catch (err) {
    // Lookup failure is non-critical — return not-found rather than 500
    console.error("[barcode-lookup]", err);
    return Response.json({ found: false });
  }
}
