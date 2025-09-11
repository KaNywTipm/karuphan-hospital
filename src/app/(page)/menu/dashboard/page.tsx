"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";

type User = {
    role?: Role;
} & Record<string, any>;

type Equipment = {
    status?: "NORMAL" | "IN_USE" | "BROKEN" | "LOST" | "WAIT_DISPOSE" | "DISPOSED";
    price?: number | null | string;
} & Record<string, any>;

type Borrow = {
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
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
                    fetch("/api/equipment", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/borrow", { cache: "no-store" })
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

    return (
        <main className="dashboard wrapper py-8 bg-gray-50 min-h-screen">
            <section className="flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/data.png" alt="Equipment" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนครุภัณฑ์ทั้งหมด</h3>
                        <p className="text-3xl font-bold text-white">
                            {totalEquipments.toLocaleString("th-TH")}
                        </p>
                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-green-400 to-green-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/person.png" alt="Internal Users" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานในแผนก</h3>
                        <p className="text-3xl font-bold text-white">
                            {totalInternalUsers.toLocaleString("th-TH")}
                        </p>
                    </div>

                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-yellow-500 to-yellow-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/person.png" alt="External Users" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนพนักงานนอกแผนก</h3>
                        <p className="text-3xl font-bold text-white">
                            {totalExternalUsers.toLocaleString("th-TH")}
                        </p>
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
                    <div className="mt-6 flex flex-wrap gap-4 justify-center">
                        <div className="flex flex-col items-center bg-blue-100 text-blue-800 rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{normalEquipment}</span>
                            <span className="text-sm">ปกติ</span>
                        </div>
                        <div className="flex flex-col items-center bg-yellow-100 text-yellow-800 rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{borrowedEquipment}</span>
                            <span className="text-sm">กำลังยืม</span>
                        </div>
                        <div className="flex flex-col items-center bg-red-100 text-red-800 rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{damagedEquipment}</span>
                            <span className="text-sm">ชำรุด</span>
                        </div>
                        <div className="flex flex-col items-center bg-pink-100 text-pink-800 rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{lostEquipment}</span>
                            <span className="text-sm">สูญหาย</span>
                        </div>
                        <div className="flex flex-col items-center bg-gray-200 text-gray-800 rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{waitDisposeEquipment}</span>
                            <span className="text-sm">รอจำหน่าย</span>
                        </div>
                        <div className="flex flex-col items-center bg-gray-400 text-white rounded-lg px-4 py-2 min-w-[150px]">
                            <span className="font-semibold text-lg">{disposedEquipment}</span>
                            <span className="text-sm">จำหน่ายแล้ว</span>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
