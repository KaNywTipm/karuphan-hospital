// src/lib/require-role.ts
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireRole(
    roles: ("ADMIN" | "INTERNAL" | "EXTERNAL")[]
) {
    const session = await auth();
    if (!session) redirect("/sign-in");
    const role = (session as any).role;
    if (!roles.includes(role)) {
        const to =
            role === "ADMIN"
                ? "/role1-admin"
                : role === "INTERNAL"
                    ? "/role2-internal"
                    : "/role3-external";
        redirect(to);
    }
}
