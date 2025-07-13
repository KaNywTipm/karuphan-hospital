const menu = [
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
            href: "/borrow-return-report",
            visible: ["admin", "internal"],
          },
          {
            icon: "/plus.png",
            label: "รายงานครุภัณฑ์ที่ถูกยกเลิก",
            href: "/cancelled-asset-report",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "รายงานครุภัณฑ์ชำรุด/สูญหาย",
            href: "/damaged-lost-asset-report",
            visible: ["admin"],
          },
          {
            icon: "/plus.png",
            label: "สรุปยอดครุภัณฑ์",
            href: "/asset-summary",
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
            href: "/asset-list",
            visible: ["admin"],
          },
          {
            icon: "/edit.png",
            label: "เพิ่มหมวดหมู่ครุภัณฑ์",
            href: "/add-asset-category",
            visible: ["admin"],
          },
        ],
      },
      {
        icon: "/person.png",
        label: "จัดการบุคลากร",
        href: "/manage-person",
        visible: ["admin"],
      },
      {
        icon: "/person.png",
        label: "แก้ไขโปรไฟล์",
        href: "/manage-personnel",
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

export default menu;