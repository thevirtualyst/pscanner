import { requireAuthenticatedUser, authErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import * as xlsx from "xlsx";

interface ImportRow {
  barcode?: unknown;
  Barcode?: unknown;
  name?: unknown;
  Name?: unknown;
  brand?: unknown;
  Brand?: unknown;
  category?: unknown;
  Category?: unknown;
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xls|xlsx)$/i)) {
      return Response.json({ success: false, error: "File must be CSV or Excel (.xlsx / .xls)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: ImportRow[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return Response.json({ success: false, error: "File is empty or has no data rows" }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, array is 0-indexed

      const barcode = str(row.barcode ?? row.Barcode);
      const name    = str(row.name    ?? row.Name);
      const brand   = str(row.brand   ?? row.Brand)    || null;
      const category = str(row.category ?? row.Category) || null;

      if (!barcode) { errors.push({ row: rowNum, reason: "Missing barcode" }); continue; }
      if (!name)    { errors.push({ row: rowNum, reason: "Missing name" });    continue; }

      try {
        const existing = await prisma.product.findUnique({
          where: { tenant_id_barcode: { tenant_id: user.tenant_id!, barcode } },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: { name, brand, category },
          });
          updated++;
        } else {
          await prisma.product.create({
            data: { tenant_id: user.tenant_id!, barcode, name, brand, category },
          });
          created++;
        }
      } catch {
        errors.push({ row: rowNum, reason: "Database error while processing row" });
      }
    }

    return Response.json({
      success: true,
      total: rows.length,
      created,
      updated,
      errors,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
