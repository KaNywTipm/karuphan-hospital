"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @next/next/no-async-client-component
export default async function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const res = await signIn("credentials", { email, password, redirect: false });
        setLoading(false);
        if (!res?.error) {
            router.push("/"); // หรือจะเด้งตาม role ก็ได้
        } else {
            alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
    }

    await signIn("credentials", {
        email, password,
        redirect: true,
        callbackUrl: "/",   // กลับหน้า root แล้ว page.tsx จะส่งต่อเข้าหน้า role ให้เอง
    });


    return (
        <div className="min-h-screen grid place-items-center bg-gray-50">
            <form onSubmit={onSubmit} className="w-[360px] bg-white p-6 rounded-2xl shadow">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">เข้าสู่บัญชีของคุณ</p>

                <label className="text-sm">อีเมล</label>
                <input className="w-full border rounded px-3 py-2 mb-3" placeholder="example@gmail.com"
                    value={email} onChange={e => setEmail(e.target.value)} />

                <label className="text-sm">รหัสผ่าน</label>
                <div className="relative mb-4">
                    <input className="w-full border rounded px-3 py-2 pr-10"
                        type={show ? "text" : "password"} placeholder="password"
                        value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                        onClick={() => setShow(s => !s)}>{show ? "🙈" : "👁️"}</button>
                </div>

                <button disabled={loading} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                <div className="flex justify-between text-xs mt-4">
                    <Link href="/sign-up" className="text-gray-600 hover:underline">สมัครสมาชิก</Link>
                    <Link href="/forgot-password" className="text-gray-600 hover:underline">ลืมรหัสผ่าน</Link>
                </div>
            </form>
        </div>
    );
}
