// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!SECRET) {
    throw new Error("Missing AUTH_SECRET/NEXTAUTH_SECRET");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            name: "Email & Password",
            credentials: {
                email: { label: "email", type: "text" },
                password: { label: "password", type: "password" },
            },
            async authorize(creds) {
                if (!creds?.email || !creds?.password) return null;

                // dynamic import กัน edge/middleware พัง
                const { prisma } = await import("@/lib/prisma");
                const { compare } = await import("bcryptjs");

                const user = await prisma.user.findUnique({ where: { email: String(creds.email) } });
                if (!user || !user.isActive) return null;

                const ok = await compare(String(creds.password), String(user.passwordHash));
                if (!ok) return null;

                return { id: String(user.id), name: user.fullName, email: user.email, role: user.role };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.role = (user as any).role;
            return token;
        },
        async session({ session, token }) {
            (session as any).role = token.role;
            return session;
        },
    },
    // ชั่วคราวเอา pages ออกเพื่อตัดสาเหตุที่เป็นไปได้
    // pages: { signIn: "/sign-in" },
    secret: SECRET,
});
