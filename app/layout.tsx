/**
 * app/layout.tsx — Root layout
 * ครอบ CartProvider ไว้ที่ root เพื่อให้ทุกหน้าใช้ cart state ร่วมกัน
 */
import type { Metadata } from "next";
import "./global.css";
import { CartProvider } from "../context/CartContext";
export const metadata: Metadata = {
    title: "atelier — essentials for every day",
    description: "ร้านเสื้อผ้า atelier คอลเลกชันเสื้อผ้าคุณภาพสำหรับทุกวัน",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="th">
            <body>
                <CartProvider>
                    {children}
                </CartProvider>
            </body>
        </html>
    );
}