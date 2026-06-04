"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";

type Product = { id: string; barcode: string; name: string; brand: string | null };

const SIZES = [
  { label: "Small",  width: 1.2, height: 40, fontSize: 10 },
  { label: "Medium", width: 2,   height: 60, fontSize: 12 },
  { label: "Large",  width: 2.8, height: 80, fontSize: 14 },
];

function BarcodeItem({ product, size }: {
  product: Product;
  size: typeof SIZES[number];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const bc = product.barcode.replace(/\D/g, ""); // digits only
    const format =
      bc.length === 13 ? "EAN13" :
      bc.length === 8  ? "EAN8"  :
      bc.length === 12 ? "UPC"   : "CODE128";

    const value = format === "CODE128" ? product.barcode : bc;

    try {
      JsBarcode(svgRef.current, value, {
        format,
        width:        size.width,
        height:       size.height,
        fontSize:     size.fontSize,
        margin:       8,
        displayValue: true,
        lineColor:    "#000",
        background:   "#fff",
      });
    } catch (e) {
      console.warn("JsBarcode error for", product.barcode, e);
    }
  }, [product.barcode, size]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white py-10 px-8 text-center shadow-sm print:shadow-none print:border-slate-300 max-w-xl mx-auto w-full">
      <svg ref={svgRef} />
      <div>
        <p className="text-base font-semibold text-slate-800">{product.name}</p>
        {product.brand && <p className="text-sm text-slate-400">{product.brand}</p>}
        <p className="mt-1 text-xs font-mono text-slate-400">{product.barcode}</p>
      </div>
    </div>
  );
}

export default function BarcodeTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sizeIdx, setSizeIdx]   = useState(1); // default Medium

  const fetchProducts = useCallback(async () => {
    const res  = await fetch("/api/secured/products?limit=50", { credentials: "include" });
    const data = await res.json();
    if (data.success) setProducts(data.products.filter((p: Product) => p.barcode));
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const size = SIZES[sizeIdx];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Barcode Test Sheet</h1>
          <p className="mt-1 text-sm text-slate-500">
            Display on screen or print — scan with iPhone Safari to test accuracy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Size selector */}
          <div className="flex rounded-xl border border-slate-200 p-1 gap-1">
            {SIZES.map((s, i) => (
              <button key={s.label} type="button" onClick={() => setSizeIdx(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  i === sizeIdx
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">No products with barcodes found.</div>
      ) : (
        <div className="flex flex-col gap-16 print:gap-12">
          {products.map((p) => (
            <BarcodeItem key={p.id} product={p} size={size} />
          ))}
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:grid-cols-4, .print\\:grid-cols-4 * { visibility: visible; }
          .print\\:grid-cols-4 { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
