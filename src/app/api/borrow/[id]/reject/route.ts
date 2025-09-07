import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await auth();
  if (!session)
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  const role = String(session.role ?? session.user?.role ?? "").toUpperCase();
  if (role !== "ADMIN")
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 }
    );

  const id = Number(params.id);
  const body = await req.json().catch(() => ({}));
  const reason: string | null = body?.rejectReason ?? null;

  const br = await prisma.borrowRequest.findUnique({ where: { id } });
  if (!br)
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 }
    );
  if (br.status !== "PENDING")
    return NextResponse.json(
      { ok: false, error: "only-pending" },
      { status: 400 }
    );

  // ก่อน update: เก็บ rejectedById และ rejectedAt
  const userId = Number((session.user as any)?.id || 0) || null;

  await prisma.borrowRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectReason: reason ?? null,
      rejectedById: userId,
      rejectedAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}
export async function POST(req: Request, ctx: any) {
  return PATCH(req, ctx);
}
