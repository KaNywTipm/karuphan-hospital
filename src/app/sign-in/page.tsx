"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { useEffect } from "react";
// eslint-disable-next-line @next/next/no-async-client-component
export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const router = useRouter();

    const sp = useSearchParams();

    useEffect(() => {
        const err = sp.get("error");
        if (err === "CredentialsSignin") setMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        else setMsg(null);
    }, [sp]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,   // ✅ อยู่หน้าปัจจุบัน
        });
        setLoading(false);
        if (res?.error) {
            // แสดงข้อความบนหน้าเราเอง
            setMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            return;
        }
        router.push("/"); // เด้งไป root แล้ว page.tsx/middleware จะส่งต่อเข้า role
    }


    return (
        <div className="min-h-screen grid place-items-center bg-gray-50">
            <form onSubmit={onSubmit} className="w-[360px] bg-white p-6 rounded-2xl shadow">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">เข้าสู่บัญชีของคุณ</p>

                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/mail.png" alt="email" width={18} height={18} />
                    อีเมล
                </label>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="example@gmail.com"
                    value={email} onChange={e => setEmail(e.target.value)} />

                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/key.png" alt="password" width={18} height={18} />
                    รหัสผ่าน
                </label>
                <div className="relative mb-4">
                    <input className="w-full border rounded px-3 py-2 pr-10"
                        type={show ? "text" : "password"} placeholder="password"
                        value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                        onClick={() => setShow(s => !s)}>
                        <Image src={show ? "/icons/openEye.png" : "/icons/closeEye.png"} alt="toggle" width={18} height={18} />
                    </button>
                </div>

                <button disabled={loading} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                {msg && (
                    <div className="text-red-500 text-sm mb-2 text-center">{msg}</div>
                )}

                <div className="flex justify-between text-xs mt-4">
                    <Link href="/sign-up" className="text-gray-600 hover:underline">สมัครสมาชิก</Link>
                    <Link href="/forgot-password" className="text-gray-600 hover:underline">ลืมรหัสผ่าน</Link>
                </div>
            </form>
        </div>
    );
}
