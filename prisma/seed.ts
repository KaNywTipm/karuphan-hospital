import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
    const email = "admin@pcu.local";
    const exist = await prisma.user.findUnique({ where: { email } });
    if (!exist) {
        const passwordHash = await bcrypt.hash("Admin#1234", 12);
        await prisma.user.create({
            data: {
                fullName: "System Admin",
                email,
                passwordHash,
                role: "ADMIN",
                isActive: true,
            },
        });
        console.log("✅ Created admin:", email, "password: Admin#1234");
    } else {
        console.log("Admin existed");
    }
}
main().finally(() => prisma.$disconnect());
