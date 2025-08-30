import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/api-guard";

export async function GET(req: Request) {
    const ses = await guardApi(["ADMIN"]);
    if (ses instanceof Response) return ses;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const includeAdmin = searchParams.get("includeAdmin") === "true";

    const where: any = {
        ...(q
            ? {
                OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q } },
                ],
            }
            : {}),
        ...(includeAdmin ? {} : { role: { not: "ADMIN" } }),
    };

    const users = await prisma.user.findMany({
        where,
        include: { department: true },
        orderBy: { id: "desc" },
    });

    return NextResponse.json({ ok: true, data: users });
}
