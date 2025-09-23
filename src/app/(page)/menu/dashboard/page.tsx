"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

type User = {
    role?: Role;
} & Record<string, any>;

type Equipment = {
    status?: "NORMAL" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    price?: number | null | string;
} & Record<string, any>;

type Borrow = {
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED";
    borrowDate?: string | null;
    createdAt?: string | null;
    returnDue?: string | null;
} & Record<string, any>;

// ---------- Helpers ----------
const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];


function monthKey(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // e.g. 2025-09
}

function monthLabel(d: Date) {
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    return `${thMonths[mIdx]}-${y}`;
}

function lastNMonths(n: number) {
    const base = new Date();
    base.setDate(1); // ชี้ที่วันแรกของเดือน ป้องกันข้ามเดือน
    const out: { key: string; label: string; date: Date }[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        out.push({ key: monthKey(d), label: monthLabel(d), date: d });
    }
    return out;
}

function safeParseDate(...candidates: (string | null | undefined)[]) {
    for (const iso of candidates) {
        if (!iso) continue;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
}

export default function Dashboard() {
    const router = useRouter();

    // state หลัก
    const [users, setUsers] = useState<User[]>([]);
    const [userStats, setUserStats] = useState<{ internal: number; external: number }>({ internal: 0, external: 0 });
    const [categories, setCategories] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [borrows, setBorrows] = useState<Borrow[]>([]);
    const [loading, setLoading] = useState(true);

    // โหลดข้อมูลจริงจาก API
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [uStats, c, e, b] = await Promise.all([
                    fetch("/api/users/stats", { cache: "no-store" })
                        .then(async (r) => (r.ok ? r.json() : { data: { internal: 0, external: 0 } }))
                        .catch(() => ({ data: { internal: 0, external: 0 } })),
                    fetch("/api/categories", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/equipment?page=1&pageSize=1000", {
                        method: "GET",
                        cache: "no-store",
                        headers: { Accept: "application/json" }
                    })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/borrow?page=1&pageSize=1000", {
                        method: "GET",
                        cache: "no-store",
                        headers: { Accept: "application/json" }
                    })
                        .then(async (r) => (r.ok ? r.json() : { data: [] }))
                        .catch(() => ({ data: [] })),
                ]);

                if (!alive) return;
                setUserStats(uStats?.data ?? { internal: 0, external: 0 });
                setCategories(Array.isArray(c?.data) ? c.data : []);
                setEquipments(Array.isArray(e?.data) ? e.data : []);
                setBorrows(Array.isArray(b?.data) ? b.data : []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // --------- คำนวณสถิติ ---------
    const totalInternalUsers = userStats.internal;
    const totalExternalUsers = userStats.external;

    // นับเฉพาะครุภัณฑ์ที่ยังไม่ถูกจำหน่าย (DISPOSED)
    const totalEquipments = equipments.filter((x) => x.status !== "DISPOSED").length;

    // สถานะครุภัณฑ์
    const normalEquipment = equipments.filter((x) => x.status === "NORMAL").length;
    const borrowedEquipment = equipments.filter((x) => x.status === "IN_USE").length;
    const damagedEquipment = equipments.filter((x) => x.status === "BROKEN").length;
    const lostEquipment = equipments.filter((x) => x.status === "LOST").length;
    const waitDisposeEquipment = equipments.filter((x) => x.status === "WAIT_DISPOSE").length;
    const disposedEquipment = equipments.filter((x) => x.status === "DISPOSED").length;


    // --------- สร้างกราฟรายเดือนจาก "borrows" จริง (6 เดือนล่าสุด) ---------
    const monthlyBars = useMemo(() => {
        const months = lastNMonths(6);
        const map: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));

        for (const r of borrows) {
            const d = safeParseDate(r.borrowDate, (r as any).createdAt, r.returnDue);
            if (!d) continue;
            const key = monthKey(d);
            if (key in map) map[key] += 1;
        }

        // หาค่าสูงสุดจริงเพื่อขยายกราฟ
        const values = Object.values(map);
        const maxValue = Math.max(1, ...values);
        // ขยายค่าสูงสุดให้กราฟดูสูงขึ้น (เช่น คูณ 1.5 หรือเพิ่ม offset)
        const scale = maxValue < 5 ? 2 : 1.5;
        const scaledMax = Math.ceil(maxValue * scale);

        return months.map((m) => {
            const value = map[m.key] || 0;
            return {
                month: m.label,
                value,
                label: `${value} รายการ`,
                scaledMax,
            };
        });
    }, [borrows]);

    // ฟังก์ชันการนำทาง
    const handleNavigateToEquipment = () => {
        router.push("/menu/list-karuphan");
    };

    const handleNavigateToUsers = (type: "internal" | "external") => {
        // นำทางไปหน้าจัดการบุคลากร
        router.push("/menu/manage-personnel");
    };

    const handleNavigateToBorrowHistory = () => {
        // สมมติว่ามีหน้าประวัติการยืม
        router.push("/menu/borrow-history");
    };

    const handleNavigateToReports = () => {
        router.push("/menu/report4-total_amount");
    };

    return (
        <main className="dashboard wrapper py-8 bg-gray-50 min-h-screen">
            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            ) : (
                <section className="flex flex-col gap-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        {/* การ์ดครุภัณฑ์ทั้งหมด */}
                        <div
                            onClick={handleNavigateToEquipment}
                            className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-4 right-4 opacity-20">
                                <Image src="/data.png" alt="Equipment" width={48} height={48} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">จำนวนครุภัณฑ์ทั้งหมด</h3>
                            <p className="text-3xl font-bold text-white">
                                {loading ? "..." : totalEquipments.toLocaleString("th-TH")}
                            </p>
                            <p className="text-sm text-blue-100 mt-2">คลิกเพื่อดูรายละเอียด</p>
                        </div>

                        {/* การ์ดพนักงานในแผนก */}
                        <div
                            onClick={() => handleNavigateToUsers("internal")}
                            className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-green-400 to-green-600 relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-4 right-4 opacity-20">
                                <Image src="/person.png" alt="Internal Users" width={48} height={48} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานในแผนก</h3>
                            <p className="text-3xl font-bold text-white">
                                {loading ? "..." : totalInternalUsers.toLocaleString("th-TH")}
                            </p>
                            <p className="text-sm text-green-100 mt-2">คลิกเพื่อจัดการ</p>
                        </div>

                        {/* การ์ดพนักงานนอกแผนก */}
                        <div
                            onClick={() => handleNavigateToUsers("external")}
                            className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-yellow-500 to-yellow-600 relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-4 right-4 opacity-20">
                                <Image src="/person.png" alt="External Users" width={48} height={48} />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานนอกแผนก</h3>
                            <p className="text-3xl font-bold text-white">
                                {loading ? "..." : totalExternalUsers.toLocaleString("th-TH")}
                            </p>
                            <p className="text-sm text-yellow-100 mt-2">คลิกเพื่อจัดการ</p>
                        </div>
                    </div>

                    {/* สถิติรวม */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* การ์ดรออนุมัติ */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">รออนุมัติ</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        {borrows.filter(b => b.status === "PENDING").length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">รายการที่รอการอนุมัติ</p>
                                </div>
                            </div>
                        </div>

                        {/* การ์ดอนุมัติแล้ว/รอคืน */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">อนุมัติแล้ว/รอคืน</p>
                                    <p className="text-3xl font-bold text-yellow-600">
                                        {borrows.filter(b => b.status === "APPROVED").length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">รายการที่อนุมัติและรอคืน</p>
                                </div>
                            </div>
                        </div>

                        {/* การ์ดคืนแล้ว */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">คืนแล้ว</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {borrows.filter(b => b.status === "RETURNED").length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">รายการที่คืนเรียบร้อยแล้ว</p>
                                </div>
                            </div>
                        </div>

                        {/* การ์ดไม่อนุมัติ/ยกเลิก */}
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">ไม่อนุมัติ/ยกเลิก</p>
                                    <p className="text-3xl font-bold text-red-600">
                                        {borrows.filter(b => b.status === "REJECTED").length}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">รายการที่ไม่อนุมัติหรือยกเลิก</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">รายงานจำนวนการยืมครุภัณฑ์</h2>
                                <p className="text-gray-600">จำนวนคำขอยืมต่อเดือน (6 เดือนล่าสุด)</p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex items-end justify-between h-80 mb-4">
                                {monthlyBars.map((data, index) => {
                                    const colors = [
                                        "bg-blue-400",
                                        "bg-purple-500",
                                        "bg-green-500",
                                        "bg-orange-500",
                                        "bg-blue-600",
                                        "bg-emerald-500",
                                    ];
                                    // ใช้ scaledMax เพื่อขยายกราฟ
                                    const minBarHeight = 20;
                                    const height = data.value === 0
                                        ? minBarHeight
                                        : minBarHeight + ((data.value / (data.scaledMax || 1)) * (100 - minBarHeight));

                                    return (
                                        <div key={index} className="flex flex-col items-center w-1/6">
                                            <div className="relative mb-2">
                                                <span className="text-sm font-semibold text-blue-600 mb-1 block">
                                                    {data.label}
                                                </span>
                                                <div
                                                    className={`w-16 ${colors[index % colors.length]} rounded-t-md transition-all duration-700 ease-out`}
                                                    style={{ height: `${height}%`, minHeight: "16px" }}
                                                    title={data.label}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600 font-medium">{data.month}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* แกน Y คร่าว ๆ */}
                            <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-sm text-gray-500">
                                <span>สูงสุด</span>
                                <span>ต่ำสุด</span>
                            </div>
                        </div>
                    </div>

                    {/* การ์ดสรุปสถานะครุภัณฑ์ แยกออกมาด้านล่าง */}
                    {!loading && (
                        <div className="mt-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-800">สถานะครุภัณฑ์</h3>
                                    <button
                                        onClick={handleNavigateToReports}
                                        className="text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors duration-200"
                                    >
                                        ดูรายงานสรุป →
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-4 justify-center">
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=NORMAL")}
                                        className="flex flex-col items-center bg-blue-200 text-blue-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-blue-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{normalEquipment}</span>
                                        <span className="text-sm">ปกติ</span>
                                    </div>
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=IN_USE")}
                                        className="flex flex-col items-center bg-orange-200 text-orange-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-orange-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{borrowedEquipment}</span>
                                        <span className="text-sm">กำลังยืม</span>
                                    </div>
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=BROKEN")}
                                        className="flex flex-col items-center bg-red-200 text-red-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-red-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{damagedEquipment}</span>
                                        <span className="text-sm">ชำรุด</span>
                                    </div>
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=LOST")}
                                        className="flex flex-col items-center bg-gray-200 text-gray-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-gray-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{lostEquipment}</span>
                                        <span className="text-sm">สูญหาย</span>
                                    </div>
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=WAIT_DISPOSE")}
                                        className="flex flex-col items-center bg-yellow-200 text-yellow-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-yellow-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{waitDisposeEquipment}</span>
                                        <span className="text-sm">รอจำหน่าย</span>
                                    </div>
                                    <div
                                        onClick={() => router.push("/menu/list-karuphan?status=DISPOSED")}
                                        className="flex flex-col items-center bg-purple-200 text-purple-800 rounded-lg px-4 py-3 min-w-[150px] cursor-pointer hover:bg-purple-300 transition-colors duration-200 transform hover:scale-105"
                                    >
                                        <span className="font-semibold text-lg">{disposedEquipment}</span>
                                        <span className="text-sm">จำหน่ายแล้ว</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
