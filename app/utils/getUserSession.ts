import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { headers } from "next/headers";

type HeaderSource =
  | { headers: Headers }
  | NextRequest
  | { headers: Record<string, string | string[] | undefined> };

async function getAuthHeader(source?: HeaderSource): Promise<string | undefined> {
  try {
    let headerSource: any = source?.headers;
    if (!headerSource) {
      const maybeHeaders = headers();
      headerSource = maybeHeaders instanceof Promise ? await maybeHeaders : maybeHeaders;
    }

    if (headerSource && typeof headerSource.get === "function") {
      return (
        headerSource.get("authorization") ??
        headerSource.get("Authorization") ??
        undefined
      );
    }

    if (headerSource && typeof headerSource === "object") {
      const record = headerSource as Record<string, string | string[] | undefined>;
      const value = record.authorization ?? record.Authorization;
      return Array.isArray(value) ? value[0] : value;
    }
  } catch (err) {
    console.warn("[authz] failed to read authorization header", err);
  }

  return undefined;
}

export async function getUserSession(req?: HeaderSource) {
  // 1. Try cookie-based NextAuth session
  let session = await getServerSession(authOptions);

  // 2. Fallback: Bearer token (for POS API clients)
  if (!session) {
    const authHeader = await getAuthHeader(req);
    if (authHeader?.startsWith("Bearer ")) {
      const tokenString = authHeader.slice(7).trim();
      try {
        const payload = jwt.verify(tokenString, process.env.NEXTAUTH_SECRET || "");
        session = { user: payload } as any;
      } catch (err) {
        console.error("Invalid JWT:", err);
      }
    }
  }

  return session;
}
