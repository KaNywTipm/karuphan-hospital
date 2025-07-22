// TEMPORARY DATA

export let role = "admin";

// ข้อมูลผู้ใช้ปัจจุบัน (สำหรับ mock ข้อมูล)
export const currentUser = {
  id: 1,
  name: "ผู้ดูแลระบบครุภัณฑ์",
  department: "บุคลากรภายในกลุ่มงานบริการด้านปฐมภูมิและองค์รวม",
  role: "admin",
  title: "ผู้ดูแลระบบครุภัณฑ์",
};

export const inCPUData = [
  {
    id: 12404,
    code: "6530-008-0711/3",
    name: "เครื่องพ่นยา ฝ. ใส่แผน",
    category: "ครุภัณฑ์การแพทย์",
    department: "ภายในแผนก",
    serialNo: "613",
    receivedDate: "1997-11-22",
    price: 1200.0,
    status: "ใช้งานอยู่",
  },
  {
    id: 11846,
    code: "6515-022-1041/2",
    name: "เครื่องตรวจครรภ์",
    category: "เครื่องมือทางการแพทย์",
    department: "ภายในแผนก",
    receivedDate: "2006-10-22",
    price: 750000.0,
    status: "ชำรุด",
  },
  // เพิ่มได้อีกตามข้อมูล
];

export const outCPUData = [
  {
    id: 10539,
    code: "7110-006-0007/137",
    name: "เก้าอี้เหล็กยาว",
    category: "ครุภัณฑ์สำนักงาน",
    department: "ภายนอกแผนก",
    receivedDate: "2001-11-01",
    price: 400.0,
    status: "ยืมโดย รพ.สต.ชุมชน",
  },
  {
    id: 11851,
    code: "7110-006-0023/45",
    name: "เก้าอี้ล้อเลื่อนไฟเบอร์",
    category: "ครุภัณฑ์สำนักงาน",
    department: "ภายนอกแผนก",
    receivedDate: "2003-10-24",
    price: 3000.0,
    status: "สูญหาย",
  },
];

export type Role = "admin" | "internal" | "external";

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

export const users: User[] = [
  {
    id: 1,
    fullName: "ผู้ดูแลระบบครุภัณฑ์",
    email: "admin@example.com",
    phone: "0800000000",
    password: "adminSecurePassword", // ส่งให้โดยตรง ไม่ให้สมัคร
    role: "admin",
  },
  {
    id: 2,
    fullName: "พยาบาล สมใจ",
    email: "nurse01@example.com",
    phone: "0811111111",
    password: "12345678",
    role: "internal",
  },
  {
    id: 3,
    fullName: "เจ้าหน้าที่ รพ.สต.บ้านไหน",
    email: "officer01@example.com",
    phone: "0822222222",
    password: "abcd1234",
    role: "external",
  },
];

// ข้อมูลรายการยืม-คืน
export interface BorrowReturn {
  id: number;
  borrowerName: string;
  department: string;
  equipmentCode: string;
  category: string;
  returnDate: string;
  reason: string;
  status: "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ" | "คืนแล้ว";
  borrowDate?: string;
  userId: number;
}

export const borrowReturnData: BorrowReturn[] = [
  {
    id: 1,
    borrowerName: "นางยืมแล้ว คืนเถ้อ",
    department: "ภายนอกแผนก",
    equipmentCode: "75878-5635",
    category: "อิเล็กทรอนิกส์",
    returnDate: "15/8/56",
    reason: "อื่น",
    status: "อนุมัติ",
    borrowDate: "10/8/56",
    userId: 2,
  },
  {
    id: 2,
    borrowerName: "นางเอ็งยืม คืนมา",
    department: "ภายในแผนก",
    equipmentCode: "75874-5435",
    category: "อิเล็กทรอนิกส์",
    returnDate: "16/8/56",
    reason: "อื่น",
    status: "ไม่อนุมัติ",
    borrowDate: "11/8/56",
    userId: 2,
  },
  {
    id: 3,
    borrowerName: "นางยืนยืม มาคืน",
    department: "ภายนอกแผนก",
    equipmentCode: "75874-5425",
    category: "อิเล็กทรอนิกส์",
    returnDate: "20/8/56",
    reason: "อื่น",
    status: "รออนุมัติ",
    borrowDate: "15/8/56",
    userId: 3,
  },
  {
    id: 4,
    borrowerName: "นางนั่งยืม รอคืน",
    department: "ภายในแผนก",
    equipmentCode: "75874-5415",
    category: "อิเล็กทรอนิกส์",
    returnDate: "11/8/56",
    reason: "อื่น",
    status: "อนุมัติ",
    borrowDate: "06/8/56",
    userId: 2,
  },
  {
    id: 5,
    borrowerName: "นางเอามา คืนนะ",
    department: "ภายนอกแผนก",
    equipmentCode: "75874-5405",
    category: "อิเล็กทรอนิกส์",
    returnDate: "12/8/56",
    reason: "อื่น",
    status: "อนุมัติ",
    borrowDate: "07/8/56",
    userId: 3,
  },
  {
    id: 6,
    borrowerName: "นายทดสอบ สมมติ",
    department: "ภายในแผนก",
    equipmentCode: "75874-5500",
    category: "อิเล็กทรอนิกส์",
    returnDate: "25/8/56",
    reason: "ใช้งาน",
    status: "คืนแล้ว",
    borrowDate: "20/8/56",
    userId: 2,
  },
];
