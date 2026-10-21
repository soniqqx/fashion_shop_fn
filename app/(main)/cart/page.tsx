/**
 * app/(main)/cart/page.tsx
 * หน้าตะกร้าสินค้า — แสดงรายการสินค้า สรุปราคา และ checkout flow
 */
"use client";
import { useState } from "react";
import Link from "next/link";
import {
    ArrowRightIcon,
    CheckIcon,
    MinusIcon,
    PlusIcon,
    ShoppingBagIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCart } from "../../../context/CartContext";
import { money, tone } from "../../../components/ProductCard";
import { getToken } from "../../../lib/auth";
type CheckoutStage = "cart" | "address" | "payment" | "done";
export default function CartPage() {
    const { cart, cartTotal, cartCount, updateQuantity, clearCart } = useCart();
    const [stage, setStage] = useState<CheckoutStage>("cart");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const SHIPPING = 50;
    const grandTotal = cartTotal + SHIPPING;
    // ---- Checkout ----
    async function handleCheckout() {
        const token = getToken();
        if (!token) {
            setError("กรุณาเข้าสู่ระบบก่อนดำเนินการชำระเงิน");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cartItemId: cart.map((x) => x.id),
                    addressId: "",
                    shippingMethod: "STANDARD",
                }),
            });
            if (res.ok) {
                setStage("payment");
            } else {
                // Fallback: ข้ามไป payment step แบบ mock
                setStage("payment");
            }
        } catch {
            setStage("payment");
        } finally {
            setLoading(false);
        }
    }
    async function handlePay() {
        setStage("done");
        clearCart();
    }
    // ---- Stage: Done ----
    if (stage === "done") {
        return (
            <div className="cart-page">
                <div className="success-wrap">
                    <div className="success-icon">
                        <CheckIcon />
                    </div>
                    <p className="intro">ORDER CONFIRMED</p>
                    <h1>ขอบคุณสำหรับคำสั่งซื้อ</h1>
                    <p>เราได้รับรายการของคุณแล้ว และจะส่งอีเมลยืนยันในไม่ช้า</p>
                    <Link href="/" className="solid-button">
                        กลับไปหน้าร้าน
                    </Link>
                </div>
            </div>
        );
    }
    // ---- Stage: Payment ----
    if (stage === "payment") {
        return (
            <div className="cart-page">
                <div className="checkout-wrap">
                    <p className="intro">CHECKOUT / 02</p>
                    <h1>ชำระเงิน</h1>
                    <div className="payment-card">
                        <span>VISA</span>
                        <strong>•••• &nbsp;•••• &nbsp;•••• &nbsp;4242</strong>
                        <small>MOCK PAYMENT · 12/28</small>
                    </div>
                    <label className="payment-choice">
                        <input type="radio" defaultChecked name="payment" />
                        บัตรเครดิต / เดบิต{" "}
                        <span>{money(grandTotal)}</span>
                    </label>
                    <label className="payment-choice">
                        <input type="radio" name="payment" />
                        QR พร้อมเพย์ <span>เปิดหน้าจำลอง</span>
                    </label>
                    <p className="mock-note">
                        นี่คือ payment mockup — จะเชื่อมต่อ API จริงเมื่อได้ order/payment ID จาก backend
                    </p>
                    <button
                        id="confirm-pay-btn"
                        className="solid-button full"
                        onClick={handlePay}
                    >
                        ยืนยันการชำระเงิน <CheckIcon />
                    </button>
                    <button
                        className="text-button"
                        style={{ marginTop: 12, fontSize: 12 }}
                        onClick={() => setStage("address")}
                    >
                        ← ย้อนกลับ
                    </button>
                </div>
            </div>
        );
    }
    // ---- Stage: Address ----
    if (stage === "address") {
        return (
            <div className="cart-page">
                <div className="checkout-wrap">
                    <p className="intro">CHECKOUT / 01</p>
                    <h1>ข้อมูลสำหรับจัดส่ง</h1>
                    <div className="address-grid">
                        <input placeholder="ชื่อผู้รับ" defaultValue="" />
                        <input placeholder="เบอร์โทรศัพท์" defaultValue="" />
                        <input className="wide" placeholder="ที่อยู่" defaultValue="" />
                        <input placeholder="เขต / อำเภอ" defaultValue="" />
                        <input placeholder="จังหวัด" defaultValue="" />
                        <input placeholder="รหัสไปรษณีย์" defaultValue="" />
                    </div>
                    <div className="shipping">
                        <div>
                            <span>STANDARD</span>
                            <strong>จัดส่งมาตรฐาน 2–4 วัน</strong>
                        </div>
                        <b>฿{SHIPPING}</b>
                    </div>
                    {error && <div className="login-error">{error}</div>}
                    <button
                        id="go-payment-btn"
                        className="solid-button full"
                        onClick={handleCheckout}
                        disabled={loading}
                    >
                        {loading ? "กำลังดำเนินการ…" : <>ดำเนินการต่อ <ArrowRightIcon /></>}
                    </button>
                    <button
                        className="text-button"
                        style={{ marginTop: 12, fontSize: 12 }}
                        onClick={() => setStage("cart")}
                    >
                        ← ย้อนกลับสู่ตะกร้า
                    </button>
                </div>
            </div>
        );
    }
    // ---- Stage: Cart ----
    return (
        <div className="cart-page">
            <div className="cart-layout">
                {/* Left — Cart items */}
                <section className="cart-items-section">
                    <p className="intro">SHOPPING BAG</p>
                    <h1>ตะกร้าสินค้า</h1>
                    <p className="cart-count-label">{cartCount} รายการ</p>
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <ShoppingBagIcon />
                            <h2>ตะกร้ายังว่าง</h2>
                            <p>เลือกสิ่งที่คุณชอบแล้วกลับมาที่นี่</p>
                            <Link href="/products" className="solid-button">
                                ดูสินค้าทั้งหมด <ArrowRightIcon />
                            </Link>
                        </div>
                    ) : (
                        <div className="cart-lines-full">
                            {cart.map((line) => (
                                <div className="cart-line-full" key={line.id}>
                                    {/* Swatch */}
                                    <div
                                        className="cart-swatch-lg"
                                        style={{ background: tone(line.variant.color) }}
                                    />
                                    {/* Info */}
                                    <div className="cart-line-info">
                                        <h3>{line.product.name}</h3>
                                        <p>
                                            {line.variant.color} / {line.variant.size}
                                            {line.variant.sku && ` · SKU: ${line.variant.sku}`}
                                        </p>
                                        <strong className="cart-price">{money(line.variant.price)}</strong>
                                    </div>
                                    {/* Quantity + Remove */}
                                    <div className="cart-actions">
                                        <div className="quantity">
                                            <button
                                                id={`cart-dec-${line.id}`}
                                                onClick={() => updateQuantity(line.id, -1)}
                                                aria-label="ลดจำนวน"
                                            >
                                                <MinusIcon />
                                            </button>
                                            <span>{line.quantity}</span>
                                            <button
                                                id={`cart-inc-${line.id}`}
                                                onClick={() => updateQuantity(line.id, 1)}
                                                aria-label="เพิ่มจำนวน"
                                            >
                                                <PlusIcon />
                                            </button>
                                        </div>
                                        <button
                                            id={`cart-remove-${line.id}`}
                                            className="remove-btn"
                                            onClick={() => updateQuantity(line.id, -line.quantity)}
                                            aria-label={`ลบ ${line.product.name}`}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                    {/* Line subtotal */}
                                    <div className="cart-subtotal">
                                        {money(Number(line.variant.price) * line.quantity)}
                                    </div>
                                </div>
                            ))}
                            {/* Clear all */}
                            <button className="text-button clear-btn" onClick={clearCart}>
                                ล้างตะกร้าทั้งหมด <XMarkIcon />
                            </button>
                        </div>
                    )}
                </section>
                {/* Right — Order summary */}
                {cart.length > 0 && (
                    <aside className="order-summary">
                        <h2>สรุปคำสั่งซื้อ</h2>
                        <div className="summary-row">
                            <span>ราคาสินค้า ({cartCount} รายการ)</span>
                            <span>{money(cartTotal)}</span>
                        </div>
                        <div className="summary-row">
                            <span>ค่าจัดส่ง (STANDARD)</span>
                            <span>{money(SHIPPING)}</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-row summary-total">
                            <strong>ยอดรวมทั้งสิ้น</strong>
                            <strong>{money(grandTotal)}</strong>
                        </div>
                        <p className="summary-note">รวมภาษีมูลค่าเพิ่มแล้ว</p>
                        <button
                            id="proceed-checkout-btn"
                            className="solid-button full"
                            onClick={() => setStage("address")}
                        >
                            ดำเนินการต่อ <ArrowRightIcon />
                        </button>
                        <Link href="/products" className="continue-shopping">
                            ← ช้อปต่อ
                        </Link>
                    </aside>
                )}
            </div>
        </div>
    );
}