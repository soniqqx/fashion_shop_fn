/**
 * components/ProductGrid.tsx
 * Grid ของ ProductCard — รับ products + categories มาแสดง
 */
"use client";
import { useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Category, Product } from "../lib/types";
import ProductCard from "./ProductCard";
import CategoryFilter from "./CategoryFilter";
interface ProductGridProps {
    products: Product[];
    categories: Category[];
}
export default function ProductGrid({ products, categories }: ProductGridProps) {
    const [activeCategory, setActiveCategory] = useState("ทั้งหมด");
    const filtered = useMemo(
        () =>
            products.filter(
                (p) =>
                    (p.isActive ?? true) &&
                    (activeCategory === "ทั้งหมด" || p.categoryId === activeCategory)
            ),
        [products, activeCategory]
    );
    return (
        <section id="catalog" className="catalog">
            {/* Section heading */}
            <div className="section-heading">
                <div>
                    <p>PRODUCTS / 2026</p>
                    <h2>เลือกชิ้นที่ใช่สำหรับคุณ</h2>
                </div>
                <button className="filter-button" aria-label="เรียงลำดับ">
                    เรียงตาม: แนะนำ <ChevronDownIcon />
                </button>
            </div>
            {/* Category filter */}
            <CategoryFilter
                categories={categories}
                active={activeCategory}
                onChange={setActiveCategory}
            />
            {/* Product cards */}
            <div className="product-grid">
                {filtered.length > 0 ? (
                    filtered.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                    ))
                ) : (
                    <p className="no-products">ไม่พบสินค้าในหมวดหมู่นี้</p>
                )}
            </div>
        </section>
    );
}