"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/** ---------- types ---------- */
type Equipment = { code?: string; number?: number; name?: string };
type BorrowItem = { equipment?: Equipment };
type BorrowRequest = {
    id: number;
    borrowerType: "INTERNAL" | "EXTERNAL";
    status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
    requestedAt?: string | null;
    createdAt?: string | null;
    requestDate?: string | null;
    returnDue?: string | null;
    reason?: string | null;
    notes?: string | null;
    requester?: { fullName?: string; department?: { name?: string } | null } | null;
    externalName?: string | null;
    externalDept?: string | null;
    items?: BorrowItem[];
};

/** ---------- helpers ---------- */
const asList = <T,>(v: any): T[] =>
    Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];

const fmt = (d?: string | null) => {
    if (!d) return "-";
    try {
        return new Date(d).toLocaleDateString("th-TH");
    } catch {
        return "-";
    }
};

const lc = (v: any) => String(v ?? "").toLowerCase();

/** สรุปชื่อผู้ยืม/หน่วยงาน จากประเภทผู้ยืม */
function shapeBorrower(r: BorrowRequest) {
    if (r.borrowerType === "INTERNAL") {
        return {
            borrowerName: r.requester?.fullName ?? "-",
            department: r.requester?.department?.name ?? "-",
        };
    }
    return {
        borrowerName: r.externalName || r.requester?.fullName || "-",
        department: r.externalDept || "ภายนอกกลุ่มงาน",
    };
}

/** รวมรายการครุภัณฑ์ของคำขอ (เลข/ชื่อ) ให้สั้นอ่านง่าย */
function summarizeItems(items: BorrowItem[] | undefined, max = 2) {
    const list = (items ?? [])
        .map((it) => {
            const code =
                it.equipment?.code ??
                (it.equipment?.number != null ? String(it.equipment.number) : "-");
            const name = it.equipment?.name ?? "-";
            return `${code} · ${name}`;
        })
        .filter(Boolean);

    if (!list.length) return "-";
    if (list.length <= max) return list.join(", ");
    return `${list.slice(0, max).join(", ")} ฯลฯ`;
}

/** ---------- page ---------- */
export default function AdminPendingPage() {
    const [all, setAll] = useState<BorrowRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<"newest" | "oldest">("newest");
    const [page, setPage] = useState(1);
    const perPage = 10;

    async function load() {
        setLoading(true);
        try {
            // ดึงเฉพาะสถานะ PENDING สำหรับแอดมินทั้งหมด
            const res = await fetch("/api/borrow?status=PENDING", {
                cache: "no-store",
                credentials: "include",
            });
            const json = await res.json();
            const data = asList<BorrowRequest>(json);
            setAll(data);
        } catch (e) {
            console.error("[admin pending] fetch error", e);
            setAll([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    /** ทำข้อมูลสำหรับแสดง 1 คำขอ = 1 แถว */
    type Row = {
        id: number;
        borrowerName: string;
        department: string;
        borrowDate: string | null;
        returnDue: string | null;
        reason: string;
        itemsText: string; // สรุปรายการครุภัณฑ์
    };

    const rows: Row[] = useMemo(() => {
        const shaped: Row[] = (all ?? []).map((r) => {
            const { borrowerName, department } = shapeBorrower(r);
            const borrowDate = r.requestedAt || r.createdAt || r.requestDate || null;
            const itemsText = summarizeItems(r.items, 3);
            const reason = r.reason || r.notes || "";
            return {
                id: r.id,
                borrowerName,
                department,
                borrowDate,
                returnDue: r.returnDue ?? null,
                reason,
                itemsText,
            };
        });

        // ค้นหา
        const needle = lc(search);
        const filtered = shaped.filter(
            (x) =>
                lc(x.borrowerName).includes(needle) ||
                lc(x.department).includes(needle) ||
                lc(x.itemsText).includes(needle) ||
                lc(x.reason).includes(needle)
        );

        // เรียงตามวันที่ยืม (ส่งคำขอ)
        filtered.sort((a, b) => {
            const da = a.borrowDate ? new Date(a.borrowDate).getTime() : 0;
            const db = b.borrowDate ? new Date(b.borrowDate).getTime() : 0;
            return sort === "newest" ? db - da : da - db;
        });

        return filtered;
    }, [all, search, sort]);

    // แบ่งหน้า
    const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
    // Clamp page to totalPages if data shrinks
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages, page]);
    const startIndex = (page - 1) * perPage;
    const pageRows = rows.slice(startIndex, startIndex + perPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex flex-col gap-8">
            <section className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                        สถานะการยืมครุภัณฑ์ (รายการรออนุมัติ)
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ/หน่วยงาน/ครุภัณฑ์/เหตุผล"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <Image
                                src="/search.png"
                                alt="search"
                                width={20}
                                height={20}
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setSort((p) => (p === "newest" ? "oldest" : "newest"));
                                setPage(1);
                            }}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            title={sort === "newest" ? "เรียงจากใหม่ไปเก่า" : "เรียงจากเก่าไปใหม่"}
                        >
                            <Image src="/HamBmenu.png" alt="sort" width={20} height={20} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-6 text-gray-500">กำลังโหลด...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed">
                                <thead className="bg-Pink text-White">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-14">
                                            ลำดับ
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-56">
                                            ผู้ยืม / หน่วยงาน
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            รายการครุภัณฑ์ (รวมเป็นแถวเดียว)
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-32">
                                            วันที่ยืม
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium w-32">
                                            กำหนดคืน
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">
                                            เหตุผลการยืม
                                        </th>
                                        <th className="px-2 py-3 text-center text-sm font-medium w-[170px]">
                                            ดำเนินการ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {pageRows.map((r, idx) => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {startIndex + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                <div className="font-medium">{r.borrowerName}</div>
                                                <div className="text-gray-500 text-xs">{r.department}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {r.itemsText}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {fmt(r.borrowDate)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {fmt(r.returnDue)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {r.reason || "-"}
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                {/* ✅ ปุ่มอนุมัติ/ไม่อนุมัติ "ต่อคำขอ" เพียงปุ่มเดียว */}
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/role1-admin/approve?id=${r.id}`}
                                                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-sm shadow-sm"
                                                        title="อนุมัติคำขอ"
                                                    >
                                                        ✓ อนุมัติ
                                                    </Link>
                                                    <Link
                                                        href={`/role1-admin/reject?id=${r.id}`}
                                                        className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded text-sm shadow-sm"
                                                        title="ไม่อนุมัติ"
                                                    >
                                                        ✕ ไม่อนุมัติ
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {!pageRows.length && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-6 text-center text-sm text-gray-500"
                                            >
                                                ยังไม่มีรายการ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <span className="text-sm text-gray-700">
                                แสดง {rows.length === 0 ? 0 : startIndex + 1} –{" "}
                                {Math.min(startIndex + perPage, rows.length)} จาก {rows.length} รายการ
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    disabled={page === 1}
                                >
                                    ← Previous
                                </button>
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded text-sm">
                                    {page}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                    disabled={page === totalPages || totalPages === 0}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
