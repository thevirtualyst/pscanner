import { getUserSession } from "@/app/utils/getUserSession";
import { NextRequest } from "next/server";

export async function requireAuthenticatedUser(req?: NextRequest) {
  const session = await getUserSession(req);
  const user = session?.user;

  if (process.env.LOG_AUTH_DEBUG === "true") {
    console.info("[authz] requireAuthenticatedUser", {
      hasSession: Boolean(session),
    });
  }

  if (!user) throw new Error("UNAUTHORIZED");
  if (!user.is_active) throw new Error("INACTIVE_USER");

  return user;
}

export async function requireRole(role: string, req?: NextRequest) {
  const user = await requireAuthenticatedUser(req);

  if (user.role !== "super_admin" && user.role !== role) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

export async function requireAdmin(req?: NextRequest) {
  return requireRole("admin", req);
}

export function authErrorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    INACTIVE_USER: 403,
    FORBIDDEN: 403,
  };
  return Response.json(
    { success: false, error: message },
    { status: statusMap[message] ?? 500 }
  );
}
