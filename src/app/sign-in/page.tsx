"use client";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

export const dynamic = "force-dynamic";

function SignInInner() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const router = useRouter();
    const sp = useSearchParams();

    useEffect(() => {
        const err = sp.get("error");
        setMsg(err === "CredentialsSignin" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : null);
    }, [sp]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMsg(null);
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false, // ควบคุมเอง
        });
        setLoading(false);

        if (!res || res.error) {
            setMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            return;
        }
        router.replace("/"); // สำเร็จ → เด้งออกแน่นอน
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cover bg-center">
            <form onSubmit={onSubmit} className="w-[360px] bg-white/90 p-6 rounded-2xl shadow relative z-10">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">เข้าสู่บัญชีของคุณ</p>

                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/mail.png" alt="email" width={18} height={18} />
                    อีเมล
                </label>
                <input className="w-full border rounded px-3 py-2 mb-3"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} />

                <label className="text-sm flex items-center gap-2 mb-1">
                    <Image src="/icons/key.png" alt="password" width={18} height={18} />
                    รหัสผ่าน
                </label>
                <div className="relative mb-4">
                    <input className="w-full border rounded px-3 py-2 pr-10"
                        placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShow((s) => !s)}>
                        <Image src={show ? "/icons/openEye.png" : "/icons/closeEye.png"} alt="toggle" width={18} height={18} />
                    </button>
                </div>

                <button disabled={loading} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>

                {msg && <div className="text-red-500 text-sm mt-2 text-center">{msg}</div>}

                <div className="flex justify-between text-xs mt-4">
                    <Link href="/sign-up" className="text-gray-600 hover:underline">สมัครสมาชิก</Link>
                    <Link href="/forgot-password" className="text-gray-600 hover:underline">ลืมรหัสผ่าน</Link>
                </div>
            </form>
            <div className="absolute inset-0 bg-white/60 z-0" />
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>}>
            <SignInInner />
        </Suspense>
    );
}
