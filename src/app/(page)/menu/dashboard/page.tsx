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
    const y = d.getFullYear() + 543; // แปลงเป็นปี พ.ศ.
    const mIdx = d.getMonth();
    return `${thMonths[mIdx]} ${y}`;
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
                const [uStats, c, e, b, u] = await Promise.all([
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
                    fetch("/api/users?page=1&pageSize=1000", {
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
                setUsers(Array.isArray(u?.data) ? u.data : []);
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

        // สร้าง map สำหรับแต่ละประเภท
        const approvedInternalMap: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));
        const approvedExternalMap: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));
        const rejectedMap: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));

        // สร้าง map ของ users เพื่อการค้นหาที่เร็วขึ้น
        const userMap = new Map(users.map(user => [user.id, user]));

        for (const r of borrows) {
            const d = safeParseDate(r.borrowDate, (r as any).createdAt, r.returnDue);
            if (!d) continue;
            const key = monthKey(d);

            // รวมทั้ง APPROVED และ RETURNED เป็นรายการที่อนุมัติ
            if (r.status === "APPROVED" || r.status === "RETURNED") {
                // หา user จาก userId ในข้อมูล borrow
                const userId = (r as any).userId || (r as any).requesterId;
                const user = userMap.get(userId);

                // ใช้ borrowerType เป็นหลัก แล้วค่อย fallback ไป role
                const borrowerType = (r as any).borrowerType;
                const userRole = user?.role || (r as any).user?.role || (r as any).requester?.role;

                // ตรวจสอบทั้ง borrowerType และ role
                if (borrowerType === "INTERNAL" || userRole === "INTERNAL") {
                    if (key in approvedInternalMap) approvedInternalMap[key] += 1;
                } else if (borrowerType === "EXTERNAL" || userRole === "EXTERNAL") {
                    if (key in approvedExternalMap) approvedExternalMap[key] += 1;
                } else {
                    // ถ้าไม่สามารถระบุได้ ให้เป็น EXTERNAL
                    if (key in approvedExternalMap) approvedExternalMap[key] += 1;
                }
            } else if (r.status === "REJECTED") {
                if (key in rejectedMap) rejectedMap[key] += 1;
            }
        }

        // หาค่าสูงสุดรวมเพื่อปรับ scale
        const allValues = months.flatMap(m => [
            approvedInternalMap[m.key] || 0,
            approvedExternalMap[m.key] || 0,
            rejectedMap[m.key] || 0
        ]);
        const maxValue = Math.max(1, ...allValues);
        const scale = maxValue < 5 ? 2 : 1.5;
        const scaledMax = Math.ceil(maxValue * scale);

        // กำหนดความสูงสูงสุดของแท่ง (px)
        const BAR_MAX_PX = 260;      // สูงสุดแท่ง
        const BAR_MIN_PX = 16;       // ขั้นต่ำให้พอมองเห็น

        return months.map((m) => {
            const approvedInternal = approvedInternalMap[m.key] || 0;
            const approvedExternal = approvedExternalMap[m.key] || 0;
            const rejected = rejectedMap[m.key] || 0;
            const totalApproved = approvedInternal + approvedExternal;
            const totalAll = totalApproved + rejected;

            const approvedBarPx = totalApproved === 0
                ? BAR_MIN_PX
                : Math.round(BAR_MIN_PX + (totalApproved / (scaledMax || 1)) * (BAR_MAX_PX - BAR_MIN_PX));

            const rejectedBarPx = rejected === 0
                ? BAR_MIN_PX
                : Math.round(BAR_MIN_PX + (rejected / (scaledMax || 1)) * (BAR_MAX_PX - BAR_MIN_PX));

            return {
                month: m.label,
                approvedInternal,
                approvedExternal,
                totalApproved,
                rejected,
                totalAll,
                approvedLabel: `อนุมัติ: ${totalApproved} คำขอ (ใน: ${approvedInternal}, นอก: ${approvedExternal})`,
                rejectedLabel: `ไม่อนุมัติ: ${rejected} คำขอ`,
                approvedBarPx,
                rejectedBarPx
            };
        });
    }, [borrows, users]);

    // ฟังก์ชันการนำทาง
    const handleNavigateToEquipment = () => {
        router.push("/menu/list-karuphan");
    };

    const handleNavigateToUsers = (type: "internal" | "external") => {
        // นำทางไปหน้าจัดการบุคลากร
        router.push("/menu/manage-personnel");
    };

    const handleNavigateToReports = () => {
        router.push("/menu/report3-total_amount");
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
                                <Image src="/icons/data.png" alt="Equipment" width={48} height={48} />
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
                                <Image src="/icons/person.png" alt="Internal Users" width={48} height={48} />
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
                                <Image src="/icons/person.png" alt="External Users" width={48} height={48} />
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
                                <h2 className="text-2xl font-bold text-gray-800">รายงานการอนุมัติคำขอยืมครุภัณฑ์</h2>
                                <p className="text-gray-600">จำนวนคำขอที่อนุมัติและไม่อนุมัติต่อเดือน (6 เดือนล่าสุด)</p>
                                <div className="flex gap-4 mt-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                                        <span>อนุมัติแล้ว (รวมที่คืนแล้ว)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                                        <span>ไม่อนุมัติ/ยกเลิก</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* กรอบกราฟกำหนดสูงตายตัวเพื่อให้แท่งไปชนขอบล่างได้พอดี */}
                            <div className="flex items-end justify-between mb-4 h-[300px]">
                                {monthlyBars.map((data, index) => {
                                    return (
                                        <div key={index} className="flex flex-col items-center w-1/6">
                                            {/* คอนเทนเนอร์ของแท่งคู่ */}
                                            <div className="relative mb-2 h-[260px] w-20 flex flex-col justify-end items-center group">
                                                {/* Tooltip แสดงเมื่อ hover */}
                                                <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
                                                    <div>อนุมัติ: {data.totalApproved} คำขอ</div>
                                                    <div className="text-gray-300">• ภายใน: {data.approvedInternal}</div>
                                                    <div className="text-gray-300">• ภายนอก: {data.approvedExternal}</div>
                                                    {data.rejected > 0 && <div className="mt-1 text-red-300">ไม่อนุมัติ: {data.rejected} คำขอ</div>}
                                                </div>

                                                {/* แท่งคู่ */}
                                                <div className="flex gap-1 items-end">
                                                    {/* แท่งอนุมัติ (เขียว) */}
                                                    <div
                                                        className="w-8 bg-green-500 rounded-t-md transition-all duration-700 ease-out"
                                                        style={{ height: `${data.approvedBarPx}px` }}
                                                        title={data.approvedLabel}
                                                    />
                                                    {/* แท่งไม่อนุมัติ (แดง) */}
                                                    <div
                                                        className="w-8 bg-red-500 rounded-t-md transition-all duration-700 ease-out"
                                                        style={{ height: `${data.rejectedBarPx}px` }}
                                                        title={data.rejectedLabel}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-sm text-gray-600 font-medium">{data.month}</span>
                                        </div>
                                    );
                                })}
                            </div>                            {/* แกน Y คร่าว ๆ */}
                            <div className="absolute left-0 top-0 h-[260px] flex flex-col justify-between text-sm text-gray-500">
                                <span>สูงสุด</span>
                                <span>ต่ำสุด</span>
                            </div>
                        </div>

                        {/* สรุปข้อมูลรายเดือนแบบละเอียด */}
                        <div className="mt-6 bg-gray-50 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">สรุปข้อมูลรายเดือน</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {monthlyBars.map((data, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 shadow-sm">
                                        <h5 className="font-medium text-gray-800 mb-2">{data.month}</h5>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-green-600">อนุมัติทั้งหมด:</span>
                                                <span className="font-medium">{data.totalApproved} คำขอ</span>
                                            </div>
                                            {data.approvedInternal > 0 && (
                                                <div className="flex justify-between pl-3">
                                                    <span className="text-gray-600">• ภายใน:</span>
                                                    <span>{data.approvedInternal} คำขอ</span>
                                                </div>
                                            )}
                                            {data.approvedExternal > 0 && (
                                                <div className="flex justify-between pl-3">
                                                    <span className="text-gray-600">• ภายนอก:</span>
                                                    <span>{data.approvedExternal} คำขอ</span>
                                                </div>
                                            )}
                                            {data.rejected > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-red-600">ไม่อนุมัติ:</span>
                                                    <span className="font-medium">{data.rejected} คำขอ</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
