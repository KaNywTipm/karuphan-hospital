"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "INTERNAL" | "EXTERNAL";
type MenuItem = {
  icon: string;
  label: string;
  href: string;
  visible: Role[];
  subItems?: MenuItem[];
};

const MENU: { title: string; items: MenuItem[] }[] = [
  {
    title: "MENU",
    items: [
      { icon: "/list.png",  label: "รายการยืมคืนครุภัณฑ์", href: "/role1-admin",           visible: ["ADMIN"] },
      { icon: "/list.png",  label: "รายการยืมครุภัณฑ์",    href: "/role2-internal",        visible: ["INTERNAL"] },
      { icon: "/list.png",  label: "รายการยืมครุภัณฑ์",    href: "/role3-external",        visible: ["EXTERNAL"] },
      { icon: "/chart.png", label: "แดชบอร์ด",              href: "/menu/dashboard",        visible: ["ADMIN"] },
      {
        icon: "/status.png",
        label: "รายงานสรุปผล",
        href: "#",
        visible: ["ADMIN"],
        subItems: [
          { icon: "/plus.png", label: "รายงานการยืมคืน",         href: "/menu/report1-borrow_return",   visible: ["ADMIN"] },
          { icon: "/plus.png", label: "รายงานครุภัณฑ์ที่ถูกยกเลิก", href: "/menu/report2-not_approve",     visible: ["ADMIN"] },
          { icon: "/plus.png", label: "รายงานสถานะของครุภัณฑ์",   href: "/menu/report3-status_karuphan", visible: ["ADMIN"] },
          { icon: "/plus.png", label: "สรุปยอดครุภัณฑ์",           href: "/menu/report4-total_amount",    visible: ["ADMIN"] },
        ],
      },
      { icon: "/report.png", label: "ประวัติการยืมครุภัณฑ์", href: "/menu/user_history",            visible: ["INTERNAL","EXTERNAL"] },
      { icon: "/status.png", label: "สถานะการยืมครุภัณฑ์",   href: "/menu/userExternal-status-borrow", visible: ["EXTERNAL"] },
      {
        icon: "/data.png",
        label: "จัดการครุภัณฑ์",
        href: "#",
        visible: ["ADMIN"],
        subItems: [
          { icon: "/list.png", label: "รายการครุภัณฑ์",   href: "/menu/list-karuphan",     visible: ["ADMIN"] },
          { icon: "/edit.png", label: "เพิ่มหมวดหมู่ครุภัณฑ์", href: "/menu/category-karuphan", visible: ["ADMIN"] },
        ],
      },
      { icon: "/person.png", label: "จัดการบุคลากร",  href: "/menu/manage-personnel", visible: ["ADMIN"] },
      { icon: "/person.png", label: "แก้ไขโปรไฟล์",   href: "/menu/user_edit-profile", visible: ["INTERNAL","EXTERNAL"] },
      { icon: "/out.png",    label: "ออกจากระบบ",     href: "/sign-in",                 visible: ["ADMIN","INTERNAL","EXTERNAL"] },
    ],
  },
];

type Me = {
  id: number;
  fullName: string;
  role: Role;
  department?: { id: number; name: string } | null;
};

export default function Menu() {
  const { data: session, status } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  // ดึงโปรไฟล์จริงจาก API
  async function fetchMe() {
    try {
      const r = await fetch(`/api/users/me?t=${Date.now()}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok && j.user) {
        setMe(j.user as Me);
      } else if (session?.user) {
        // fallback จาก session (กันหน้าแตก)
        setMe({
          id: Number((session.user as any).id),
          fullName: (session.user as any).name || "ผู้ใช้",
          role: String((session.user as any).role || "EXTERNAL").toUpperCase() as Role,
          department: null,
        });
      }
    } catch {
    }
  }

  // โหลดเมื่อ auth พร้อม และรีเฟรชเมื่อมีการแก้โปรไฟล์ (ยิง event "me:updated")
  useEffect(() => {
    if (status === "authenticated") fetchMe();
  }, [status]);

  useEffect(() => {
    const onUpdated = () => fetchMe();
    window.addEventListener("me:updated", onUpdated);
    return () => window.removeEventListener("me:updated", onUpdated);
  }, []);

  // role ที่ใช้ filter เมนู
  const role: Role = useMemo(
    () => (me?.role || (String((session?.user as any)?.role || "EXTERNAL").toUpperCase() as Role)),
    [me, session]
  );

  const displayName = me?.fullName ?? (session?.user as any)?.name ?? "ผู้ใช้ระบบครุภัณฑ์";
  const displayDept = me?.department?.name ?? "-";

  const toggleSub = (label: string) =>
    setOpenSubMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );

  return (
    <div className="flex flex-col h-full">
      {/* โปรไฟล์ */}
      <div className="flex items-center gap-3 p-4 mb-4 bg-slate-600 rounded-lg">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <Image src="/profile.png" alt="profile" width={20} height={20} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0 hidden lg:block">
          <p className="text-white font-medium text-sm break-words">{displayName}</p>
          <p className="text-gray-300 text-xs break-words whitespace-normal">{displayDept}</p>
        </div>
      </div>

      {/* เมนู */}
      <div className="flex-1 text-sm">
        {MENU.map((group) => (
          <div className="flex flex-col gap-2" key={group.title}>
            {group.items.map((item) => {
              if (!item.visible.includes(role)) return null;
              const isLogout = item.label === "ออกจากระบบ";
              const hasSub = !!item.subItems;

              return (
                <div key={item.label} className="flex flex-col">
                  {hasSub ? (
                    <button
                      onClick={() => toggleSub(item.label)}
                      className="flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md text-White hover:bg-gray-700 w-full text-left"
                    >
                      <Image src={item.icon} alt="" width={20} height={20} />
                      <span className="hidden lg:block flex-1">{item.label}</span>
                      <span className="hidden lg:block text-xs">
                        {openSubMenus.includes(item.label) ? "▼" : "▶"}
                      </span>
                    </button>
                  ) : isLogout ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm("ยืนยันออกจากระบบ?")) {
                          await signOut({ redirect: true, callbackUrl: "/sign-in" });
                        }
                      }}
                      className="flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md text-White hover:bg-red-500 w-full"
                      aria-label="ออกจากระบบ"
                    >
                      <Image src={item.icon} alt="" width={20} height={20} />
                      <span className="hidden lg:block">{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md text-White hover:bg-gray-700"
                    >
                      <Image src={item.icon} alt="" width={20} height={20} />
                      <span className="hidden lg:block">{item.label}</span>
                    </Link>
                  )}

                  {hasSub &&
                    openSubMenus.includes(item.label) &&
                    item.subItems!
                      .filter((s) => s.visible.includes(role))
                      .map((s) => (
                        <Link
                          href={s.href}
                          key={s.label}
                          className="ml-8 flex items-center justify-start gap-3 text-white py-1 px-2 rounded hover:bg-gray-700 text-sm"
                        >
                          <Image src={s.icon} alt="" width={20} height={20} className="filter invert-0" />
                          <span>{s.label}</span>
                        </Link>
                      ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
