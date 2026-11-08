/**
 * app/(main)/cart/page.tsx
 * หน้าตะกร้าสินค้าฝั่ง User
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
    ArrowRightIcon,
    CheckIcon,
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
    Address,
    CartItemResponse,
    CartLine,
    CheckoutResponse,
    CheckoutStage,
    CreateAddressInput,
    Payment,
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

    const [stage, setStage] = useState<CheckoutStage>("cart");
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("STANDARD");

    // รายการ cartItem.id ที่ติ๊กเลือกสำหรับนำไปสั่งซื้อ
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Modal ดูรายละเอียดสินค้า
    const [detailItem, setDetailItem] = useState<CartItemResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // ข้อมูลที่อยู่จัดส่ง
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [addressMode, setAddressMode] = useState<"select" | "create">("create");
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");
    const [newAddress, setNewAddress] = useState<CreateAddressInput>({
        recipientName: "",
        phone: "",
        addressLine: "",
        district: "",
        province: "",
        postalCode: "",
    });

    // ผลลัพธ์จากการสั่งซื้อและการชำระเงิน
    const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);
    const [paidResult, setPaidResult] = useState<Payment | null>(null);
    const [paymentMethodChoice, setPaymentMethodChoice] = useState<"CARD" | "PROMPTPAY">("CARD");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        refreshCart()
    }, [])

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

    useEffect(() => {
        if (stage !== "address") return;
        async function fetchAddresses() {
            if (!getToken()) return;
            setAddressLoading(true);
            try {
                const { data } = await axios.get<Address[]>("/api/address/find-all");
                const activeList = (Array.isArray(data) ? data : []).filter(
                    (a) => a.isActive !== false
                );
                setAddresses(activeList);
                if (activeList.length > 0) {
                    const defaultAddr = activeList.find((a) => a.isDefault) ?? activeList[0];
                    setSelectedAddressId(defaultAddr.id);
                    setAddressMode("select");
                } else {
                    setAddressMode("create");
                }
            } catch {
                // ignore
            } finally {
                setAddressLoading(false);
            }
        }
        void fetchAddresses();
    }, [stage]);

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

    function handleProceedToAddress() {
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
        setStage("address");
    }

    function validateAddressInput(input: CreateAddressInput): string | null {
        if (input.recipientName.trim().length < 2) {
            return "ชื่อผู้รับต้องมีความยาวอย่างน้อย 2 ตัวอักษร";
        }
        if (!/^0[0-9]{9}$/.test(input.phone.trim())) {
            return "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0 (เช่น 0812345678)";
        }
        if (input.addressLine.trim().length < 5) {
            return "ที่อยู่ต้องมีความยาวอย่างน้อย 5 ตัวอักษร";
        }
        if (input.district.trim().length < 2) {
            return "เขต/อำเภอ ต้องมีความยาวอย่างน้อย 2 ตัวอักษร";
        }
        if (input.province.trim().length < 2) {
            return "จังหวัดต้องมีความยาวอย่างน้อย 2 ตัวอักษร";
        }
        if (!/^[0-9]{5}$/.test(input.postalCode.trim())) {
            return "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก";
        }
        return null;
    }

    async function handleCheckout() {
        if (!getToken()) {
            setError("กรุณาเข้าสู่ระบบก่อนดำเนินการชำระเงิน");
            return;
        }

        if (selectedLines.length === 0) {
            setError("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
            return;
        }

        setError("");
        setLoading(true);

        try {
            let addressIdToUse = selectedAddressId;

            if (addressMode === "create" || !isUuid(addressIdToUse)) {
                const validationMsg = validateAddressInput(newAddress);
                if (validationMsg) {
                    setError(validationMsg);
                    setLoading(false);
                    return;
                }

                const { data: addrData } = await axios.post<Address>("/api/address/create", {
                    recipientName: newAddress.recipientName.trim(),
                    phone: newAddress.phone.trim(),
                    addressLine: newAddress.addressLine.trim(),
                    district: newAddress.district.trim(),
                    province: newAddress.province.trim(),
                    postalCode: newAddress.postalCode.trim(),
                });

                addressIdToUse = addrData.id;
                setAddresses((prev) => [addrData, ...prev]);
                setSelectedAddressId(addrData.id);
            }

            const checkoutItemIds = selectedLines
                .map((l) => l.id)
                .filter((id) => isUuid(id));

            if (checkoutItemIds.length === 0) {
                throw new Error(
                    "ไม่พบรายการสินค้าที่สามารถสั่งซื้อได้ กรุณาเข้าสู่ระบบแล้วลองอีกครั้ง"
                );
            }

            const { data } = await axios.post<CheckoutResponse>("/api/checkout", {
                cartItemId: checkoutItemIds,
                addressId: addressIdToUse,
                shippingMethod,
            });

            setCheckoutResult(data);
            await refreshCart();
            setStage("payment");
        } catch (err: any) {
            const backendMsg: string | undefined = err?.response?.data?.message ?? err?.message;
            if (backendMsg && backendMsg.toLowerCase().includes("address not found")) {
                setAddressMode("create");
                setError("ที่อยู่ที่เลือกไม่ตรงกับบัญชีของคุณ กรุณากรอกที่อยู่จัดส่งใหม่");
            } else if (backendMsg && backendMsg.toLowerCase().includes("insufficient stock")) {
                setError(`สต็อกสินค้าไม่เพียงพอ (${backendMsg}) กรุณาปรับลดจำนวนสินค้าในตะกร้า`);
            } else {
                setError(backendMsg ?? "เกิดข้อผิดพลาดในการสั่งซื้อ");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handlePay() {
        if (!checkoutResult) return;
        setError("");
        setLoading(true);
        try {
            const { data: paymentRes } = await axios.patch<Payment>(
                `/api/payment/${checkoutResult.payment.id}/pay`,
                { orderId: checkoutResult.order.id }
            );

            setPaidResult(paymentRes);

            if (paymentRes.status === "EXPIRED") {
                setError("คำสั่งซื้อนี้หมดเวลาชำระเงินแล้ว (เกิน 15 นาที)");
                return;
            }

            setStage("done");
        } catch (err: any) {
            setError(err?.response?.data?.message ?? err?.message ?? "เกิดข้อผิดพลาดในการชำระเงิน");
        } finally {
            setLoading(false);
        }
    }
    console.log(cart)
    // ============================================================
    // STAGE 4: DONE
    // ============================================================
    if (stage === "done" && checkoutResult) {
        const { order } = checkoutResult;
        return (
            <div className="cart-page">
                <div className="success-wrap">
                    <div className="success-icon">
                        <CheckIcon />
                    </div>
                    <p className="intro">ORDER CONFIRMED</p>
                    <h1>ขอบคุณสำหรับคำสั่งซื้อ</h1>
                    <p>
                        คำสั่งซื้อของคุณได้รับการชำระเงินเรียบร้อยแล้ว
                    </p>

                    <div className="order-receipt">
                        <div className="receipt-row">
                            <span>หมายเลขคำสั่งซื้อ</span>
                            <code>{order.id}</code>
                        </div>
                        <div className="receipt-row">
                            <span>รหัสการชำระเงิน</span>
                            <code>{paidResult?.id ?? checkoutResult.payment.id}</code>
                        </div>
                        <div className="receipt-row">
                            <span>สถานะการชำระเงิน</span>
                            <strong className="receipt-badge">
                                {paidResult?.status ?? "COMPLETED"}
                            </strong>
                        </div>
                        <div className="receipt-row">
                            <span>ผู้รับสินค้า</span>
                            <span>
                                {order.shippingName} ({order.shippingPhone})
                            </span>
                        </div>
                        <div className="receipt-row">
                            <span>ที่อยู่จัดส่ง</span>
                            <span>
                                {order.shippingAddressLine}, {order.shippingDistrict},{" "}
                                {order.shippingProvince} {order.shippingPostalCode}
                            </span>
                        </div>
                        <div className="receipt-row">
                            <span>รูปแบบการจัดส่ง</span>
                            <span>{order.shippingMethod}</span>
                        </div>
                        <div className="receipt-divider" />
                        <div className="receipt-row">
                            <span>ราคาสินค้า</span>
                            <span>{money(order.subtotalAmount)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>ค่าจัดส่ง</span>
                            <span>{money(order.shippingFee)}</span>
                        </div>
                        <div className="receipt-row receipt-total">
                            <strong>ยอดชำระทั้งสิ้น</strong>
                            <strong>{money(order.totalAmount)}</strong>
                        </div>
                    </div>

                    <div className="receipt-actions">
                        <Link href="/products" className="solid-button">
                            เลือกซื้อสินค้าต่อ <ArrowRightIcon />
                        </Link>
                        {cart.length > 0 && (
                            <button
                                className="outline-button"
                                onClick={() => {
                                    setCheckoutResult(null);
                                    setPaidResult(null);
                                    setStage("cart");
                                }}
                            >
                                กลับไปดูตะกร้าสินค้า ({cartCount} ชิ้นที่เหลือ)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // STAGE 3: PAYMENT
    // ============================================================
    if (stage === "payment" && checkoutResult) {
        const { order, payment } = checkoutResult;
        const expiresText = order.expiresAt
            ? new Date(order.expiresAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
            })
            : "15 นาที";

        return (
            <div className="cart-page">
                <div className="checkout-wrap">
                    <p className="intro">CHECKOUT / 02 · PAYMENT</p>
                    <h1>ชำระเงินคำสั่งซื้อ</h1>

                    <div className="order-meta-box">
                        <div>
                            <span>ORDER ID</span>
                            <code>{order.id}</code>
                        </div>
                        <div>
                            <span>PAYMENT ID</span>
                            <code>{payment.id}</code>
                        </div>
                        <div>
                            <span>กรุณาชำระภายใน</span>
                            <strong>{expiresText} น.</strong>
                        </div>
                    </div>

                    <div className="payment-card">
                        <span>ATELIER PAY · {paymentMethodChoice}</span>
                        <strong>
                            {paymentMethodChoice === "CARD"
                                ? "••••  ••••  ••••  4242"
                                : "PROMPTPAY QR · INSTANT"}
                        </strong>
                        <small>
                            AMOUNT DUE: {money(order.totalAmount)} · STATUS: {payment.status}
                        </small>
                    </div>

                    <label className="payment-choice">
                        <input
                            type="radio"
                            name="payment"
                            checked={paymentMethodChoice === "CARD"}
                            onChange={() => setPaymentMethodChoice("CARD")}
                        />
                        บัตรเครดิต / เดบิต
                        <span>{money(order.totalAmount)}</span>
                    </label>
                    <label className="payment-choice">
                        <input
                            type="radio"
                            name="payment"
                            checked={paymentMethodChoice === "PROMPTPAY"}
                            onChange={() => setPaymentMethodChoice("PROMPTPAY")}
                        />
                        QR พร้อมเพย์ (PromptPay)
                        <span>{money(order.totalAmount)}</span>
                    </label>

                    <div className="checkout-breakdown">
                        <div className="summary-row">
                            <span>ยอดรวมสินค้า</span>
                            <span>{money(order.subtotalAmount)}</span>
                        </div>
                        <div className="summary-row">
                            <span>ค่าจัดส่ง ({order.shippingMethod})</span>
                            <span>{money(order.shippingFee)}</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-row summary-total">
                            <strong>ยอดที่ต้องชำระ</strong>
                            <strong>{money(order.totalAmount)}</strong>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error" style={{ marginTop: 14 }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="confirm-pay-btn"
                        className="solid-button full"
                        onClick={handlePay}
                        disabled={loading}
                    >
                        {loading ? (
                            "กำลังยืนยันการชำระเงิน…"
                        ) : (
                            <>
                                ยืนยันการชำระเงิน {money(order.totalAmount)} <CheckIcon />
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // STAGE 2: ADDRESS & SHIPPING
    // ============================================================
    if (stage === "address") {
        return (
            <div className="cart-page">
                <div className="checkout-wrap">
                    <p className="intro">CHECKOUT / 01 · SHIPPING & ADDRESS</p>
                    <h1>ข้อมูลสำหรับจัดส่ง</h1>

                    {addresses.length > 0 && (
                        <div className="address-tabs">
                            <button
                                type="button"
                                className={addressMode === "select" ? "active" : ""}
                                onClick={() => setAddressMode("select")}
                            >
                                เลือกจากที่อยู่ที่บันทึกไว้ ({addresses.length})
                            </button>
                            <button
                                type="button"
                                className={addressMode === "create" ? "active" : ""}
                                onClick={() => setAddressMode("create")}
                            >
                                + เพิ่มที่อยู่จัดส่งใหม่
                            </button>
                        </div>
                    )}

                    {addressLoading ? (
                        <p className="cart-status-text">กำลังโหลดข้อมูลที่อยู่…</p>
                    ) : addressMode === "select" && addresses.length > 0 ? (
                        <div className="saved-address-list">
                            {addresses.map((addr) => (
                                <label
                                    key={addr.id}
                                    className={`saved-address-card ${selectedAddressId === addr.id ? "selected" : ""
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="savedAddress"
                                        checked={selectedAddressId === addr.id}
                                        onChange={() => setSelectedAddressId(addr.id)}
                                    />
                                    <div>
                                        <div className="saved-address-head">
                                            <strong>{addr.recipientName}</strong>
                                            <span>{addr.phone}</span>
                                        </div>
                                        <p>
                                            {addr.addressLine}, {addr.district}, {addr.province}{" "}
                                            {addr.postalCode}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="address-grid">
                            <input
                                placeholder="ชื่อ-นามสกุลผู้รับ (อย่างน้อย 2 ตัวอักษร)"
                                value={newAddress.recipientName}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, recipientName: e.target.value })
                                }
                            />
                            <input
                                placeholder="เบอร์โทรศัพท์ 10 หลัก (เช่น 0812345678)"
                                maxLength={10}
                                value={newAddress.phone}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, phone: e.target.value })
                                }
                            />
                            <input
                                className="wide"
                                placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล (อย่างน้อย 5 ตัวอักษร)"
                                value={newAddress.addressLine}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, addressLine: e.target.value })
                                }
                            />
                            <input
                                placeholder="เขต / อำเภอ"
                                value={newAddress.district}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, district: e.target.value })
                                }
                            />
                            <input
                                placeholder="จังหวัด"
                                value={newAddress.province}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, province: e.target.value })
                                }
                            />
                            <input
                                className="wide"
                                placeholder="รหัสไปรษณีย์ 5 หลัก (เช่น 10110)"
                                maxLength={5}
                                value={newAddress.postalCode}
                                onChange={(e) =>
                                    setNewAddress({ ...newAddress, postalCode: e.target.value })
                                }
                            />
                        </div>
                    )}

                    <div className="shipping-methods-box">
                        <p className="field-label" style={{ marginBottom: 10 }}>
                            รูปแบบการจัดส่ง (SHIPPING METHOD)
                        </p>
                        <label
                            className={`shipping-option ${shippingMethod === "STANDARD" ? "selected" : ""
                                }`}
                        >
                            <input
                                type="radio"
                                name="shippingMethod"
                                checked={shippingMethod === "STANDARD"}
                                onChange={() => setShippingMethod("STANDARD")}
                            />
                            <div>
                                <span>STANDARD</span>
                                <strong>จัดส่งมาตรฐาน 2–4 วันทำการ (ครบ ฿500 ส่งฟรี)</strong>
                            </div>
                            <b>
                                {selectedSubtotal >= FREE_SHIPPING_THRESHOLD
                                    ? "ฟรี (฿0)"
                                    : "฿40"}
                            </b>
                        </label>

                        <label
                            className={`shipping-option ${shippingMethod === "EXPRESS" ? "selected" : ""
                                }`}
                        >
                            <input
                                type="radio"
                                name="shippingMethod"
                                checked={shippingMethod === "EXPRESS"}
                                onChange={() => setShippingMethod("EXPRESS")}
                            />
                            <div>
                                <span>EXPRESS</span>
                                <strong>จัดส่งด่วนพิเศษ 1–2 วันทำการ</strong>
                            </div>
                            <b>฿100</b>
                        </label>
                    </div>

                    <div className="checkout-breakdown">
                        <div className="summary-row">
                            <span>สินค้าที่เลือก ({selectedItemCount} ชิ้น)</span>
                            <span>{money(selectedSubtotal)}</span>
                        </div>
                        <div className="summary-row">
                            <span>ค่าจัดส่ง ({shippingMethod})</span>
                            <span>{shippingFee === 0 ? "ฟรี (฿0)" : money(shippingFee)}</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-row summary-total">
                            <strong>ยอดรวมคำสั่งซื้อ</strong>
                            <strong>{money(grandTotal)}</strong>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error" style={{ marginBottom: 12 }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="go-payment-btn"
                        className="solid-button full"
                        onClick={handleCheckout}
                        disabled={loading}
                    >
                        {loading ? (
                            "กำลังดำเนินการสั่งซื้อ…"
                        ) : (
                            <>
                                ยืนยันที่อยู่และสั่งซื้อ ({money(grandTotal)}) <ArrowRightIcon />
                            </>
                        )}
                    </button>

                    <button
                        className="text-button"
                        style={{ marginTop: 14, fontSize: 12 }}
                        onClick={() => {
                            setError("");
                            setStage("cart");
                        }}
                    >
                        ← ย้อนกลับสู่ตะกร้าสินค้า
                    </button>
                </div>
            </div>
        );
    }

    // ============================================================
    // STAGE 1: SHOPPING BAG (CART MANAGEMENT)
    // ============================================================
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
                        <p className="summary-note">
                            รวมภาษีมูลค่าเพิ่มแล้ว
                        </p>

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
                                handleProceedToAddress();
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
