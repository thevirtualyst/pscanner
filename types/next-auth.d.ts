import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      tenant_id?: string | null;
      is_active?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    tenant_id?: string | null;
    is_active?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenant_id?: string | null;
    is_active?: boolean;
  }
}
