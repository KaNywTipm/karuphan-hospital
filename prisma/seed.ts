import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
    const email = "admin@pcu.test";
    const exist = await prisma.user.findUnique({ where: { email } });
    if (!exist) {
        const passwordHash = await bcrypt.hash("Admin#1234", 12);
        await prisma.user.create({
            data: {
                fullName: "ผู้ดูแลระบบครุภัณฑ์",
                email,
                passwordHash,
                role: "ADMIN",
                isActive: true,
            },
        });
        console.log("✅ Admin created:", email, "password: Admin#1234");
    }
}

main().finally(() => prisma.$disconnect());
