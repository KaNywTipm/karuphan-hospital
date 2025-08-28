import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getEquipments() {
  return await prisma.equipment.findMany();
}

// TEMPORARY DATA

export let role = "admin"; // Change this to "admin" or "internal" as needed

export const currentUser = {
  id: 1,
  name: "ผู้ดูแลระบบครุภัณฑ์",
  department: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
  role: "admin",
  title: "ผู้ดูแลระบบครุภัณฑ์",
};

export const inCPUData = [
  {
    id: 12404,
    code: "6530-008-0711/3",
    name: "เครื่องพ่นยา ฝ. ใส่แผน",
    details: "เครื่องพ่นยาแบบฝาใส่แผน สำหรับพ่นยาฆ่าเชื้อ",
    category: "ครุภัณฑ์การแพทย์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2540-11-22",
    price: 1200.0,
    status: "ปกติ",
  },
  {
    id: 11846,
    code: "6515-022-1041/2",
    name: "เตียงตรวจครรภ์",
    details: "ขาเหล็ก พื้นไม้อัด",
    category: "เครื่องมือทางการแพทย์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2549-10-22",
    price: 9200.0,
    status: "ชำรุด",
  },
  {
    id: 12405,
    code: "75878-5635",
    name: "ชุดแอลกอฮอลเท้าเหยียบ",
    details: "เป็นสแตนเลส แบบเท้าเหยียบ",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2558-08-15",
    price: 1000.0,
    status: "ยืมโดย นางยืมแล้ว คืนเถ้อ",
  },
  {
    id: 12406,
    code: "75874-5435",
    name: "เครื่องวัดความดันโลหิต",
    details: "เครื่องวัดความดันโลหิตดิจิตอล รุ่น DP 300",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2559-08-16",
    price: 10000.0,
    status: "ปกติ",
  },
  {
    id: 12407,
    code: "75874-5425",
    name: "คอมพิวเตอร์โน้ตบุ๊ก",
    details: "Acer Aspire A315-23-R1X0/T002",
    category: "ครุภัณฑ์คอมพิวเตอร์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2563-08-20",
    price: 10000.0,
    status: "ยืมโดย นางยืนยืม มาคืน",
  },
  {
    id: 12408,
    code: "75874-5415",
    name: "โทรศัพท์",
    details: "โทรศัพท์ตั้งโต๊ะ",
    category: "ครุภัณฑ์สำนักงาน",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2554-08-11",
    price: 50050.0,
    status: "ยืมโดย นางนั่งยืม รอคืน",
  },
  {
    id: 12409,
    code: "75874-5405",
    name: "เครื่องขยายเสียงพร้อมไมโครโฟน",
    details: "เครื่องขยายเสียงพร้อมไมโครโฟน",
    category: "ครุภัณฑ์ไฟฟ้าและวิทยุ",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2555-08-12",
    price: 59697.0,
    status: "ยืมโดย นางเอามา คืนนะ",
  },
  {
    id: 12410,
    code: "75874-5500",
    name: "จอโปรเจคเตอร์",
    details:
      "จอโปรเจคเตอร์ มือดึงพร้อมขาตั้ง 100 นิ้ว/VERTEX,เครื่องฉายภาพ รุ่น ER-X06/EPSON",
    category: "ครุภัณฑ์โฆษณาและเผยแพร่",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2560-03-15",
    price: 25000.0,
    status: "ปกติ",
  },
  {
    id: 12411,
    code: "75874-5501",
    name: "เครื่องวัดความดันลูกตา",
    details: "แบบไม่สัมผัส ชนิดใช้ลมเป่า",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    department: "ภายในกลุ่มงาน",
    receivedDate: "2563-04-20",
    price: 2500.0,
    status: "ปกติ",
  },
];

export const outCPUData = [
  {
    id: 10539,
    code: "7110-006-0007/137",
    name: "เก้าอี้สแตนเลส",
    details: "ปรับสูง-ต่ำได้",
    category: "ครุภัณฑ์สำนักงาน",
    role: "external",
    groupName: "กลุ่มงานบริหารทั่วไป",
    receivedDate: "2544-11-01",
    price: 400.0,
    status: "ยืมโดย กลุ่มงานบริหารทั่วไป",
  },
  {
    id: 11851,
    code: "7110-006-0023/45",
    name: "เก้าอี้สำนักงาน",
    details: "มีพนักพิงและมีล้อเลื่อน (สีดำ)",
    category: "ครุภัณฑ์สำนักงาน",
    role: "external",
    groupName: "กลุ่มงานเทคนิคการแพทย์",
    receivedDate: "2546-10-24",
    price: 3000.0,
    status: "สูญหาย",
  },
  {
    id: 11852,
    code: "7110-006-0024/46",
    name: "ตู้เหล็ก",
    details: "ตู้เก็บเอกสารเหล็ก 4 ชั้น ล้อเลื่อน",
    category: "ครุภัณฑ์สำนักงาน",
    role: "external",
    groupName: "กลุ่มงานทันตกรรม",
    receivedDate: "2547-12-10",
    price: 8500.0,
    status: "ปกติ",
  },
];

export type Role = "admin" | "internal" | "external";

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  groupName: string; // สังกัดกลุ่มงาน
}

export const users: User[] = [
  {
    id: 1,
    fullName: "ผู้ดูแลระบบครุภัณฑ์",
    email: "admin@example.com",
    phone: "0800000000",
    password: "adminSecurePassword",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
  },
  {
    id: 2,
    fullName: "พยาบาล สมใจ",
    email: "nurse01@example.com",
    phone: "0811111111",
    password: "12345678",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
  },
  {
    id: 3,
    fullName: "เจ้าหน้าที่ รพ.สต.บ้านไหน",
    email: "officer01@example.com",
    phone: "0822222222",
    password: "abcd1234",
    groupName: "กลุ่มงานบริหารทั่วไป",
  },
];

// ข้อมูลหมวดหมู่ครุภัณฑ์
export const equipmentCategories = [
  {
    id: 1,
    label: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
  },
  {
    id: 2,
    label: "ครุภัณฑ์สำนักงาน",
  },
  {
    id: 3,
    label: "ครุภัณฑ์คอมพิวเตอร์",
  },
  {
    id: 4,
    label: "ครุภัณฑ์ไฟฟ้าและวิทยุ",
  },
  {
    id: 5,
    label: "ครุภัณฑ์โฆษณาและเผยแพร่",
  },
  {
    id: 6,
    label: "ครุภัณฑ์งานบ้านงานครัว",
  },
  {
    id: 7,
    label: "ครุภัณฑ์ยานพาหนะและขนส่ง",
  },
];

// ข้อมูลรายการยืม-คืน
export interface BorrowReturn {
  id: number;
  borrowerName: string;
  groupName: string; // สังกัดกลุ่มงาน
  equipmentCode: string;
  equipmentName: string;
  category: string;
  returnDate: string;
  reason: string;
  status: "รออนุมัติ" | "อนุมัติแล้ว/รอคืน" | "ไม่อนุมัติ" | "คืนแล้ว";
  borrowDate?: string;
  userId: number;
  // ข้อมูลสำหรับการคืน
  returnCondition?: "ปกติ" | "ชำรุด" | "สูญหาย" | "รอจำหน่าย" | "จำหน่ายแล้ว";
  returnNotes?: string;
  actualReturnDate?: string;
  receivedBy?: string;
}

export const borrowReturnData: BorrowReturn[] = [
  {
    id: 1,
    borrowerName: "นางยืมแล้ว คืนเถ้อ",
    groupName: "กลุ่มงานบริหารทั่วไป",
    equipmentCode: "75878-5635",
    equipmentName: "เครื่องพ่นยา ฝ. ใส่แผน",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    returnDate: "15/8/56",
    reason: "เอาไปใช้สาธิตในการประชุม",
    status: "อนุมัติแล้ว/รอคืน",
    borrowDate: "10/8/56",
    userId: 2,
  },
  {
    id: 2,
    borrowerName: "นางเอ็งยืม คืนมา",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
    equipmentCode: "75874-5435",
    equipmentName: "เครื่องตรวจครรภ์",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    returnDate: "16/8/56",
    reason: "อื่น",
    status: "ไม่อนุมัติ",
    borrowDate: "11/8/56",
    userId: 2,
  },
  {
    id: 3,
    borrowerName: "นางยืนยืม มาคืน",
    groupName: "กลุ่มงานเทคนิคการแพทย์",
    equipmentCode: "75874-5425",
    equipmentName: "คอมพิวเตอร์โน้ตบุ๊ก",
    category: "ครุภัณฑ์คอมพิวเตอร์",
    returnDate: "20/8/56",
    reason: "อื่น",
    status: "รออนุมัติ",
    borrowDate: "15/8/56",
    userId: 3,
  },
  {
    id: 4,
    borrowerName: "นางนั่งยืม รอคืน",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
    equipmentCode: "75874-5415",
    equipmentName: "เก้าอี้เหล็กยาว",
    category: "ครุภัณฑ์สำนักงาน",
    returnDate: "11/8/56",
    reason: "อื่น",
    status: "อนุมัติแล้ว/รอคืน",
    borrowDate: "06/8/56",
    userId: 2,
  },
  {
    id: 5,
    borrowerName: "นางเอามา คืนนะ",
    groupName: "กลุ่มงานทันตกรรม",
    equipmentCode: "75874-5405",
    equipmentName: "เครื่องเสียงไร้สาย",
    category: "ครุภัณฑ์ไฟฟ้าและวิทยุ",
    returnDate: "12/8/56",
    reason: "อื่น",
    status: "อนุมัติแล้ว/รอคืน",
    borrowDate: "07/8/56",
    userId: 3,
  },
  {
    id: 6,
    borrowerName: "นายทดสอบ สมมติ",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
    equipmentCode: "75874-5500",
    equipmentName: "เครื่องโปรเจคเตอร์",
    category: "ครุภัณฑ์โฆษณาและเผยแพร่",
    returnDate: "25/8/56",
    reason: "ใช้งาน",
    status: "คืนแล้ว",
    borrowDate: "20/8/56",
    userId: 2,
    returnCondition: "ปกติ",
    actualReturnDate: "25/8/56",
    receivedBy: "บางจิน รอดรวง",
    returnNotes: "คืนในสภาพดี",
  },
  {
    id: 7,
    borrowerName: "นายชำรุด มาแล้ว",
    groupName: "กลุ่มงานเภสัชกรรมและคุ้มครองผู้บริโภค",
    equipmentCode: "75878-6001",
    equipmentName: "เครื่องวัดความดัน",
    category: "ครุภัณฑ์ทางการแพทย์และวิทยาศาสตร์",
    returnDate: "20/8/56",
    reason: "ใช้ตรวจผู้ป่วย",
    status: "คืนแล้ว",
    borrowDate: "18/8/56",
    userId: 3,
    returnCondition: "ชำรุด",
    actualReturnDate: "20/8/56",
    receivedBy: "บางจิน รอดรวง",
    returnNotes: "หน้าจอแตก ปุ่มกดไม่ได้",
  },
  {
    id: 8,
    borrowerName: "นางสูญ หายไป",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
    equipmentCode: "75874-6002",
    equipmentName: "แท็บเล็ต iPad",
    category: "ครุภัณฑ์คอมพิวเตอร์",
    returnDate: "22/8/56",
    reason: "นำไปประชุม",
    status: "คืนแล้ว",
    borrowDate: "20/8/56",
    userId: 2,
    returnCondition: "สูญหาย",
    actualReturnDate: "22/8/56",
    receivedBy: "บางจิน รอดรวง",
    returnNotes: "สูญหายระหว่างการเดินทาง",
  },
  {
    id: 9,
    borrowerName: "นายรอจำหน่าย ชิ้นเก่า",
    groupName: "กลุ่มงานการแพทย์",
    equipmentCode: "75874-6003",
    equipmentName: "เครื่องพิมพ์เลเซอร์",
    category: "ครุภัณฑ์สำนักงาน",
    returnDate: "24/8/56",
    reason: "พิมพ์เอกสาร",
    status: "คืนแล้ว",
    borrowDate: "22/8/56",
    userId: 3,
    returnCondition: "รอจำหน่าย",
    actualReturnDate: "24/8/56",
    receivedBy: "บางจิน รอดรวง",
    returnNotes: "เก่ามาก ใช้งานไม่ได้ ต้องจำหน่าย",
  },
  {
    id: 10,
    borrowerName: "นายจำหน่าย เรียบร้อย",
    groupName: "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
    equipmentCode: "75874-6004",
    equipmentName: "เครื่องถ่ายเอกสาร",
    category: "ครุภัณฑ์สำนักงาน",
    returnDate: "26/8/56",
    reason: "ถ่ายเอกสาร",
    status: "คืนแล้ว",
    borrowDate: "24/8/56",
    userId: 2,
    returnCondition: "จำหน่ายแล้ว",
    actualReturnDate: "26/8/56",
    receivedBy: "บางจิน รอดรวง",
    returnNotes: "ดำเนินการจำหน่ายเรียบร้อยแล้ว",
  },
];

// ฟังก์ชันสำหรับอัปเดตสถานะครุภัณฑ์ตามการยืม-คืน
export const updateEquipmentStatus = () => {
  // อัปเดตสถานะของครุภัณฑ์ภายในตามข้อมูลการยืม
  inCPUData.forEach((equipment) => {
    const activeBorrow = borrowReturnData.find(
      (borrow) =>
        borrow.equipmentCode === equipment.code &&
        (borrow.status === "อนุมัติแล้ว/รอคืน" || borrow.status === "รออนุมัติ")
    );

    if (activeBorrow) {
      equipment.status = `ยืมโดย ${activeBorrow.borrowerName}`;
    } else {
      // ถ้าไม่มีการยืมที่ active และสถานะปัจจุบันเป็น "ยืมโดย..." ให้เปลี่ยนเป็น "ปกติ"
      if (equipment.status.startsWith("ยืมโดย")) {
        equipment.status = "ปกติ";
      }
    }
  });
};

// ฟังก์ชันสำหรับสร้างการยืมใหม่(แก้ขัดก่อนขึ้นข้อมูลหลังบ้าน)
export const createNewBorrowRequest = (
  borrowData: Omit<BorrowReturn, "id" | "status">
) => {
  const newId = Math.max(...borrowReturnData.map((item) => item.id)) + 1;

  // กำหนดสถานะตาม groupName
  const status =
    borrowData.groupName === "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม"
      ? "อนุมัติแล้ว/รอคืน"
      : "รออนุมัติ";

  const newRequest: BorrowReturn = {
    ...borrowData,
    id: newId,
    status,
  };

  borrowReturnData.push(newRequest);

  // อัปเดตสถานะครุภัณฑ์
  updateEquipmentStatus();

  return newRequest;
};

// ฟังก์ชันสำหรับอัปเดตสถานะ(แก้ขัดก่อนขึ้นข้อมูลหลังบ้าน)
export const updateBorrowStatus = (
  id: number,
  newStatus: BorrowReturn["status"]
) => {
  const itemIndex = borrowReturnData.findIndex((item) => item.id === id);
  if (itemIndex !== -1) {
    borrowReturnData[itemIndex].status = newStatus;
    return borrowReturnData[itemIndex];
  }
  return null;
};

// ฟังก์ชันสำหรับบันทึกข้อมูลการคืน(แก้ขัดก่อนขึ้นข้อมูลหลังบ้าน)
export const updateReturnInfo = (
  id: number,
  returnData: {
    returnCondition: BorrowReturn["returnCondition"];
    returnNotes?: string;
    actualReturnDate: string;
    receivedBy?: string;
  }
) => {
  const itemIndex = borrowReturnData.findIndex((item) => item.id === id);
  if (itemIndex !== -1) {
    borrowReturnData[itemIndex] = {
      ...borrowReturnData[itemIndex],
      status: "คืนแล้ว",
      returnCondition: returnData.returnCondition,
      returnNotes: returnData.returnNotes,
      actualReturnDate: returnData.actualReturnDate,
      receivedBy: returnData.receivedBy || "นางสาวดูแล ครุภัณฑ์",
    };
    return borrowReturnData[itemIndex];
  }
  return null;
};
