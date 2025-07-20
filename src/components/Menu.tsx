import { role } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/list.png",
        label: "รายการยืมคืนครุภัณฑ์",
        href: "/borrow-return-list",
        visible: ["admin", "internal", "external"],
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
        href: "/dashboard",
        visible: ["admin"],
      },
      {
        icon: "/report.png",
        label: "รายงานสรุปผล",
        href: "/summary-report",
        visible: ["admin"],
        subItems: [
          {
            icon: "/plus.png",
            label: "รายงานการยืมคืน",
            href: "/report1-borrow-return",
            visible: ["admin", "internal"],
          },
          {
            icon: "/plus.png",
            label: "รายงานครุภัณฑ์ที่ถูกยกเลิก",
            href: "/report2-not_approve",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "รายงานครุภัณฑ์ชำรุด/สูญหาย",
            href: "/report3-status_karuphan",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "สรุปยอดครุภัณฑ์",
            href: "/report4-total_amount",
            visible: ["admin"],
          },
        ],
      },
      {
        icon: "/report.png",
        label: "ประวัติการยืมครุภัณฑ์",
        href: "/history",
        visible: ["internal", "external"],
      },
      {
        icon: "/chart.png",
        label: "จัดการครุภัณฑ์",
        href: "/manage-assets",
        visible: ["admin"],
        subItems: [
          {
            icon: "/list.png",
            label: "รายการครุภัณฑ์",
            href: "/list-karuphan",
            visible: ["admin"],
          },
          {
            icon: "/edit.png",
            label: "เพิ่มหมวดหมู่ครุภัณฑ์",
            href: "/category-karuphan",
            visible: ["admin"],
          },
        ],
      },
      {
        icon: "/person.png",
        label: "จัดการบุคลากร",
        href: "/manage-personnel",
        visible: ["admin"],
      },
      {
        icon: "/person.png",
        label: "แก้ไขโปรไฟล์",
        href: "/edit-profile",
        visible: ["internal", "external"],
      },
      {
        icon: "/out.png",
        label: "ออกจากระบบ",
        href: "/logout",
        visible: ["admin", "internal", "external"],
      },
    ],
  },
];

const Menu = () => {
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-white font-normal my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (!item.visible.includes(role)) return null;

            const isLogout = item.label === "ออกจากระบบ";
            const hasSub = !!item.subItems;

            return (
              <div key={item.label} className="flex flex-col">
                <Link
                  href={item.href}
                  className={`flex items-center justify-center lg:justify-start gap-4 py-2 md:px-2 rounded-md
                    ${isLogout ? "text-white hover:bg-red-500" : "text-white"}
                    ${!hasSub && !isLogout ? "hover:bg-gray-800" : ""}
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

                {hasSub &&
                  item.subItems
                    .filter((sub) => sub.visible.includes(role))
                    .map((sub) => (
                      <Link
                        href={sub.href}
                        key={sub.label}
                        className="ml-8 flex items-center justify-start gap-3 text-white py-1 px-2 rounded hover:bg-gray-800 text-sm"
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
  );
};

export default Menu;
