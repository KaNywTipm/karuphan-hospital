import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
    const session = await auth();

    // ยังไม่ล็อกอิน -> ไปหน้า sign-in
    if (!session) redirect("/sign-in");

    // ล็อกอินแล้ว -> ส่งไปตาม role
    const role = (session as any).role as "ADMIN" | "INTERNAL" | "EXTERNAL";
    if (role === "ADMIN") redirect("/role1-admin");
    if (role === "INTERNAL") redirect("/role2-internal");
    if (role === "EXTERNAL") redirect("/role3-external");

    // กันลืม
    redirect("/sign-in");
}
