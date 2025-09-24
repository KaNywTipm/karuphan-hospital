import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ปรับตรงนี้ถ้าต้องการ role เพิ่มฟิลด์เพิ่มเติมใน token/session
export const authOptions = {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // บังคับ normalize email + เทียบ bcrypt hash
            authorize: async (creds) => {
                const email = String(creds?.email ?? "").trim().toLowerCase();
                const password = String(creds?.password ?? "");

                if (!email || !password) return null;

                // หา user ตามอีเมล
                const user = await prisma.user.findUnique({
                    where: { email },
                    // ถ้าอยากดึง department/อื่น ๆ ไปแปะ session ก็ include ได้
                });
                if (!user || user.isActive === false) return null;

                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return null;

                // ส่งเฉพาะฟิลด์จำเป็นกลับไป (อย่าใส่ passwordHash)
                return {
                    id: String(user.id),
                    name: user.fullName,
                    email: user.email,
                    role: user.role, // ADMIN | INTERNAL | EXTERNAL
                };
            },
        }),
    ],
    session: { strategy: "jwt" as const },
    // ใส่ให้รองรับ Railway/Proxy
    trustHost: true,
    // ใช้ได้ทั้ง AUTH_SECRET หรือ NEXTAUTH_SECRET
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    // แนบ role ลงใน token + session
    callbacks: {
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) token.role = (user as any).role;
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session?.user) (session.user as any).role = token.role;
            return session;
        },
    },
    // (ทางเลือก) ปิดหน้า default ของ Auth.js แล้วใช้หน้าของคุณเอง
    // pages: { signIn: "/sign-in" },
};

// App Router handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
