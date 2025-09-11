"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Unit from "@/components/dropdown/Unit";

const PCU_LABEL = "กลุ่มงานบริการด้านปฐมภูมิและองค์รวม";

export default function SignUpPage() {
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [departmentName, setDepartmentName] = useState(PCU_LABEL);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirm] = useState("");

    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const unitOptions: string[] = useMemo(
        () => ((Unit as any)?.[0]?.items ?? []).map((it: any) => String(it.label)),
        []
    );

    const landingOf = (role: "ADMIN" | "INTERNAL" | "EXTERNAL") =>
        role === "ADMIN" ? "/role1-admin" :
            role === "INTERNAL" ? "/role2-internal" : "/role3-external";

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName,
                    phone,
                    email,
                    password,
                    confirmPassword,
                    departmentName, // ✅ ให้แบ็กเอนด์ตัดสิน role จากชื่อนี้
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.ok) {
                setMsg(data.error || "สมัครไม่สำเร็จ");
                setLoading(false);
                return;
            }

            const role: "INTERNAL" | "EXTERNAL" | "ADMIN" = data.user.role;
            await signIn("credentials", {
                email,
                password,
                redirect: true,
                callbackUrl: landingOf(role), // "/role2-internal" หรือ "/role3-external"
            });
        } catch (err) {
            setMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            setLoading(false);
        }
    }

    // ข้อความบอกบทบาทที่จะถูกกำหนดจากหน่วยงานที่เลือก
    const roleHint =
        departmentName === PCU_LABEL
            ? "ระบบจะกำหนดบทบาท: บุคลากรภายใน (INTERNAL)"
            : "ระบบจะกำหนดบทบาท: เจ้าหน้าที่นอกกลุ่มงาน (EXTERNAL)";

    return (
        <div className="min-h-screen flex items-center justify-center bg-cover bg-center">
            <form onSubmit={onSubmit} className="w-[420px] bg-white/90 p-6 rounded-2xl shadow relative z-10">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">สมัครบัญชีของคุณ</p>
                {msg && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {msg}
                    </div>
                )}
                {/* หน่วยงาน */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/people.png" alt="" width={18} height={18} />
                    หน่วยงาน
                </label>
                <select
                    className="w-full border rounded px-3 py-2 mb-1"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                >
                    {unitOptions.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mb-3">{roleHint}</p>
                {/* ชื่อ - นามสกุล */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/pencil.png" alt="" width={18} height={18} />
                    ชื่อ - นามสกุล
                </label>
                <input
                    className="w-full border rounded px-3 py-2 mb-3"
                    placeholder="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
                {/* เบอร์โทร */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/tel.png" alt="" width={18} height={18} />
                    เบอร์โทร
                </label>
                <input
                    className="w-full border rounded px-3 py-2 mb-3"
                    placeholder="+66"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                {/* อีเมล */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/mail.png" alt="" width={18} height={18} />
                    อีเมล
                </label>
                <input
                    className="w-full border rounded px-3 py-2 mb-3"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                {/* รหัสผ่าน */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/key.png" alt="" width={18} height={18} />
                    รหัสผ่าน
                </label>
                <div className="relative mb-3">
                    <input
                        className="w-full border rounded px-3 py-2 pr-10"
                        type={showPw ? "text" : "password"}
                        placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label="toggle password"
                        title="แสดง/ซ่อนรหัสผ่าน"
                    >
                        <Image src={`/icons/${showPw ? "openEye" : "closeEye"}.png`} alt="" width={18} height={18} />
                    </button>
                </div>
                {/* ยืนยันรหัสผ่าน */}
                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/key.png" alt="" width={18} height={18} />
                    ยืนยันรหัสผ่าน
                </label>
                <div className="relative mb-5">
                    <input
                        className="w-full border rounded px-3 py-2 pr-10"
                        type={showConfirm ? "text" : "password"}
                        placeholder="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowConfirm((s) => !s)}
                        aria-label="toggle confirm password"
                        title="แสดง/ซ่อนรหัสผ่าน"
                    >
                        <Image src={`/icons/${showConfirm ? "openEye" : "closeEye"}.png`} alt="" width={18} height={18} />
                    </button>
                </div>
                <button disabled={loading} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">
                    {loading ? "กำลังสมัคร..." : "สมัคร"}
                </button>
                <div className="text-xs text-right mt-3">
                    <Link href="/sign-in" className="text-gray-600 hover:underline">
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </form>
            <div className="absolute inset-0 bg-white/60 z-0" />
        </div>
    );
}
