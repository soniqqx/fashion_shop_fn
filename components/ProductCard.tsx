/**
 * components/ProductCard.tsx
 * การ์ดสินค้าแต่ละชิ้น แสดงใน Product Grid
 */
"use client";
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
    const { addToCart } = useCart();
    const firstVariant = product.variants?.[0];
    return (
        <article className="product-card">
            <div className={`product-image variant-${index % 6}`}>
                <div
                    className="garment"
                    style={{ background: tone(firstVariant?.color ?? "Beige") }}
                />
                <span>{firstVariant?.color ?? ""}</span>
                <button
                    id={`add-to-cart-${product.id}`}
                    onClick={() => addToCart(product)}
                    aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
                >
                    เพิ่มลงตะกร้า <PlusIcon />
                </button>
            </div>
            <div className="product-info">
                <div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                </div>
                <strong>{money(firstVariant?.price ?? 0)}</strong>
            </div>
        </article>
    );
}
