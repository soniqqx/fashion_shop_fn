/**
 * auth.ts — Token helpers
 *
 * Token ถูกเก็บ 2 ที่:
 *  1. localStorage — ใช้ฝั่ง client (เข้าถึงง่าย, หายเมื่อ clear)
 *  2. Cookie "token" (HttpOnly=false) — ให้ Next.js API Route อ่านได้
 *     เพื่อส่งต่อให้ backend ผ่าน reverse proxy
 */
const TOKEN_KEY = "token";
/** บันทึก token ลง localStorage + cookie */
export function saveToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    // อายุ cookie 8 ชั่วโมง
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${8 * 3600}; SameSite=Lax`;
}
/** อ่าน token จาก localStorage */
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}
/** ลบ token ออกจากทั้ง localStorage และ cookie */
export function clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}