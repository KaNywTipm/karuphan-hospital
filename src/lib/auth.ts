import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authConfig: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    trustHost: true,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: { email: {}, password: {} },
            async authorize(creds) {
                if (!creds?.email || !creds?.password) return null;
                const user = await prisma.user.findUnique({
                    where: { email: String(creds.email).toLowerCase() },
                    include: { department: true },
                });
                if (!user || !user.isActive) return null;

                const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
                if (!ok) return null;

                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.fullName,
                    role: String(user.role).toUpperCase(),
                    department: user.department?.name ?? null,
                } as any;

            },
        }),
    ],
    pages: { signIn: "/sign-in" },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role ?? token.role;
                token.department = (user as any).department ?? token.department ?? null;
            }
            return token;
        }
        ,
        async session({ session, token }) {
            (session.user as any).id = token.sub;
            (session.user as any).role = token.role;
            (session.user as any).department = token.department ?? null;
            return session;
        },
    },
};
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
