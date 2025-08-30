"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// ชนิดข้อมูลแบบหลวม ๆ เพื่อกันฟิลด์ขาด
type User = { role?: "ADMIN" | "INTERNAL" | "EXTERNAL" } & Record<string, any>;
type Equipment = {
    status?:
    | "NORMAL"
    | "IN_USE"
    | "BROKEN"
    | "LOST"
    | "WAIT_DISPOSE"
    | "DISPOSED";
    price?: number | null | string;
} & Record<string, any>;
type Borrow = {
    status?: "PENDING" | "APPROVED" | "RETURNED" | "REJECTED" | "OVERDUE";
} & Record<string, any>;

const Dashboard = () => {
    // state หลัก
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [borrows, setBorrows] = useState<Borrow[]>([]);
    const [loading, setLoading] = useState(true);

    // โหลดข้อมูลจริงจาก API (กันล่มด้วย try/catch และ fallback)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const [u, c, e, b] = await Promise.all([
                    fetch("/api/users", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/categories", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/equipment", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                    fetch("/api/borrow", { cache: "no-store" })
                        .then((r) => r.json())
                        .catch(() => ({ data: [] })),
                ]);

                if (!alive) return;
                setUsers(Array.isArray(u?.data) ? u.data : []);
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

    // --------- คำนวณสถิติ (ไม่พึ่ง mock) ---------
    const totalInternalUsers = users.filter((u) => u.role === "INTERNAL").length;
    const totalExternalUsers = users.filter((u) => u.role === "EXTERNAL").length;

    const totalKaruphan = categories.length; // จำนวนหมวดหมู่
    const totalAllEquipment = equipments.length;

    // สถานะครุภัณฑ์
    const normalEquipment = equipments.filter((x) => x.status === "NORMAL").length;
    const borrowedEquipment = equipments.filter((x) => x.status === "IN_USE").length;
    const damagedEquipment = equipments.filter((x) => x.status === "BROKEN").length;

    // สถานะการยืม-คืน
    const pendingApproval = borrows.filter((x) => x.status === "PENDING").length;
    const approved = borrows.filter((x) => x.status === "APPROVED").length;
    const returned = borrows.filter((x) => x.status === "RETURNED").length;
    const notApproved = borrows.filter((x) => x.status === "REJECTED").length;

    // มูลค่าครุภัณฑ์รวม (กันค่าไม่ใช่ตัวเลข)
    const totalValue = equipments.reduce((sum, item) => {
        const n =
            typeof item.price === "number"
                ? item.price
                : Number(item.price ?? 0) || 0;
        return sum + n;
    }, 0);

    // กราฟจำลองแบบเดิม
    const monthlyData = [
        { month: "มี.ค.-2025", value: 10, label: "10 รายการ" },
        { month: "เม.ย.-2025", value: 5, label: "5 รายการ" },
        { month: "พ.ค.-2025", value: 7, label: "7 รายการ" },
        { month: "มิ.ย.-2025", value: 4, label: "4 รายการ" },
        { month: "ก.ค.-2025", value: 1, label: "1 รายการ" },
    ];

    // ---------------- UI เดิม ----------------
    return (
        <main className="dashboard wrapper py-8 bg-gray-50 min-h-screen">
            <section className="flex flex-col gap-8">
                {/* Cards สำคัญด้านบน */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <div className="rounded-xl shadow-lg p-6 text-left bg-gradient-to-br from-blue-400 to-blue-600 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                            <Image src="/data.png" alt="Equipment" width={48} height={48} />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">จำนวนครุภัณฑ์</h3>
                        <p className="text-3xl font-bold text-white">
                            {totalAllEquipment.toLocaleString("th-TH")}
                        </p>
                        {!loading && (
                            <p className="text-white/80 text-sm mt-1">
                                ปกติ {normalEquipment} • กำลังยืม {borrowedEquipment} • ชำรุด {damagedEquipment}
                            </p>
                        )}
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

                {/* รายงานจำนวนการยืมครุภัณฑ์ */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">รายงานจำนวนการยืมครุภัณฑ์</h2>
                            <p className="text-gray-600">จำนวนแยกตามเดือน</p>
                        </div>
                        <button className="text-gray-400 hover:text-gray-600" aria-label="menu">
                            <Image src="/HamBmenu.png" alt="Menu" width={24} height={24} />
                        </button>
                    </div>

                    {/* กราฟแท่งแบบง่าย */}
                    <div className="relative">
                        <div className="flex items-end justify-between h-64 mb-4">
                            {monthlyData.map((data, index) => {
                                const colors = [
                                    "bg-blue-400",
                                    "bg-purple-500",
                                    "bg-green-500",
                                    "bg-orange-500",
                                    "bg-blue-600",
                                ];
                                const height = (data.value / 10) * 100;

                                return (
                                    <div key={index} className="flex flex-col items-center w-1/5">
                                        <div className="relative mb-2">
                                            <span className="text-sm font-semibold text-blue-600 mb-1 block">
                                                {data.label}
                                            </span>
                                            <div
                                                className={`w-16 ${colors[index]} rounded-t-md transition-all duration-1000 ease-out`}
                                                style={{ height: `${height}%`, minHeight: "20px" }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600 font-medium">{data.month}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* แกน Y */}
                        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-sm text-gray-500">
                            <span>15</span>
                            <span>10</span>
                            <span>5</span>
                            <span>0</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Dashboard;
