import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
    // --- Admin ---
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

    // --- Internal/External Users ---
    const demoUsers = [
        {
            fullName: "Demo Internal 1",
            email: "internal1@pcu.local",
            password: "Internal#1234",
            role: "INTERNAL",
        },
        {
            fullName: "Demo Internal 2",
            email: "internal2@pcu.local",
            password: "Internal#1234",
            role: "INTERNAL",
        },
        {
            fullName: "Demo External 1",
            email: "external1@pcu.local",
            password: "External#1234",
            role: "EXTERNAL",
        },
        {
            fullName: "Demo External 2",
            email: "external2@pcu.local",
            password: "External#1234",
            role: "EXTERNAL",
        },
    ];
    for (const u of demoUsers) {
        const exist = await prisma.user.findUnique({ where: { email: u.email } });
        if (!exist) {
            const passwordHash = await bcrypt.hash(u.password, 12);
            await prisma.user.create({
                data: {
                    fullName: u.fullName,
                    email: u.email,
                    passwordHash,
                    role: u.role as any,
                    isActive: true,
                },
            });
            console.log(`✅ Created user: ${u.email} password: ${u.password}`);
        }
    }

    // --- Categories ---
    const categories = [
        {
            name: "ครุภัณฑ์งานแพทย์และวิทยาศาสตร์",
            description: "Medical & Science Equipment",
        },
        { name: "ครุภัณฑ์สำนักงาน", description: "Office Equipment" },
        { name: "ครุภัณฑ์คอมพิวเตอร์", description: "Computer Equipment" },
        {
            name: "ครุภัณฑ์ไฟฟ้าและวิทยุ",
            description: "Electrical & Radio Equipment",
        },
        {
            name: "ครุภัณฑ์โฆษณาและเผยแพร่",
            description: "Advertise & Publish Equipment",
        },
        { name: "ครุภัณฑ์งานบ้านงานครัว", description: "Home & Kitchen Equipment" },
        {
            name: "ครุภัณฑ์ยานพาหนะและขนส่ง",
            description: "Vehicle & Transport Equipment",
        },
    ];
    const categoryRecords = [];
    for (const cat of categories) {
        let record = await prisma.category.findUnique({
            where: { name: cat.name },
        });
        if (!record) {
            record = await prisma.category.create({ data: cat });
            console.log(`✅ Created category: ${cat.name}`);
        }
        categoryRecords.push(record);
    }

    // --- Equipment Examples ---
    const now = new Date();
    for (let i = 0; i < categoryRecords.length; i++) {
        const cat = categoryRecords[i];
        for (let j = 1; j <= 5; j++) {
            const code = `CAT${cat.id.toString().padStart(2, "0")}-EQ${j
                .toString()
                .padStart(3, "0")}`;
            const name = `ตัวอย่างครุภัณฑ์ ${cat.name} ${j}`;
            const exist = await prisma.equipment.findUnique({ where: { code } });
            if (!exist) {
                await prisma.equipment.create({
                    data: {
                        code,
                        name,
                        categoryId: cat.id,
                        receivedDate: now,
                        price: 1000 * (i + 1) + j * 100,
                        status: "NORMAL",
                    },
                });
                console.log(`✅ Created equipment: ${code} (${name})`);
            }
        }
    }
}

main().finally(() => prisma.$disconnect());
