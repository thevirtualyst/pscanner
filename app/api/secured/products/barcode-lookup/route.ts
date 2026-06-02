import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { NextRequest } from "next/server";

function cleanTag(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseNutrition(n: Record<string, unknown>) {
  if (!n) return null;
  const map: Record<string, string> = {
    calories:      "energy-kcal_100g",
    fat:           "fat_100g",
    saturated_fat: "saturated-fat_100g",
    trans_fat:     "trans-fat_100g",
    carbohydrates: "carbohydrates_100g",
    sugar:         "sugars_100g",
    fiber:         "fiber_100g",
    protein:       "proteins_100g",
    sodium:        "sodium_100g",
    salt:          "salt_100g",
    calcium:       "calcium_100g",
    iron:          "iron_100g",
  };
  const result: Record<string, number | null> = {};
  let hasAny = false;
  for (const [key, offKey] of Object.entries(map)) {
    const val = n[offKey];
    if (typeof val === "number") { result[key] = val; hasAny = true; }
    else result[key] = null;
  }
  return hasAny ? result : null;
}

// Returns up to two image URLs: front + nutrition label (both at 400px)
function extractImages(product: Record<string, any>): string[] {
  const urls: string[] = [];
  const base = "https://images.openfoodfacts.org/images/products";

  // Use selected_images which has the confirmed best images per angle
  const sel = product.selected_images ?? {};
  const barcodePath = (product.code ?? "").replace(/^(.{3})(.{3})(.{3})(.+)$/, "$1/$2/$3/$4");

  const angles = ["front", "nutrition", "ingredients", "packaging"] as const;
  for (const angle of angles) {
    const display = sel[angle]?.display?.en
      ?? sel[angle]?.display?.[""]
      ?? Object.values(sel[angle]?.display ?? {})[0];
    if (display) {
      // display value is like "front_en.3.400.jpg" — build full URL
      urls.push(`${base}/${barcodePath}/${display}`);
    } else {
      // Fallback: try image_front_url etc.
      const fallback =
        angle === "front"      ? (product.image_front_url ?? product.image_url) :
        angle === "nutrition"  ? product.image_nutrition_url :
        angle === "ingredients"? product.image_ingredients_url :
        null;
      if (fallback) urls.push(fallback);
    }
    if (urls.length >= 4) break; // cap at 4 images
  }

  return [...new Set(urls.filter(Boolean))];
}

const DATABASES = [
  "https://world.openfoodfacts.org",
  "https://world.openbeautyfacts.org",
  "https://world.openproductsfacts.org",
];

export async function GET(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);

    const barcode = new URL(req.url).searchParams.get("barcode")?.trim();
    if (!barcode) return Response.json({ found: false });

    for (const base of DATABASES) {
      let data: any;
      try {
        const res = await fetch(`${base}/api/v0/product/${barcode}.json`, {
          headers: { "User-Agent": "pscanner/1.0 (retail product scanner)" },
          next: { revalidate: 86400 },
        });
        if (!res.ok) continue;
        data = await res.json();
      } catch { continue; }

      if (data?.status !== 1) continue;

      const p = data.product;

      // Collect all name variants — deduplicated, non-empty
      const nameVariants = [
        p.product_name,
        p.product_name_en,
        p.abbreviated_product_name,
        p.generic_name,
        p.generic_name_en,
        // brand + product_name combo if they differ
        p.brands && p.product_name && !p.product_name.toLowerCase().includes(p.brands.split(",")[0]?.toLowerCase())
          ? `${p.brands.split(",")[0]?.trim()} ${p.product_name?.trim()}`
          : null,
      ]
        .map((v) => v?.trim())
        .filter((v): v is string => Boolean(v) && v.length > 0);

      const name_suggestions = [...new Set(nameVariants)];
      const name = name_suggestions[0] ?? null;
      if (!name) continue;

      const brand    = p.brands?.split(",")[0]?.trim() || null;
      const category = p.categories_tags?.find((t: string) => t.startsWith("en:"))
        ? cleanTag(p.categories_tags.find((t: string) => t.startsWith("en:")))
        : null;

      const images    = extractImages(p);
      const image_url = images[0] ?? null;

      const ingredients  = p.ingredients_text_en?.trim() || p.ingredients_text?.trim() || null;
      const allergens    = p.allergens_tags?.length
        ? p.allergens_tags.map((t: string) => cleanTag(t)).join(", ")
        : (p.allergens?.trim() || null);
      const nutrition    = parseNutrition(p.nutriments ?? {});
      const serving_size = p.serving_size?.trim() || null;

      const weight_volume    = p.quantity?.trim() || null;
      const country_of_origin = p.origins?.split(",")[0]?.trim() || null;
      const manufacturer     = p.manufacturing_places?.trim() || null;
      const certifications   = p.labels_tags?.length
        ? p.labels_tags.map((t: string) => cleanTag(t)).filter(Boolean).slice(0, 5).join(" · ")
        : null;

      return Response.json({
        found: true,
        source: base.includes("beauty") ? "openbeautyfacts"
               : base.includes("products") ? "openproductsfacts"
               : "openfoodfacts",
        name,
        name_suggestions,   // all name variants for suggestion box
        brand, category,
        image_url,
        images,       // all available images (front, nutrition label, etc.)
        ingredients, allergens,
        nutrition,    // now includes calcium, salt, iron
        serving_size,
        weight_volume, country_of_origin, manufacturer, certifications,
      });
    }

    return Response.json({ found: false });
  } catch (err) {
    console.error("[barcode-lookup]", err);
    return Response.json({ found: false });
  }
}
