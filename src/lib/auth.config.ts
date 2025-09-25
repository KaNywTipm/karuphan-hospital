import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authConfig: NextAuthConfig = {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (creds) => {
                const email = String(creds?.email ?? "")
                    .trim()
                    .toLowerCase();
                const password = String(creds?.password ?? "");
                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || user.isActive === false) return null;

                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return null;

                return {
                    id: String(user.id),
                    name: user.fullName,
                    email: user.email,
                    role: user.role, // ADMIN | INTERNAL | EXTERNAL
                };
            },
        }),
    ],
    session: { strategy: "jwt" },
    trustHost: true,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.role = (user as any).role;
            return token;
        },
        async session({ session, token }) {
            if (session?.user) (session.user as any).role = token.role;
            return session;
        },
    },
};
