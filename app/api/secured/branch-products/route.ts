import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// GET /api/secured/branch-products?branchId=xxx
// Returns all tenant products, each with its BranchProduct record (null if not configured).
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return Response.json({ success: false, error: "branchId is required" }, { status: 400 });
    }

    // Verify branch belongs to this tenant
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenant_id: user.tenant_id! },
    });
    if (!branch) return Response.json({ success: false, error: "Branch not found" }, { status: 404 });

    const [products, branchProducts] = await Promise.all([
      prisma.product.findMany({
        where: { tenant_id: user.tenant_id! },
        orderBy: { name: "asc" },
      }),
      prisma.branchProduct.findMany({
        where: { branch_id: branchId, tenant_id: user.tenant_id! },
      }),
    ]);

    const bpMap = new Map(branchProducts.map((bp) => [bp.product_id, bp]));

    const result = products.map((p) => ({
      product: p,
      branchProduct: bpMap.get(p.id) ?? null,
    }));

    return Response.json({ success: true, items: result });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/secured/branch-products  →  upsert pricing for a product in a branch
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const { branch_id, product_id, mrp, selling_price, offer_price, stock_qty } = body;

    if (!branch_id || !product_id) {
      return Response.json({ success: false, error: "branch_id and product_id are required" }, { status: 400 });
    }
    if (mrp === undefined || selling_price === undefined) {
      return Response.json({ success: false, error: "mrp and selling_price are required" }, { status: 400 });
    }

    // Verify both belong to this tenant
    const [branch, product] = await Promise.all([
      prisma.branch.findFirst({ where: { id: branch_id, tenant_id: user.tenant_id! } }),
      prisma.product.findFirst({ where: { id: product_id, tenant_id: user.tenant_id! } }),
    ]);
    if (!branch || !product) {
      return Response.json({ success: false, error: "Branch or product not found" }, { status: 404 });
    }

    const branchProduct = await prisma.branchProduct.upsert({
      where: { branch_id_product_id: { branch_id, product_id } },
      create: {
        tenant_id: user.tenant_id!,
        branch_id,
        product_id,
        mrp,
        selling_price,
        offer_price: offer_price ?? null,
        stock_qty: stock_qty ?? 0,
        is_active: true,
      },
      update: {
        mrp,
        selling_price,
        offer_price: offer_price ?? null,
        stock_qty: stock_qty ?? 0,
        is_active: true,
      },
    });

    return Response.json({ success: true, branchProduct }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
