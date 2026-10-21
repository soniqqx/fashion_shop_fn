/**
 * components/Navbar.tsx
 * แถบนำทางหลักของร้าน
 */
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBagIcon, UserIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { getToken, clearToken } from "../lib/auth";
import { useState } from "react";
export default function Navbar() {
    const { cartCount, setCartOpen } = useCart();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const isLoggedIn = typeof window !== "undefined" ? Boolean(getToken()) : false;
    function handleLogout() {
        clearToken();
        router.push("/login");
    }
    return (
        <header className="topbar">
            {/* Wordmark */}
            <Link href="/" className="wordmark">
                atelier<span>—</span>
            </Link>
            {/* Desktop nav */}
            <nav className="desktop-nav">
                <Link href="/">หน้าร้าน</Link>
                <Link href="/products">สินค้าทั้งหมด</Link>
                <Link href="/cart">ตะกร้าสินค้า</Link>
            </nav>
            {/* Actions */}
            <div className="header-actions">
                {isLoggedIn ? (
                    <button className="text-button" onClick={handleLogout}>
                        ออกจากระบบ
                    </button>
                ) : (
                    <Link href="/login" className="text-button">
                        เข้าสู่ระบบ
                    </Link>
                )}
                {/* Cart icon */}
                <button
                    id="cart-toggle-btn"
                    className="bag-button"
                    onClick={() => setCartOpen(true)}
                    aria-label="เปิดตะกร้าสินค้า"
                >
                    <ShoppingBagIcon />
                    {cartCount > 0 && <span>{cartCount}</span>}
                </button>
                {/* Mobile hamburger */}
                <button
                    className="hamburger"
                    aria-label="เมนู"
                    onClick={() => setMenuOpen((o) => !o)}
                >
                    {menuOpen ? <XMarkIcon /> : <Bars3Icon />}
                </button>
            </div>
            {/* Mobile menu */}
            {menuOpen && (
                <nav className="mobile-nav">
                    <Link href="/" onClick={() => setMenuOpen(false)}>หน้าร้าน</Link>
                    <Link href="/products" onClick={() => setMenuOpen(false)}>สินค้าทั้งหมด</Link>
                    <Link href="/cart" onClick={() => setMenuOpen(false)}>ตะกร้าสินค้า</Link>
                    {isLoggedIn ? (
                        <button onClick={() => { handleLogout(); setMenuOpen(false); }}>ออกจากระบบ</button>
                    ) : (
                        <Link href="/login" onClick={() => setMenuOpen(false)}>เข้าสู่ระบบ</Link>
                    )}
                </nav>
            )}
        </header>
    );
}