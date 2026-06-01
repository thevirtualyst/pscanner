"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

interface Props {
  onDetect: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Dynamic import keeps ZXing out of the SSR bundle
    let stopped = false;

    import("@zxing/library").then(({ BrowserMultiFormatReader, NotFoundException }) => {
      if (stopped) return;
      const reader = new BrowserMultiFormatReader();

      reader
        .decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result, err) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              reader.reset();
              onDetect(result.getText());
              return;
            }
            // NotFoundException = no barcode in frame yet — normal, ignore
            if (err && !(err instanceof NotFoundException)) {
              console.warn("[scanner]", err);
            }
          }
        )
        .then(() => {
          if (!stopped) setStatus("scanning");
        })
        .catch((err: Error) => {
          const msg = err?.message ?? "";
          setErrorMsg(
            msg.toLowerCase().includes("permission")
              ? "Camera permission denied. Please allow camera access and try again."
              : `Could not start camera. ${msg}`
          );
          setStatus("error");
        });

      return () => {
        stopped = true;
        reader.reset();
      };
    });

    return () => {
      stopped = true;
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black">
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
        aria-label="Close scanner"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Title */}
      <p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-white/80 tracking-wide">
        Scan barcode
      </p>

      {/* Video feed */}
      <div className="relative w-full max-w-sm px-4">
        <video
          ref={videoRef}
          className="w-full rounded-2xl"
          autoPlay
          muted
          playsInline
        />

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-4 flex items-center justify-center rounded-2xl bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Scanning overlay — corner brackets + animated line */}
        {status === "scanning" && (
          <div className="pointer-events-none absolute inset-4 flex items-center justify-center rounded-2xl">
            {/* Corner brackets */}
            <div className="relative h-52 w-52">
              <span className="absolute left-0 top-0 block h-9 w-9 rounded-tl-xl border-l-4 border-t-4 border-blue-400" />
              <span className="absolute right-0 top-0 block h-9 w-9 rounded-tr-xl border-r-4 border-t-4 border-blue-400" />
              <span className="absolute bottom-0 left-0 block h-9 w-9 rounded-bl-xl border-b-4 border-l-4 border-blue-400" />
              <span className="absolute bottom-0 right-0 block h-9 w-9 rounded-br-xl border-b-4 border-r-4 border-blue-400" />
              {/* Scanning line */}
              <span className="animate-scanline absolute inset-x-2 top-1/2 block h-0.5 -translate-y-1/2 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.6)]" />
            </div>
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="mt-6 px-4 text-center">
        {status === "error" ? (
          <p className="text-sm text-red-400">{errorMsg}</p>
        ) : status === "scanning" ? (
          <p className="text-sm text-white/60">Point camera at a product barcode</p>
        ) : null}
      </div>
    </div>
  );
}
