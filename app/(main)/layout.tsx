/**
 * app/(main)/layout.tsx
 * Layout สำหรับทุกหน้าที่มี Navbar (store + cart + products)
 * ไม่รวมหน้า login และ admin
 */
import Navbar from "../../components/Navbar";
import CartDrawer from "../../components/CartDrawer";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
export default async function MainLayout({ children }: { children: ReactNode }) {
    // 1. อ่าน Cookies ฝั่ง Server
    const cookieStore = await cookies();
    const token = cookieStore.get('token'); // เช็กว่ามี Cookie ชื่อ 'token' ไหม

    // 2. แปลงเป็นค่า True/False ว่าล็อกอินอยู่หรือยัง
    const isLoggedIn = !!token;
    return (
        <>
            <Navbar isLoggedIn={isLoggedIn} />
            <main>{children}</main>
            <CartDrawer />
        </>
    );
}