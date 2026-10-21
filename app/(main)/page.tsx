/**
 * app/(main)/page.tsx — หน้าแรก (store front)
 * Refactored: ใช้ components แยกส่วน + CartContext
 */
"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import ProductGrid from "../../components/ProductGrid";
import { Product, Category } from "../../lib/types";
const API = "/api"; // ผ่าน reverse proxy เสมอ
const sampleProducts: Product[] = [
  { id: "tee", name: "Basic Cotton T-Shirt", description: "เสื้อยืด Cotton พื้นฐาน ใส่ได้ทุกวัน", categoryId: "t-shirt", isActive: true, variants: [{ id: "tee-black", price: 390, color: "Black", size: "M" }, { id: "tee-white", price: 390, color: "White", size: "M" }] },
  { id: "oversize", name: "Oversize T-Shirt", description: "ทรงสบายสำหรับวันธรรมดา", categoryId: "t-shirt", isActive: true, variants: [{ id: "oversize-navy", price: 490, color: "Navy", size: "L" }] },
  { id: "oxford", name: "Casual Oxford Shirt", description: "เสื้อเชิ้ต Oxford สำหรับทุกวัน", categoryId: "shirt", isActive: true, variants: [{ id: "oxford-blue", price: 690, color: "Blue", size: "L" }] },
  { id: "hoodie", name: "Basic Hoodie", description: "เนื้อผ้านุ่ม ให้ความอบอุ่นพอดี", categoryId: "hoodie", isActive: true, variants: [{ id: "hoodie-gray", price: 890, color: "Gray", size: "M" }] },
  { id: "pants", name: "Straight Fit Pants", description: "ทรงตรงที่เข้ากับทุกลุค", categoryId: "pants", isActive: true, variants: [{ id: "pants-beige", price: 790, color: "Beige", size: "M" }] },
  { id: "cap", name: "Minimal Cotton Cap", description: "หมวก Cotton ดีไซน์สะอาดตา", categoryId: "accessories", isActive: true, variants: [{ id: "cap-black", price: 290, color: "Black", size: "One Size" }] },
];
const sampleCategories: Category[] = [
  { id: "t-shirt", nameTh: "เสื้อยืด", nameEn: "T-Shirt", isActive: true },
  { id: "shirt", nameTh: "เสื้อเชิ้ต", nameEn: "Shirt", isActive: true },
  { id: "hoodie", nameTh: "เสื้อฮู้ด", nameEn: "Hoodie", isActive: true },
  { id: "pants", nameTh: "กางเกง", nameEn: "Pants", isActive: true },
  { id: "accessories", nameTh: "แอคเซสเซอรี่", nameEn: "Accessories", isActive: true },
];
export default function Home() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [categories, setCategories] = useState<Category[]>(sampleCategories);
  const [notice, setNotice] = useState("กำลังแสดง catalog ตัวอย่าง หาก backend ทำงาน ระบบจะอ่านข้อมูลจริงอัตโนมัติ");
  useEffect(() => {
    async function loadCatalog() {
      try {
        const [p, c] = await Promise.all([
          fetch(`${API}/product/find-all`),
          fetch(`${API}/category/find-all`),
        ]);
        if (!p.ok || !c.ok) throw new Error();
        setProducts(await p.json());
        setCategories(await c.json());
        setNotice("เชื่อมต่อ catalog จาก backend แล้ว");
      } catch {
        /* ใช้ sample data ต่อไป */
      }
    }
    void loadCatalog();
  }, []);
  return (
    <>
      {/* API status bar */}
      <div className="api-note">
        <span className="live-dot" />
        {notice}
      </div>
      {/* Hero */}
      <section className="store-hero">
        <div>
          <p className="intro">คอลเลกชันประจำวัน</p>
          <h1>
            Essentials,<br />made considered.
          </h1>
          <p>เสื้อผ้าที่เรียบง่าย ใช้ได้จริง และอยู่กับคุณได้นาน</p>
          <button
            id="hero-scroll-btn"
            className="solid-button"
            onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
          >
            เลือกดูสินค้า <ArrowRightIcon />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hanger" />
          <div className="hero-shirt" />
          <span>ATELIER<br />OBJECT 01</span>
        </div>
      </section>
      {/* Product grid */}
      <ProductGrid products={products} categories={categories} />
    </>
  );
}
