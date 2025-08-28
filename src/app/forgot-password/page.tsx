"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import bcrypt from "bcryptjs";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    async function requestCode(e: React.FormEvent) {
        e.preventDefault();
        const r = await fetch("/api/auth/password/request", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email })
        }).then(r => r.json());
        if (r.ok) setStep(2); else alert(r.error || "ส่งรหัสไม่สำเร็จ");
    }
    async function resetPassword(e: React.FormEvent) {
        e.preventDefault();
        const r = await fetch("/api/auth/password/reset", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: code.join(""), password, confirmPassword: confirm })
        }).then(r => r.json());
        if (r.ok) { setStep(3); } else alert(r.error || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
    }

    return (
        <div className="min-h-screen grid place-items-center bg-gray-50">
            <div className="w-[420px] bg-white p-6 rounded-2xl shadow">
                <h1 className="text-xl font-bold text-center mb-2">ระบบครุภัณฑ์</h1>
                <p className="text-center text-sm text-gray-500 mb-6">ลืมรหัสผ่าน</p>

                {step === 1 && (
                    <form onSubmit={requestCode}>
                        <label className="text-sm flex items-center gap-2 mb-1">
                            <Image src="/icons/mail.png" alt="อีเมล" width={18} height={18} />
                            อีเมล
                        </label>
                        <input className="w-full border rounded px-3 py-2 mb-4" placeholder="example@mail.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                        <button className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">รีเซ็ตรหัสผ่าน</button>
                        <div className="flex justify-between text-xs mt-4">
                            <Link href="/sign-in">เข้าสู่ระบบ</Link>
                            <Link href="/sign-up">สมัครสมาชิก</Link>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                        <p className="text-xs text-gray-500 mb-3">กรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล<br />{email}</p>
                        <div className="flex gap-2 justify-center mb-4">
                            {code.map((c, i) => (
                                <input key={i} value={c} maxLength={1}
                                    onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 1); setCode(prev => { const n = [...prev]; n[i] = v; return n; }); }}
                                    className="w-10 h-10 border rounded text-center text-lg" />
                            ))}
                        </div>
                        <button onClick={() => setStep(3)} className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">ถัดไป</button>
                        <div className="text-xs text-center mt-3">
                            <button type="button" className="underline" onClick={() => setStep(1)}>ขอรหัสใหม่</button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={resetPassword}>
                        <label className="text-sm flex items-center gap-2 mb-1">
                            <Image src="/icons/key.png" alt="รหัสผ่าน" width={18} height={18} />
                            รหัสผ่าน
                        </label>
                        <input className="w-full border rounded px-3 py-2 mb-3" type="password"
                            value={password} onChange={e => setPassword(e.target.value)} />
                        <label className="text-sm flex items-center gap-2 mb-1">
                            <Image src="/icons/key.png" alt="ยืนยันรหัสผ่าน" width={18} height={18} />
                            ยืนยันรหัสผ่าน
                        </label>
                        <input className="w-full border rounded px-3 py-2 mb-5" type="password"
                            value={confirm} onChange={e => setConfirm(e.target.value)} />
                        <button className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">รีเซ็ตรหัสผ่าน</button>
                        <div className="text-xs text-right mt-3"><Link href="/sign-in">เข้าสู่ระบบ</Link></div>
                    </form>
                )}
            </div>
        </div>
    );
}
