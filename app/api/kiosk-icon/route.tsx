import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const size = parseInt(new URL(req.url).searchParams.get("size") ?? "192");
  const safeSize = [192, 512].includes(size) ? size : 192;
  const s = safeSize;
  const pad = Math.round(s * 0.22);
  const arm = Math.round(s * 0.28 * 0.28 + s * 0.22 * 0.28);
  const lw  = Math.round(s * 0.055);

  return new ImageResponse(
    (
      <div
        style={{
          width: s, height: s,
          borderRadius: Math.round(s * 0.16),
          background: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={s * 0.56} height={s * 0.56}
          viewBox="0 0 100 100"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
        >
          {/* Frame corners */}
          <path d="M10 30 L10 10 L30 10" />
          <path d="M70 10 L90 10 L90 30" />
          <path d="M90 70 L90 90 L70 90" />
          <path d="M30 90 L10 90 L10 70" />
          {/* Scan line */}
          <line x1="10" y1="50" x2="90" y2="50" strokeWidth="5" />
        </svg>
      </div>
    ),
    { width: s, height: s,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
  );
}
