/**
 * app/(main)/products/page.tsx
 * หน้ารายการสินค้าทั้งหมด
 */
"use client";
import { useEffect, useState } from "react";
import ProductGrid from "../../../components/ProductGrid";
import CartDrawer from "../../../components/CartDrawer";
import { Product, Category } from "../../../lib/types";
const SAMPLE_PRODUCTS: Product[] = [
    {
        id: "tee",
        name: "Basic Cotton T-Shirt",
        description: "เสื้อยืด Cotton พื้นฐาน ใส่ได้ทุกวัน",
        categoryId: "t-shirt",
        variants: [
            { id: "tee-black", price: 390, color: "Black", size: "M" },
            { id: "tee-white", price: 390, color: "White", size: "M" },
        ],
    },
    {
        id: "oversize",
        name: "Oversize T-Shirt",
        description: "ทรงสบายสำหรับวันธรรมดา",
        categoryId: "t-shirt",
        variants: [{ id: "oversize-navy", price: 490, color: "Navy", size: "L" }],
    },
    {
        id: "oxford",
        name: "Casual Oxford Shirt",
        description: "เสื้อเชิ้ต Oxford สำหรับทุกวัน",
        categoryId: "shirt",
        variants: [{ id: "oxford-blue", price: 690, color: "Blue", size: "L" }],
    },
    {
        id: "hoodie",
        name: "Basic Hoodie",
        description: "เนื้อผ้านุ่ม ให้ความอบอุ่นพอดี",
        categoryId: "hoodie",
        variants: [{ id: "hoodie-gray", price: 890, color: "Gray", size: "M" }],
    },
    {
        id: "pants",
        name: "Straight Fit Pants",
        description: "ทรงตรงที่เข้ากับทุกลุค",
        categoryId: "pants",
        variants: [{ id: "pants-beige", price: 790, color: "Beige", size: "M" }],
    },
    {
        id: "cap",
        name: "Minimal Cotton Cap",
        description: "หมวก Cotton ดีไซน์สะอาดตา",
        categoryId: "accessories",
        variants: [{ id: "cap-black", price: 290, color: "Black", size: "One Size" }],
    },
];
const SAMPLE_CATEGORIES: Category[] = [
    { id: "t-shirt", nameTh: "เสื้อยืด", nameEn: "T-Shirt", isActive: true },
    { id: "shirt", nameTh: "เสื้อเชิ้ต", nameEn: "Shirt", isActive: true },
    { id: "hoodie", nameTh: "เสื้อฮู้ด", nameEn: "Hoodie", isActive: true },
    { id: "pants", nameTh: "กางเกง", nameEn: "Pants", isActive: true },
    { id: "accessories", nameTh: "แอคเซสเซอรี่", nameEn: "Accessories", isActive: true },
];
export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
    const [categories, setCategories] = useState<Category[]>(SAMPLE_CATEGORIES);
    const [status, setStatus] = useState("กำลังโหลดสินค้า…");
    useEffect(() => {
        async function load() {
            try {
                const [pr, cr] = await Promise.all([
                    fetch("/api/product/find-all"),
                    fetch("/api/category/find-all"),
                ]);
                if (!pr.ok || !cr.ok) throw new Error("API ยังไม่พร้อม");
                const liveProducts = (await pr.json()) as Product[];
                const liveCategories = (await cr.json()) as Category[];
                setProducts(liveProducts);
                setCategories(liveCategories);
                setStatus(`โหลดสินค้าจาก backend แล้ว (${liveProducts.length} รายการ)`);
            } catch {
                setStatus("แสดงข้อมูลตัวอย่าง — backend ยังไม่ได้เชื่อมต่อ");
            }
        }
        void load();
    }, []);
    return (
        <>
            {/* Status bar */}
            <div className="api-note">
                <span className="live-dot" />
                {status}
            </div>
            {/* Hero banner */}
            <section className="products-hero">
                <div>
                    <p className="intro">CATALOGUE / 2026</p>
                    <h1>สินค้าทั้งหมด</h1>
                    <p>คอลเลกชันเสื้อผ้าที่คัดสรรมาเพื่อทุกวันของคุณ</p>
                </div>
            </section>
            {/* Product grid + filter */}
            <ProductGrid products={products} categories={categories} />
            {/* Cart drawer */}
            <CartDrawer />
        </>
    );
}