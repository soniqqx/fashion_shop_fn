/**
 * components/ProductCard.tsx
 * การ์ดสินค้าแต่ละชิ้น แสดงใน Product Grid พร้อมตัวเลือก Variant (สี/ไซส์) เพื่อเพิ่มลงตะกร้า
 */
"use client";

import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Product } from "../lib/types";
import { useCart } from "../context/CartContext";

/** แปลงตัวเลขเป็นสกุลเงินบาท */
export const money = (v: number | string) =>
    new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(Number(v));

/** คืน hex ของสีผ้าสำหรับ swatch */
export const tone = (color: string) =>
({
    Black: "#23262c",
    White: "#f7f4ec",
    Navy: "#324362",
    Gray: "#a9afb6",
    Blue: "#7697c4",
    Beige: "#c7b394",
    Green: "#4a7c59",
    Red: "#a03a3a",
    Brown: "#7a5c40",
    Pink: "#d6929b",
    Yellow: "#d4b64a",
    Purple: "#7a5fa0",
}[color] ?? "#d0c4b7");

interface ProductCardProps {
    product: Product;
    index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
    const { addToCart, updatingItemId } = useCart();
    const activeVariants = product.variants ?? [];
    const [selectedIdx, setSelectedIdx] = useState(0);
    const selectedVariant = activeVariants[selectedIdx] ?? activeVariants[0];
    const isAdding = selectedVariant && updatingItemId === selectedVariant.id;

    return (
        <article className="product-card">
            <div className={`product-image variant-${index % 6}`}>
                <div
                    className="garment"
                    style={{ background: tone(selectedVariant?.color ?? "Beige") }}
                />
                <span>
                    {selectedVariant
                        ? `${selectedVariant.color} · ${selectedVariant.size}`
                        : "NO VARIANT"}
                </span>
                <button
                    id={`add-to-cart-${product.id}`}
                    onClick={() => void addToCart(product, selectedVariant, 1)}
                    disabled={!selectedVariant || Boolean(isAdding)}
                    aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
                >
                    {isAdding ? "กำลังเพิ่ม…" : "เพิ่มลงตะกร้า"} <PlusIcon />
                </button>
            </div>
            <div className="product-info">
                <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    {activeVariants.length > 1 && (
                        <div className="variant-pills" aria-label="เลือกสีและขนาด">
                            {activeVariants.map((v, idx) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    className={`variant-pill ${idx === selectedIdx ? "active" : ""
                                        }`}
                                    onClick={() => setSelectedIdx(idx)}
                                >
                                    <i style={{ background: tone(v.color) }} />
                                    {v.color} / {v.size}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <strong>{money(selectedVariant?.price ?? 0)}</strong>
            </div>
        </article>
    );
}
