import {
    PrismaClient,
    Role,
    BorrowerType,
    EquipmentStatus,
    BorrowStatus,
    LocationType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding start...");

    // Users
    const admin = await prisma.user.upsert({
        where: { username: "admin" },
        update: {},
        create: {
            username: "admin",
            password: "admin123", // production ควร hash
            fullName: "ผู้ดูแลระบบ",
            phone: "0800000000",
            role: Role.ADMIN,
            department: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
        },
    });

    const internal = await prisma.user.upsert({
        where: { username: "internal1" },
        update: {},
        create: {
            username: "internal1",
            password: "123456",
            fullName: "เจ้าหน้าที่ภายใน",
            phone: "0811111111",
            role: Role.INTERNAL,
            department: "PCU",
        },
    });

    const external = await prisma.user.upsert({
        where: { username: "external1" },
        update: {},
        create: {
            username: "external1",
            password: "123456",
            fullName: "เจ้าหน้าที่ภายนอก",
            phone: "0822222222",
            role: Role.EXTERNAL,
            department: "หน่วยงานภายนอก",
        },
    });

    // Categories
    const catComputer = await prisma.category.upsert({
        where: { name: "คอมพิวเตอร์" },
        update: {},
        create: {
            name: "คอมพิวเตอร์",
            description: "อุปกรณ์คอมพิวเตอร์และอุปกรณ์ต่อพ่วง",
        },
    });

    const catElec = await prisma.category.upsert({
        where: { name: "เครื่องใช้ไฟฟ้า" },
        update: {},
        create: {
            name: "เครื่องใช้ไฟฟ้า",
            description: "เครื่องใช้ไฟฟ้าในสำนักงาน",
        },
    });

    // Equipments
    const eq1 = await prisma.equipment.upsert({
        where: { code: "PCU001" },
        update: {},
        create: {
            code: "PCU001",
            name: "เครื่องคอมพิวเตอร์ตั้งโต๊ะ",
            department: "PCU",
            location: LocationType.INTERNAL,
            receivedDate: new Date("2024-01-01"),
            price: 20000,
            status: EquipmentStatus.NORMAL,
            categoryId: catComputer.id,
        },
    });

    const eq2 = await prisma.equipment.upsert({
        where: { code: "EQ002" },
        update: {},
        create: {
            code: "EQ002",
            name: "โปรเจกเตอร์",
            department: "PCU",
            location: LocationType.INTERNAL,
            receivedDate: new Date("2023-12-15"),
            price: 15000,
            status: EquipmentStatus.NORMAL,
            categoryId: catElec.id,
        },
    });

    // Borrow Request (example internal borrow)
    await prisma.borrowRequest.create({
        data: {
            borrowerType: BorrowerType.INTERNAL,
            requesterId: internal.id,
            status: BorrowStatus.APPROVED,
            borrowDate: new Date("2025-01-10"),
            returnDue: new Date("2025-02-10"),
            reason: "ใช้ทำงานวิจัย",
            items: {
                create: [{ equipmentId: eq1.number, quantity: 1 }],
            },
            approvedById: admin.id,
            approvedAt: new Date("2025-01-10"),
        },
    });

    console.log("✅ Seeding completed");
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
