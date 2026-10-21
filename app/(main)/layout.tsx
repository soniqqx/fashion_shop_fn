/**
 * app/(main)/layout.tsx
 * Layout สำหรับทุกหน้าที่มี Navbar (store + cart + products)
 * ไม่รวมหน้า login และ admin
 */
import Navbar from "../../components/Navbar";
import CartDrawer from "../../components/CartDrawer";
import type { ReactNode } from "react";
export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <Navbar />
            <main>{children}</main>
            <CartDrawer />
        </>
    );
}