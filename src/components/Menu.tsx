"use client";

import { role, currentUser } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/list.png",
        label: "รายการยืมคืนครุภัณฑ์",
        href: "/role1-admin",
        visible: ["admin"],
      },
      {
        icon: "/list.png",
        label: "รายการยืมครุภัณฑ์",
        href: "/borrow-list",
        visible: ["internal", "external"],
      },
      {
        icon: "/chart.png",
        label: "แดชบอร์ด",
        href: "/menu/dashboard",
        visible: ["admin"],
      },
      {
        icon: "/report.png",
        label: "รายงานสรุปผล",
        href: "#",
        visible: ["admin"],
        subItems: [
          {
            icon: "/plus.png",
            label: "รายงานการยืมคืน",
            href: "/menu/report1-borrow_return",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "รายงานครุภัณฑ์ที่ถูกยกเลิก",
            href: "/menu/report2-not_approve",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "รายงานสถานะของครุภัณฑ์",
            href: "/menu/report3-status_karuphan",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "สรุปยอดครุภัณฑ์",
            href: "/menu/report4-total_amount",
            visible: ["admin"],
          },
        ],
      },
      {
        icon: "/report.png",
        label: "ประวัติการยืมครุภัณฑ์",
        href: "/menu/user_history",
        visible: ["internal", "external"],
      },
      {
        icon: "/status.png",
        label: "สถานะการยืมครุภัณฑ์",
        href: "/menu/user_status-borrow",
        visible: ["internal", "external"],
      },
      {
        icon: "/chart.png",
        label: "จัดการครุภัณฑ์",
        href: "#",
        visible: ["admin"],
        subItems: [
          {
            icon: "/list.png",
            label: "รายการครุภัณฑ์",
            href: "/menu/list-karuphan",
            visible: ["admin"],
          },
          {
            icon: "/edit.png",
            label: "เพิ่มหมวดหมู่ครุภัณฑ์",
            href: "/menu/category-karuphan",
            visible: ["admin"],
          },
        ],
      },
      {
        icon: "/person.png",
        label: "จัดการบุคลากร",
        href: "/menu/manage-personnel",
        visible: ["admin"],
      },
      {
        icon: "/person.png",
        label: "แก้ไขโปรไฟล์",
        href: "/menu/user_edit-profile",
        visible: ["internal", "external"],
      },
      {
        icon: "/out.png",
        label: "ออกจากระบบ",
        href: "/sign-in",
        visible: ["admin", "internal", "external"],
      },
    ],
  },
];

const Menu = () => {
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Profile Section */}
      <div className="flex items-center gap-3 p-4 mb-4 bg-slate-600 rounded-lg">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <Image
            src="/profile.png"
            alt="profile"
            width={20}
            height={20}
            className="text-gray-600"
          />
        </div>
        <div className="flex-1 min-w-0 hidden lg:block">
          <p className="text-white font-medium text-sm break-words">
            {currentUser.name}
          </p>
          <p className="text-gray-300 text-xs break-words whitespace-normal">
            {currentUser.department}
          </p>
        </div>
      </div>


      {/* Menu Items */}
      <div className="flex-1 text-sm">
        {menuItems.map((i) => (
          <div className="flex flex-col gap-2" key={i.title}>
            {i.items.map((item) => {
              if (!item.visible.includes(role)) return null;

              const isLogout = item.label === "ออกจากระบบ";
              const hasSub = !!item.subItems;

              return (
                <div key={item.label} className="flex flex-col">
                  {hasSub ? (
                    <button
                      onClick={() => toggleSubMenu(item.label)}
                      className={`flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md text-White hover:bg-gray-700 w-full text-left`}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                      />
                      <span className="hidden lg:block flex-1">{item.label}</span>
                      <span className="hidden lg:block text-xs">
                        {openSubMenus.includes(item.label) ? "▼" : "▶"}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md
                        ${isLogout ? "text-White hover:bg-red-500" : "text-White hover:bg-gray-700"}
                      `}
                    >
                      <Image
                        src={item.icon}
                        alt=""
                        width={20}
                        height={20}
                      />
                      <span className="hidden lg:block">{item.label}</span>
                    </Link>
                  )}

                  {hasSub && openSubMenus.includes(item.label) &&
                    item.subItems
                      .filter((sub) => sub.visible.includes(role))
                      .map((sub) => (
                        <Link
                          href={sub.href}
                          key={sub.label}
                          className="ml-8 flex items-center justify-start gap-3 text-white py-1 px-2 rounded hover:bg-gray-700 text-sm"
                        >
                          <Image
                            src={sub.icon}
                            alt=""
                            width={16}
                            height={16}
                            className="filter invert-0"
                          />
                          <span>{sub.label}</span>
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
};

export default Menu;
