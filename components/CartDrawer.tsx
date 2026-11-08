/**
 * components/CartDrawer.tsx
 * Drawer ตะกร้าสินค้า — เลื่อนจากขวา
 */
"use client";

import {
    ArrowRightIcon,
    MinusIcon,
    PlusIcon,
    ShoppingBagIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { money, tone } from "./ProductCard";
import { useRouter } from "next/navigation";

const FREE_SHIPPING_THRESHOLD = 500;

export default function CartDrawer() {
    const {
        cart,
        cartCount,
        cartTotal,
        cartOpen,
        setCartOpen,
        cartLoading,
        updatingItemId,
        cartError,
        clearCartError,
        updateQuantity,
        removeItem,
    } = useCart();
    const router = useRouter();

    if (!cartOpen) return null;

    function goToCart() {
        setCartOpen(false);
        router.push("/cart");
    }

    const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);

    return (
        <div className="overlay" onClick={() => setCartOpen(false)}>
            <aside
                className="drawer"
                onClick={(e) => e.stopPropagation()}
                aria-label="ตะกร้าสินค้า"
            >
                {/* Header */}
                <div className="drawer-top">
                    <div>
                        <p>YOUR BAG · {cartCount} ITEMS</p>
                        <h2>ตะกร้าสินค้า</h2>
                    </div>
                    <button onClick={() => setCartOpen(false)} aria-label="ปิดตะกร้า">
                        <XMarkIcon />
                    </button>
                </div>

                {cartError && (
                    <div className="cart-alert" role="alert">
                        <span>{cartError}</span>
                        <button onClick={clearCartError} aria-label="ปิดข้อความแจ้งเตือน">
                            <XMarkIcon />
                        </button>
                    </div>
                )}

                {cartLoading && cart.length === 0 ? (
                    <div className="empty">
                        <p>กำลังโหลดรายการในตะกร้า…</p>
                    </div>
                ) : cart.length > 0 ? (
                    <>
                        <div className="drawer-shipping-banner">
                            {remainingForFreeShipping === 0 ? (
                                <span>คุณได้รับสิทธิ์จัดส่งฟรี (STANDARD)</span>
                            ) : (
                                <span>
                                    ช้อปเพิ่มอีก <strong>{money(remainingForFreeShipping)}</strong>{" "}
                                    เพื่อรับสิทธิ์ส่งฟรี (STANDARD)
                                </span>
                            )}
                        </div>

                        {/* Cart lines */}
                        <div className="cart-lines">
                            {cart.map((line) => {
                                const isUpdating = updatingItemId === line.id;
                                return (
                                    <div className="cart-line" key={line.id}>
                                        <div
                                            className="cart-swatch"
                                            style={{ background: tone(line.variant.color) }}
                                        />
                                        <div>
                                            <h3>{line.product.name}</h3>
                                            <p>
                                                {line.variant.color} / {line.variant.size}
                                                {line.variant.sku ? ` · ${line.variant.sku}` : ""}
                                            </p>
                                            <strong>
                                                {money(line.variant.price)} × {line.quantity}{" "}
                                                {line.variant.unit ?? "ตัว"}
                                            </strong>
                                        </div>
                                        <div className="drawer-line-actions">
                                            <button
                                                className="drawer-remove-btn"
                                                onClick={() => void removeItem(line.id)}
                                                disabled={isUpdating}
                                                aria-label={`ลบ ${line.product.name}`}
                                                title="ลบรายการนี้"
                                            >
                                                <TrashIcon />
                                            </button>
                                            <div className="quantity">
                                                <button
                                                    id={`qty-dec-${line.id}`}
                                                    onClick={() => void updateQuantity(line.id, -1)}
                                                    disabled={isUpdating}
                                                    aria-label="ลดจำนวน"
                                                >
                                                    <MinusIcon />
                                                </button>
                                                <span>{line.quantity}</span>
                                                <button
                                                    id={`qty-inc-${line.id}`}
                                                    onClick={() => void updateQuantity(line.id, 1)}
                                                    disabled={isUpdating}
                                                    aria-label="เพิ่มจำนวน"
                                                >
                                                    <PlusIcon />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary */}
                        <div className="summary">
                            <div>
                                <span>ยอดรวมสินค้า ({cartCount} ชิ้น)</span>
                                <strong>{money(cartTotal)}</strong>
                            </div>
                            <p>
                                ค่าจัดส่ง STANDARD:{" "}
                                {cartTotal >= FREE_SHIPPING_THRESHOLD ? "ฟรี (฿0)" : "฿40"} ·
                                EXPRESS: ฿100
                            </p>
                            <button
                                id="checkout-btn"
                                className="solid-button full"
                                onClick={goToCart}
                            >
                                ดูตะกร้าและชำระเงิน <ArrowRightIcon />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empty">
                        <ShoppingBagIcon />
                        <h3>ตะกร้ายังว่าง</h3>
                        <p>เลือกสิ่งที่คุณชอบ แล้วกลับมาที่นี่</p>
                    </div>
                )}
            </aside>
        </div>
    );
}
