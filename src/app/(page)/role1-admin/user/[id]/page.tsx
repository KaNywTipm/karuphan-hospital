// Server component
import BorrowHistoryTable from "./BorrowHistoryTable";
import { prisma } from "@/lib/prisma";

export default async function UserProfilePage({ params }: { params: { id: string } }) {
    const userId = Number(params.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, email: true, role: true, phone: true, department: { select: { name: true } } },
    });

    if (!user) return <div>ไม่พบผู้ใช้</div>;

    return (
        <div className="space-y-6">
            <div className="rounded-xl border p-4">
                <h1 className="text-xl font-semibold">{user.fullName}</h1>
                <p className="text-sm text-gray-600">{user.email} · {user.role} · {user.department?.name ?? "-"}</p>
                <p className="text-sm text-gray-600">โทร: {user.phone ?? "-"}</p>
            </div>

            <BorrowHistoryTable userId={user.id} />
        </div>
    );
}
