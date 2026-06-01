import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const { email, password } = credentials || {};

        if (!email || !password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) throw new Error("User not found");

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) throw new Error("Invalid credentials");

        if (!user.is_active) throw new Error("INACTIVE_ACCOUNT");

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          is_active: user.is_active,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenant_id = user.tenant_id ?? null;
        token.is_active = user.is_active;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string | undefined;
        session.user.tenant_id = token.tenant_id as string | null;
        session.user.is_active = token.is_active as boolean | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
