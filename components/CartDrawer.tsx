/**
 * components/CartDrawer.tsx
 * Drawer ตะกร้าสินค้า — เลื่อนจากขวา
 */
"use client";
import { ArrowRightIcon, MinusIcon, PlusIcon, ShoppingBagIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { money, tone } from "./ProductCard";
import { useRouter } from "next/navigation";
export default function CartDrawer() {
    const { cart, cartTotal, cartOpen, setCartOpen, updateQuantity } = useCart();
    const router = useRouter();
    if (!cartOpen) return null;
    function goToCart() {
        setCartOpen(false);
        router.push("/cart");
    }
    return (
        <div className="overlay" onClick={() => setCartOpen(false)}>
            <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="ตะกร้าสินค้า">
                {/* Header */}
                <div className="drawer-top">
                    <div>
                        <p>YOUR BAG</p>
                        <h2>ตะกร้าสินค้า</h2>
                    </div>
                    <button onClick={() => setCartOpen(false)} aria-label="ปิดตะกร้า">
                        <XMarkIcon />
                    </button>
                </div>
                {cart.length > 0 ? (
                    <>
                        {/* Cart lines */}
                        <div className="cart-lines">
                            {cart.map((line) => (
                                <div className="cart-line" key={line.id}>
                                    <div className="cart-swatch" style={{ background: tone(line.variant.color) }} />
                                    <div>
                                        <h3>{line.product.name}</h3>
                                        <p>
                                            {line.variant.color} / {line.variant.size}
                                        </p>
                                        <strong>{money(line.variant.price)}</strong>
                                    </div>
                                    <div className="quantity">
                                        <button
                                            id={`qty-dec-${line.id}`}
                                            onClick={() => updateQuantity(line.id, -1)}
                                            aria-label="ลดจำนวน"
                                        >
                                            <MinusIcon />
                                        </button>
                                        <span>{line.quantity}</span>
                                        <button
                                            id={`qty-inc-${line.id}`}
                                            onClick={() => updateQuantity(line.id, 1)}
                                            aria-label="เพิ่มจำนวน"
                                        >
                                            <PlusIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Summary */}
                        <div className="summary">
                            <div>
                                <span>ยอดรวม</span>
                                <strong>{money(cartTotal)}</strong>
                            </div>
                            <p>ค่าจัดส่งจะคำนวณในขั้นตอนถัดไป</p>
                            <button id="checkout-btn" className="solid-button full" onClick={goToCart}>
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