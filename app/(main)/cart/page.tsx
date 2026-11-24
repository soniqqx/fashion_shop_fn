/**
 * app/(main)/cart/page.tsx
 * หน้าตะกร้าสินค้าฝั่ง User
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRightIcon,
    InformationCircleIcon,
    MapPinIcon,
    MinusIcon,
    PlusIcon,
    ShoppingBagIcon,
    TrashIcon,
    TruckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { isUuid, useCart } from "../../../context/CartContext";
import { money, tone } from "../../../components/ProductCard";
import { getToken } from "../../../lib/auth";
import {
    CartItemResponse,
    CartLine,
    ShippingMethod,
} from "../../../lib/types";

const FREE_SHIPPING_THRESHOLD = 500;

function isLineUnavailable(line: CartLine): boolean {
    return (
        line.product.isActive === false ||
        line.variant.isActive === false ||
        line.variant.inventory?.quantity == 0
    );
}

function calculateShippingFee(method: ShippingMethod, subtotal: number): number {
    if (subtotal <= 0) return 0;
    if (method === "EXPRESS") return 100;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 40;
}

export default function CartPage() {
    const router = useRouter();
    const {
        cart,
        cartCount,
        cartLoading,
        updatingItemId,
        cartError,
        clearCartError,
        refreshCart,
        updateQuantity,
        setItemQuantity,
        removeItem,
        getCartItemById,
        clearCart,
    } = useCart();

    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("STANDARD");

    // รายการ cartItem.id ที่ติ๊กเลือกสำหรับนำไปสั่งซื้อ
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal ดูรายละเอียดสินค้า
    const [detailItem, setDetailItem] = useState<CartItemResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [error, setError] = useState("");

    useEffect(() => {
        void refreshCart();
    }, [refreshCart]);

    useEffect(() => {
        setSelectedIds((prev) => {
            const validIds = cart
                .filter((line) => !isLineUnavailable(line))
                .map((line) => line.id);
            if (prev.length === 0) return validIds;
            const filtered = prev.filter((id) => validIds.includes(id));
            return filtered.length > 0 ? filtered : validIds;
        });
    }, [cart]);

    const availableLines = useMemo(
        () => cart.filter((line) => !isLineUnavailable(line)),
        [cart]
    );

    const selectedLines = useMemo(
        () => availableLines.filter((line) => selectedIds.includes(line.id)),
        [availableLines, selectedIds]
    );

    const selectedItemCount = useMemo(
        () => selectedLines.reduce((sum, line) => sum + line.quantity, 0),
        [selectedLines]
    );

    const selectedSubtotal = useMemo(
        () =>
            selectedLines.reduce(
                (sum, line) => sum + Number(line.variant.price) * line.quantity,
                0
            ),
        [selectedLines]
    );

    const shippingFee = useMemo(
        () => calculateShippingFee(shippingMethod, selectedSubtotal),
        [shippingMethod, selectedSubtotal]
    );

    const grandTotal = selectedSubtotal + shippingFee;
    const allSelected =
        availableLines.length > 0 &&
        availableLines.every((line) => selectedIds.includes(line.id));

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(availableLines.map((line) => line.id));
        }
    }

    function toggleSelectItem(id: string) {
        const targetLine = cart.find((line) => line.id === id);
        if (!targetLine || isLineUnavailable(targetLine)) return;
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    }

    async function handleInspectItem(itemId: string) {
        if (!isUuid(itemId)) {
            const localLine = cart.find((l) => l.id === itemId);
            if (!localLine) return;
            setDetailItem({
                id: localLine.id,
                cartId: localLine.cartId ?? "local-cart",
                variantId: localLine.variant.id,
                quantity: localLine.quantity,
                variant: {
                    ...localLine.variant,
                    product: {
                        name: localLine.product.name,
                        description: localLine.product.description,
                        isActive: localLine.product.isActive ?? true,
                    },
                },
            });
            return;
        }

        setDetailLoading(true);
        const detail = await getCartItemById(itemId);
        setDetailLoading(false);
        if (detail) {
            setDetailItem(detail);
        }
    }

    function handleProceedToCheckout() {
        setError("");
        clearCartError();
        if (selectedLines.length === 0) {
            setError("กรุณาเลือกสินค้าอย่างน้อย 1 รายการเพื่อดำเนินการสั่งซื้อ");
            return;
        }
        if (!getToken()) {
            setError("กรุณาเข้าสู่ระบบก่อนดำเนินการสั่งซื้อ");
            return;
        }
        const params = new URLSearchParams({
            items: selectedLines.map((l) => l.id).join(","),
            shipping: shippingMethod,
        });
        router.push(`/checkout?${params.toString()}`);
    }

    const remainingForFreeShipping = Math.max(
        0,
        FREE_SHIPPING_THRESHOLD - selectedSubtotal
    );

    return (
        <div className="cart-page">
            <div className="cart-layout">
                {/* Left — Cart items */}
                <section className="cart-items-section">
                    <div className="cart-header-row">
                        <div>
                            <p className="intro">SHOPPING BAG</p>
                            <h1>ตะกร้าสินค้า</h1>
                            <p className="cart-count-label">
                                ทั้งหมด {cart.length} รายการ ({cartCount} ชิ้น) · เลือกแล้ว{" "}
                                {selectedLines.length} รายการ ({selectedItemCount} ชิ้น)
                            </p>
                        </div>

                        {cart.length > 0 && (
                            <label className="select-all-toggle">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    disabled={availableLines.length === 0}
                                    onChange={toggleSelectAll}
                                />
                                <span>เลือกทั้งหมด ({availableLines.length})</span>
                            </label>
                        )}
                    </div>

                    {(cartError || error) && (
                        <div className="cart-alert" role="alert">
                            <span>{cartError || error}</span>
                            <button
                                onClick={() => {
                                    clearCartError();
                                    setError("");
                                }}
                                aria-label="ปิดแจ้งเตือน"
                            >
                                <XMarkIcon />
                            </button>
                        </div>
                    )}

                    {cartLoading && cart.length === 0 ? (
                        <div className="cart-empty">
                            <p>กำลังโหลดรายการสินค้าในตะกร้า…</p>
                        </div>
                    ) : cart.length === 0 ? (
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
                            {cart.map((line) => {
                                const isUpdating = updatingItemId === line.id;
                                const isUnavailable = isLineUnavailable(line);
                                const isSelected = !isUnavailable && selectedIds.includes(line.id);

                                return (
                                    <div
                                        className={`cart-line-full ${isSelected ? "is-selected" : ""
                                            } ${isUnavailable ? "is-unavailable" : ""}`}
                                        key={line.id}
                                    >
                                        <div className="cart-check-col">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isUnavailable}
                                                onChange={() => toggleSelectItem(line.id)}
                                                aria-label={`เลือก ${line.product.name}`}
                                            />
                                        </div>

                                        <div
                                            className="cart-swatch-lg"
                                            style={{ background: tone(line.variant.color) }}
                                        >
                                            <span>{line.variant.size}</span>
                                        </div>

                                        <div className="cart-line-info">
                                            <div className="cart-line-title-row">
                                                <h3>{line.product.name}</h3>
                                                {isUnavailable && (
                                                    <span className="unavailable-badge">
                                                        สินค้าไม่พร้อมจำหน่าย
                                                    </span>
                                                )}
                                            </div>
                                            <p>
                                                สี: <strong>{line.variant.color}</strong> · ไซส์:{" "}
                                                <strong>{line.variant.size}</strong>
                                                {line.variant.sku && ` · SKU: ${line.variant.sku}`}
                                            </p>
                                            <div className="cart-line-meta">
                                                <strong className="cart-price">
                                                    {money(line.variant.price)} /{" "}
                                                    {line.variant.unit ?? "ตัว"}
                                                </strong>
                                                <button
                                                    type="button"
                                                    className="inspect-item-btn"
                                                    onClick={() => void handleInspectItem(line.id)}
                                                    disabled={detailLoading || isUnavailable}
                                                >
                                                    <InformationCircleIcon />
                                                    ดูรายละเอียด
                                                </button>
                                            </div>
                                        </div>

                                        <div className="cart-actions">
                                            <div className="quantity">
                                                <button
                                                    id={`cart-dec-${line.id}`}
                                                    onClick={() => {
                                                        if (isUnavailable) return;
                                                        void updateQuantity(line.id, -1);
                                                    }}
                                                    disabled={isUpdating || isUnavailable}
                                                    aria-label="ลดจำนวน"
                                                >
                                                    <MinusIcon />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="qty-input"
                                                    value={line.quantity}
                                                    disabled={isUpdating || isUnavailable}
                                                    readOnly={isUnavailable}
                                                    onChange={(e) => {
                                                        if (isUnavailable) return;
                                                        const val = parseInt(e.target.value, 10);
                                                        if (!Number.isNaN(val) && val >= 1) {
                                                            void setItemQuantity(line.id, val);
                                                        }
                                                    }}
                                                    aria-label="จำนวนสินค้า"
                                                />
                                                <button
                                                    id={`cart-inc-${line.id}`}
                                                    onClick={() => {
                                                        if (isUnavailable) return;
                                                        void updateQuantity(line.id, 1);
                                                    }}
                                                    disabled={isUpdating || isUnavailable}
                                                    aria-label="เพิ่มจำนวน"
                                                >
                                                    <PlusIcon />
                                                </button>
                                            </div>
                                            <button
                                                id={`cart-remove-${line.id}`}
                                                className="remove-btn"
                                                onClick={() => void removeItem(line.id)}
                                                disabled={isUpdating}
                                                aria-label={`ลบ ${line.product.name}`}
                                            >
                                                <TrashIcon />
                                                <span>ลบ</span>
                                            </button>
                                        </div>

                                        <div className="cart-subtotal">
                                            {money(Number(line.variant.price) * line.quantity)}
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="cart-footer-actions">
                                <Link href="/products" className="text-button">
                                    ← เลือกซื้อสินค้าเพิ่มเติม
                                </Link>
                                <button
                                    className="text-button clear-btn"
                                    onClick={() => void clearCart()}
                                    disabled={cartLoading}
                                >
                                    ล้างตะกร้าทั้งหมด <XMarkIcon />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Right — Order summary */}
                {cart.length > 0 && (
                    <aside className="order-summary">
                        <h2>สรุปคำสั่งซื้อ</h2>

                        <div className="free-shipping-box">
                            <div className="free-shipping-head">
                                <TruckIcon />
                                {remainingForFreeShipping === 0 && selectedSubtotal > 0 ? (
                                    <span>คุณได้รับสิทธิ์ส่งฟรีแบบ STANDARD!</span>
                                ) : (
                                    <span>
                                        ซื้อเพิ่มอีก{" "}
                                        <strong>{money(remainingForFreeShipping)}</strong> ส่งฟรี
                                        STANDARD
                                    </span>
                                )}
                            </div>
                            <div className="free-shipping-bar">
                                <div
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (selectedSubtotal / FREE_SHIPPING_THRESHOLD) * 100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="summary-shipping-selector">
                            <p className="field-label">รูปแบบการจัดส่ง</p>
                            <label className="summary-radio">
                                <input
                                    type="radio"
                                    name="summaryShipping"
                                    checked={shippingMethod === "STANDARD"}
                                    onChange={() => setShippingMethod("STANDARD")}
                                />
                                <span>STANDARD (2–4 วัน)</span>
                                <strong>
                                    {selectedSubtotal >= FREE_SHIPPING_THRESHOLD &&
                                        selectedSubtotal > 0
                                        ? "ฟรี"
                                        : "฿40"}
                                </strong>
                            </label>
                            <label className="summary-radio">
                                <input
                                    type="radio"
                                    name="summaryShipping"
                                    checked={shippingMethod === "EXPRESS"}
                                    onChange={() => setShippingMethod("EXPRESS")}
                                />
                                <span>EXPRESS ด่วน (1–2 วัน)</span>
                                <strong>{selectedSubtotal > 0 ? "฿100" : "฿0"}</strong>
                            </label>
                        </div>

                        <div className="summary-divider" />

                        <div className="summary-row">
                            <span>
                                ราคาสินค้าที่เลือก ({selectedLines.length} รายการ,{" "}
                                {selectedItemCount} ชิ้น)
                            </span>
                            <span>{money(selectedSubtotal)}</span>
                        </div>
                        <div className="summary-row">
                            <span>ค่าจัดส่ง ({shippingMethod})</span>
                            <span>
                                {selectedSubtotal === 0
                                    ? "฿0"
                                    : shippingFee === 0
                                        ? "ฟรี (฿0)"
                                        : money(shippingFee)}
                            </span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-row summary-total">
                            <strong>ยอดรวมทั้งสิ้น</strong>
                            <strong>{money(grandTotal)}</strong>
                        </div>
                        <p className="summary-note">รวมภาษีมูลค่าเพิ่มแล้ว</p>

                        {!getToken() && (
                            <div className="guest-checkout-notice">
                                <MapPinIcon />
                                <div>
                                    <strong>ยังไม่ได้เข้าสู่ระบบ</strong>
                                    <p>
                                        กรุณา{" "}
                                        <Link href="/login" className="login-link">
                                            เข้าสู่ระบบ
                                        </Link>{" "}
                                        เพื่อดำเนินการสั่งซื้อและชำระเงิน
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            id="proceed-checkout-btn"
                            className="solid-button full"
                            disabled={selectedLines.length === 0}
                            onClick={() => {
                                if (!getToken()) {
                                    router.push("/login");
                                    return;
                                }
                                handleProceedToCheckout();
                            }}
                        >
                            {getToken() ? (
                                <>
                                    ดำเนินการสั่งซื้อ ({selectedLines.length} รายการ){" "}
                                    <ArrowRightIcon />
                                </>
                            ) : (
                                <>
                                    เข้าสู่ระบบเพื่อสั่งซื้อ <ArrowRightIcon />
                                </>
                            )}
                        </button>
                        <Link href="/products" className="continue-shopping">
                            ← ช้อปต่อ
                        </Link>
                    </aside>
                )}
            </div>

            {detailItem && (
                <div className="overlay" onClick={() => setDetailItem(null)}>
                    <div
                        className="item-detail-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-label="รายละเอียดสินค้าในตะกร้า"
                    >
                        <div className="modal-head">
                            <div>
                                <p className="intro" style={{ marginBottom: 6 }}>
                                    CART ITEM DETAIL
                                </p>
                                <h2>{detailItem.variant?.product?.name ?? "รายละเอียดสินค้า"}</h2>
                            </div>
                            <button
                                className="modal-close"
                                onClick={() => setDetailItem(null)}
                                aria-label="ปิดหน้าต่าง"
                            >
                                <XMarkIcon />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div
                                className="modal-swatch"
                                style={{ background: tone(detailItem.variant.color) }}
                            >
                                <span>
                                    {detailItem.variant.color} / {detailItem.variant.size}
                                </span>
                            </div>
                            <div className="modal-info-list">
                                {detailItem.variant?.product?.description && (
                                    <p className="modal-desc">
                                        {detailItem.variant.product.description}
                                    </p>
                                )}
                                {detailItem.variant.sku && (
                                    <div className="receipt-row">
                                        <span>รหัส SKU</span>
                                        <code>{detailItem.variant.sku}</code>
                                    </div>
                                )}
                                <div className="receipt-row">
                                    <span>สี / ขนาด</span>
                                    <strong>
                                        {detailItem.variant.color} / {detailItem.variant.size}
                                    </strong>
                                </div>
                                <div className="receipt-row">
                                    <span>ราคาต่อหน่วย</span>
                                    <strong>
                                        {money(detailItem.variant.price)} /{" "}
                                        {detailItem.variant.unit ?? "ตัว"}
                                    </strong>
                                </div>
                                <div className="receipt-row">
                                    <span>จำนวนในตะกร้า</span>
                                    <strong>
                                        {detailItem.quantity} {detailItem.variant.unit ?? "ตัว"}
                                    </strong>
                                </div>
                                <div className="receipt-row receipt-total">
                                    <strong>ราคารวมรายการนี้</strong>
                                    <strong>
                                        {money(
                                            Number(detailItem.variant.price) * detailItem.quantity
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
