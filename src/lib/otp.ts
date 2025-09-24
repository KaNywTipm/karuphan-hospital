import bcrypt from "bcryptjs";

export function generateOtp(len = 6) {
    const digits = "0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += digits[Math.floor(Math.random() * digits.length)];
    return s;
}

export async function hashOtp(otp: string) {
    return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string) {
    return bcrypt.compare(otp, hash);
}
