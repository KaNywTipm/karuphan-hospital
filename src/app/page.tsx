import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
    const session = await auth();
    if (!session) redirect("/sign-in");

    const r = session.user?.role;
    if (r === "ADMIN") redirect("/role1-admin");
    if (r === "INTERNAL") redirect("/role2-internal");
    if (r === "EXTERNAL") redirect("/role3-external");
    redirect("/sign-in");
}
