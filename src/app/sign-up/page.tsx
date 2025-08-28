"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import bcrypt from "bcryptjs";


// eslint-disable-next-line @next/next/no-async-client-component
export default async function SignUpPage() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"INTERNAL" | "EXTERNAL">("EXTERNAL");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, phone, email, password, confirmPassword, role }),
        }).then(r => r.json());
        setLoading(false);

        if (res.ok) {
            alert("สมัครสมาชิกสำเร็จ");
            router.push("/sign-in");
        } else {
            alert(res.error || "เกิดข้อผิดพลาด");
        }
    }

    return (
        <div className="min-h-screen grid place-items-center bg-gray-50">
            <form onSubmit={onSubmit} className="w-[420px] bg-white p-6 rounded-2xl shadow">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">สมัครบัญชีของคุณ</p>

                <label className="text-sm">บุคลากร</label>
                <select className="w-full border rounded px-3 py-2 mb-3"
                    value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="INTERNAL">บุคลากรในกลุ่มงานบริการด้านปฐมภูมิและองค์รวม</option>
                    <option value="EXTERNAL">เจ้าหน้าที่นอกกลุ่มงาน</option>
                </select>

                <label className="text-sm">ชื่อ - นามสกุล</label>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="name"
                    value={fullName} onChange={e => setFullName(e.target.value)} />

                <label className="text-sm">เบอร์โทร</label>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="+66"
                    value={phone} onChange={e => setPhone(e.target.value)} />

                <label className="text-sm">อีเมล</label>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="example@gmail.com"
                    value={email} onChange={e => setEmail(e.target.value)} />

                <label className="text-sm">รหัสผ่าน</label>
                <input className="w-full border rounded px-3 py-2 mb-3" type="password" placeholder="password"
                    value={password} onChange={e => setPassword(e.target.value)} />

                <label className="text-sm">ยืนยันรหัสผ่าน</label>
                <input className="w-full border rounded px-3 py-2 mb-5" type="password" placeholder="password"
                    value={confirmPassword} onChange={e => setConfirm(e.target.value)} />

                <button disabled={loading} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">
                    {loading ? "กำลังสมัคร..." : "สมัคร"}
                </button>

                <div className="text-xs text-right mt-3">
                    <Link href="/sign-in" className="text-gray-600 hover:underline">เข้าสู่ระบบ</Link>
                </div>
            </form>
        </div>
    );
}
