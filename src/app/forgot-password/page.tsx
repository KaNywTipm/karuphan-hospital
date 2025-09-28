"use client";
import Image from "next/image";
import { useState, useRef } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    async function requestCode(e: React.FormEvent) {
        e.preventDefault();
        const r = await fetch("/api/auth/password/request", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email })
        }).then(r => r.json());
        if (r.ok) setStep(2); else alert(r.error || "ไม่สามารถส่งรหัสยืนยันได้ กรุณาลองใหม่อีกครั้ง");
    }
    async function resetPassword(e: React.FormEvent) {
        e.preventDefault();
        const r = await fetch("/api/auth/password/reset", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: code.join(""), password, confirmPassword: confirm })
        }).then(r => r.json());
        if (r.ok) { setStep(3); } else alert(r.error || "ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cover bg-center">
            <div className="w-[420px] bg-white/90 p-6 rounded-2xl shadow relative z-10">
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
                    <form onSubmit={resetPassword}>
                        <p className="text-xs text-gray-500 mb-3">กรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล<br />{email}</p>
                        <div className="flex gap-2 justify-center mb-4">
                            {code.map((c, i) => (
                                <input
                                    key={i}
                                    ref={el => { otpInputRefs.current[i] = el; }}
                                    value={c}
                                    maxLength={1}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, "").slice(0, 1);
                                        setCode(prev => {
                                            const n = [...prev];
                                            n[i] = v;
                                            return n;
                                        });

                                        // เลื่อนไปช่องถัดไปเมื่อกรอกเลข
                                        if (v && i < 5) {
                                            otpInputRefs.current[i + 1]?.focus();
                                        }
                                    }}
                                    onKeyDown={e => {
                                        // หาก backspace และช่องปัจจุบันว่าง ให้เลื่อนกลับไปช่องก่อนหน้า
                                        if (e.key === 'Backspace' && !code[i] && i > 0) {
                                            otpInputRefs.current[i - 1]?.focus();
                                        }
                                        // หาก backspace และมีข้อมูลในช่อง ให้ลบข้อมูลแล้วอยู่ช่องเดิม
                                        else if (e.key === 'Backspace' && code[i]) {
                                            setCode(prev => {
                                                const n = [...prev];
                                                n[i] = '';
                                                return n;
                                            });
                                        }
                                        // รองรับปุ่มลูกศรซ้าย-ขวา
                                        else if (e.key === 'ArrowLeft' && i > 0) {
                                            otpInputRefs.current[i - 1]?.focus();
                                        }
                                        else if (e.key === 'ArrowRight' && i < 5) {
                                            otpInputRefs.current[i + 1]?.focus();
                                        }
                                    }}
                                    onPaste={e => {
                                        e.preventDefault();
                                        const pastedData = e.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6);
                                        if (pastedData) {
                                            setCode(prev => {
                                                const newCode = [...prev];
                                                for (let j = 0; j < Math.min(pastedData.length, 6); j++) {
                                                    newCode[j] = pastedData[j] || '';
                                                }
                                                return newCode;
                                            });

                                            // เลื่อน focus ไปช่องสุดท้ายที่มีข้อมูล หรือช่องถัดไป
                                            const nextIndex = Math.min(pastedData.length, 5);
                                            otpInputRefs.current[nextIndex]?.focus();
                                        }
                                    }}
                                    onFocus={e => {
                                        // เลือกข้อความทั้งหมดเมื่อ focus
                                        e.target.select();
                                    }}
                                    className="w-10 h-10 border rounded text-center text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            ))}
                        </div>

                        <label className="text-sm flex items-center gap-2 mb-1">
                            <Image src="/icons/key.png" alt="รหัสผ่าน" width={18} height={18} />
                            รหัสผ่านใหม่
                        </label>
                        <div className="relative mb-3">
                            <input className="w-full border rounded px-3 py-2 pr-10" type={showPassword ? "text" : "password"}
                                value={password} onChange={e => setPassword(e.target.value)} />
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2"
                                onClick={() => setShowPassword(s => !s)}>
                                <Image src={showPassword ? "/icons/openEye.png" : "/icons/closeEye.png"} alt="toggle" width={18} height={18} />
                            </button>
                        </div>
                        <label className="text-sm flex items-center gap-2 mb-1">
                            <Image src="/icons/key.png" alt="ยืนยันรหัสผ่าน" width={18} height={18} />
                            ยืนยันรหัสผ่าน
                        </label>
                        <div className="relative mb-5">
                            <input className="w-full border rounded px-3 py-2 pr-10" type={showConfirm ? "text" : "password"}
                                value={confirm} onChange={e => setConfirm(e.target.value)} />
                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2"
                                onClick={() => setShowConfirm(s => !s)}>
                                <Image src={showConfirm ? "/icons/openEye.png" : "/icons/closeEye.png"} alt="toggle" width={18} height={18} />
                            </button>
                        </div>

                        <button type="submit" className="w-full bg-gray-200 hover:bg-gray-300 rounded py-2">รีเซ็ตรหัสผ่าน</button>
                        <div className="text-xs text-center mt-3">
                            <button type="button" className="underline" onClick={() => setStep(1)}>ขอรหัสใหม่</button>
                        </div>
                    </form>
                )}
                {step === 3 && (
                    <div className="text-center">
                        <div className="mb-4">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">รีเซ็ตรหัสผ่านสำเร็จ</h3>
                        <p className="text-sm text-gray-600 mb-6">รหัสผ่านของคุณได้ถูกเปลี่ยนแปลงแล้ว</p>
                        <Link href="/sign-in" className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 text-center">
                            เข้าสู่ระบบ
                        </Link>
                    </div>
                )}
            </div>
            <div className="absolute inset-0 bg-white/60 z-0" />
        </div>
    );
}
