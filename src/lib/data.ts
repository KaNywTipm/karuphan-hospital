// TEMPORARY DATA

export let role = "admin";

export const inCPUData = [
  {
    id: 12404,
    code: "6530-008-0711/3",
    name: "เครื่องพ่นยา ฝ. ใส่แผน",
    category: "ครุภัณฑ์การแพทย์",
    department: "ภายในแผนก",
    serialNo: "613",
    receivedDate: "1997-11-22",
    price: 1200.00,
    status: "ใช้งานอยู่"
  },
  {
    id: 11846,
    code: "6515-022-1041/2",
    name: "เครื่องตรวจครรภ์",
    category: "เครื่องมือทางการแพทย์",
    department: "ภายในแผนก",
    serialNo: "FL-700",
    receivedDate: "2006-10-22",
    price: 750000.00,
    status: "ชำรุด"
  }
  // เพิ่มได้อีกตามข้อมูล
];

export const outCPUData = [
  {
    id: 10539,
    code: "7110-006-0007/137",
    name: "เก้าอี้เหล็กยาว",
    category: "ครุภัณฑ์สำนักงาน",
    department: "ภายนอกแผนก",
    serialNo: "-",
    receivedDate: "2001-11-01",
    price: 400.00,
    status: "ยืมโดย รพ.สต.ชุมชน"
  },
  {
    id: 11851,
    code: "7110-006-0023/45",
    name: "เก้าอี้ล้อเลื่อนไฟเบอร์",
    category: "ครุภัณฑ์สำนักงาน",
    department: "ภายนอกแผนก",
    serialNo: "-",
    receivedDate: "2003-10-24",
    price: 3000.00,
    status: "สูญหาย"
  }
];

export type Role = "admin" | "internal" | "external";

export interface User {
  id: number;
  fullName: string;
  username: string;
  phone: string;
  password: string;
  role: Role;
}

export const users: User[] = [
  {
    id: 1,
    fullName: "ผู้ระบบ",
    username: "admin",
    phone: "0800000000",
    password: "adminSecurePassword", // ส่งให้โดยตรง ไม่ให้สมัคร
    role: "admin"
  },
  {
    id: 2,
    fullName: "พยาบาล สมใจ",
    username: "nurse01",
    phone: "0811111111",
    password: "12345678",
    role: "internal"
  },
  {
    id: 3,
    fullName: "เจ้าหน้าที่ รพ.สต.บ้านเหนือ",
    username: "officer01",
    phone: "0822222222",
    password: "abcd1234",
    role: "external"
  }
];
