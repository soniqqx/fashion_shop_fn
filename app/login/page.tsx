/**
 * app/login/page.tsx
 * หน้าเข้าสู่ระบบ — full-page design สำหรับร้านเสื้อผ้า atelier
 */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRightIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { saveToken, getToken } from "../../lib/auth";
export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // Redirect ถ้า login แล้ว
    useEffect(() => {
        if (getToken()) router.replace("/");
    }, [router]);
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: form.email, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message ?? "เข้าสู่ระบบไม่สำเร็จ");
            }
            // บันทึก token ลง localStorage + cookie
            saveToken(data.token ?? data.access_token ?? "");
            // Redirect ตาม role
            const role = data.admin?.role ?? data.role ?? "";
            router.replace(role === "ADMIN" ? "/admin" : "/");
        } catch (err: any) {
            setError(err.message ?? "ไม่สามารถเชื่อมต่อ API ได้");
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="login-page">
            {/* Left panel — brand */}
            <div className="login-left">
                <Link href="/" className="wordmark login-wordmark">
                    atelier<span>—</span>
                </Link>
                <div className="login-hero-text">
                    <p className="login-tagline">MEMBER ACCESS</p>
                    <h1>
                        Welcome<br />
                        back.
                    </h1>
                    <p className="login-sub">
                        สมาชิก atelier จัดการออเดอร์<br />
                        ติดตามการจัดส่ง และดูสิทธิพิเศษได้ที่นี่
                    </p>
                </div>
                {/* Decorative garment shapes */}
                <div className="login-art" aria-hidden="true">
                    <div className="login-shirt login-shirt-1" />
                    <div className="login-shirt login-shirt-2" />
                    <div className="login-shirt login-shirt-3" />
                </div>
            </div>
            {/* Right panel — form */}
            <div className="login-right">
                <div className="login-form-wrap">
                    <p className="login-caption">SIGN IN</p>
                    <h2 className="login-title">เข้าสู่ระบบ</h2>
                    <p className="login-desc">
                        ยังไม่มีบัญชี?{" "}
                        <Link href="/register" className="login-link">
                            สมัครสมาชิก
                        </Link>
                    </p>
                    <form id="login-form" className="login-form" onSubmit={handleSubmit} noValidate>
                        {/* Email */}
                        <div className="field-group">
                            <label htmlFor="login-email" className="field-label">
                                อีเมล
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                placeholder="your@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                className="login-input"
                            />
                        </div>
                        {/* Password */}
                        <div className="field-group">
                            <label htmlFor="login-password" className="field-label">
                                รหัสผ่าน
                            </label>
                            <div className="password-wrap">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    className="login-input"
                                />
                                <button
                                    type="button"
                                    className="eye-btn"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                >
                                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                                </button>
                            </div>
                            <Link href="/forgot-password" className="forgot-link">
                                ลืมรหัสผ่าน?
                            </Link>
                        </div>
                        {/* Error */}
                        {error && (
                            <div id="login-error" className="login-error" role="alert">
                                {error}
                            </div>
                        )}
                        {/* Submit */}
                        <button
                            id="login-submit-btn"
                            type="submit"
                            className="solid-button full login-submit"
                            disabled={loading}
                        >
                            {loading ? "กำลังเข้าสู่ระบบ…" : <>เข้าสู่ระบบ <ArrowRightIcon /></>}
                        </button>
                    </form>
                    <p className="login-hint">
                        ✦ บัญชีทดสอบ: <code>admin@example.com</code> / <code>123456</code>
                    </p>
                </div>
                {/* Back link */}
                <Link href="/" className="login-back">
                    ← กลับไปหน้าร้าน
                </Link>
            </div>
        </div>
    );
}
