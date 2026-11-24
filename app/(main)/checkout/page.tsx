/**
 * app/(main)/checkout/page.tsx
 * หน้าดำเนินการสั่งซื้อและชำระเงิน (Address & Shipping -> Payment -> Order Confirmed)
 */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
    ArrowRightIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";
import { isUuid, useCart } from "../../../context/CartContext";
import { money, tone } from "../../../components/ProductCard";
import { getToken } from "../../../lib/auth";
import {
    Address,
    CartLine,
    CheckoutResponse,
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

type CheckoutFlowStage = "address" | "payment" | "done";

function CheckoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        cart,
        cartCount,
        cartLoading,
        refreshCart,
    } = useCart();

    const initialShipping: ShippingMethod =
        searchParams.get("shipping") === "EXPRESS" ? "EXPRESS" : "STANDARD";

    const [stage, setStage] = useState<CheckoutFlowStage>("address");
    const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(initialShipping);

    // รายการ cartItem.id ที่เลือกมาจากหน้าตะกร้า
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        const itemsParam = searchParams.get("items");
        if (itemsParam) {
            return itemsParam.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return [];
    });

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
    const [orderedLines, setOrderedLines] = useState<CartLine[]>([]);
    const [paidResult, setPaidResult] = useState<Payment | null>(null);
    const [paymentMethodChoice, setPaymentMethodChoice] = useState<"CARD" | "PROMPTPAY">("CARD");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.replace("/login");
            return;
        }
        void refreshCart();
    }, [refreshCart, router]);

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

            setOrderedLines(selectedLines);
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

    function renderCheckoutStepper(currentStep: 1 | 2 | 3) {
        const steps = [
            { num: 1, title: "ขั้นที่ 1", subtitle: "ที่อยู่และการจัดส่ง" },
            { num: 2, title: "ขั้นที่ 2", subtitle: "ชำระเงิน" },
            { num: 3, title: "ขั้นที่ 3", subtitle: "เสร็จสมบูรณ์" },
        ];

        return (
            <div className="checkout-top-header">
                <div className="checkout-stepper" aria-label="ขั้นตอนการสั่งซื้อ">
                    {steps.map((s, idx) => {
                        const isCompleted = currentStep > s.num;
                        const isActive = currentStep === s.num;
                        return (
                            <div
                                key={s.num}
                                className={`stepper-item ${isActive ? "active" : ""} ${
                                    isCompleted ? "completed" : ""
                                }`}
                            >
                                <div className="stepper-circle">
                                    {isCompleted ? <CheckIcon /> : s.num}
                                </div>
                                <div className="stepper-label">
                                    <span>{s.title}</span>
                                    <strong>{s.subtitle}</strong>
                                </div>
                                {idx < steps.length - 1 && (
                                    <div
                                        className={`stepper-line ${
                                            isCompleted ? "completed" : ""
                                        }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    function renderOrderedItemsSidebar(
        items: CartLine[],
        subtotalVal: number | string,
        shippingVal: number | string,
        totalVal: number | string,
        methodVal: ShippingMethod
    ) {
        const totalQty = items.reduce((sum, l) => sum + l.quantity, 0);
        return (
            <aside className="checkout-order-sidebar" aria-label="รายการสินค้าที่สั่งซื้อ">
                <h2>รายการสินค้าที่สั่งซื้อ ({totalQty} ชิ้น)</h2>
                <div className="checkout-items-list">
                    {items.map((line) => (
                        <div className="checkout-item-row" key={line.id}>
                            <div
                                className="checkout-item-swatch"
                                style={{ background: tone(line.variant.color) }}
                            >
                                <span>{line.variant.size}</span>
                            </div>
                            <div className="checkout-item-info">
                                <strong>{line.product.name}</strong>
                                <p>
                                    สี: {line.variant.color} · ไซส์: {line.variant.size}
                                </p>
                                <small>
                                    {money(line.variant.price)} × {line.quantity}{" "}
                                    {line.variant.unit ?? "ตัว"}
                                </small>
                            </div>
                            <div className="checkout-item-subtotal">
                                {money(Number(line.variant.price) * line.quantity)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="checkout-sidebar-summary">
                    <div className="summary-row">
                        <span>ราคาสินค้า ({totalQty} ชิ้น)</span>
                        <span>{money(subtotalVal)}</span>
                    </div>
                    <div className="summary-row">
                        <span>ค่าจัดส่ง ({methodVal})</span>
                        <span>
                            {Number(shippingVal) === 0 ? "ฟรี (฿0)" : money(shippingVal)}
                        </span>
                    </div>
                    <div className="summary-divider" />
                    <div className="summary-row summary-total">
                        <strong>ยอดรวมคำสั่งซื้อ</strong>
                        <strong>{money(totalVal)}</strong>
                    </div>
                </div>
            </aside>
        );
    }

    // ============================================================
    // STAGE 3: DONE
    // ============================================================
    if (stage === "done" && checkoutResult) {
        const { order } = checkoutResult;
        return (
            <div className="cart-page">
                <div className="checkout-columns">
                    {/* Column 1: ปุ่มย้อนกลับสู่ตะกร้า */}
                    <div className="checkout-back-col">
                        <button
                            type="button"
                            className="back-to-cart-top-btn"
                            onClick={() => router.push("/cart")}
                        >
                            ← ย้อนกลับสู่ตะกร้าสินค้า
                        </button>
                    </div>

                    {/* Column 2: เนื้อหาหลัก */}
                    <div className="checkout-main-col">
                        {renderCheckoutStepper(3)}
                        <div className="success-wrap" style={{ padding: "20px 0 0" }}>
                            <div className="success-icon">
                                <CheckIcon />
                            </div>
                            <p className="intro">ORDER CONFIRMED</p>
                            <h1>ขอบคุณสำหรับคำสั่งซื้อ</h1>
                            <p>คำสั่งซื้อของคุณได้รับการชำระเงินเรียบร้อยแล้ว</p>

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
                            </div>

                            <div className="receipt-actions">
                                <Link href="/products" className="solid-button">
                                    เลือกซื้อสินค้าต่อ <ArrowRightIcon />
                                </Link>
                                {cart.length > 0 && (
                                    <button
                                        className="outline-button"
                                        onClick={() => router.push("/cart")}
                                    >
                                        กลับไปดูตะกร้าสินค้า ({cartCount} ชิ้นที่เหลือ)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: รายการสินค้าที่สั่งซื้อ */}
                    {renderOrderedItemsSidebar(
                        orderedLines,
                        order.subtotalAmount,
                        order.shippingFee,
                        order.totalAmount,
                        order.shippingMethod
                    )}
                </div>
            </div>
        );
    }

    // ============================================================
    // STAGE 2: PAYMENT
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
                <div className="checkout-columns">
                    {/* Column 1: ปุ่มย้อนกลับสู่ตะกร้า */}
                    <div className="checkout-back-col">
                        <button
                            type="button"
                            className="back-to-cart-top-btn"
                            onClick={() => router.push("/cart")}
                        >
                            ← ย้อนกลับสู่ตะกร้าสินค้า
                        </button>
                    </div>

                    {/* Column 2: ข้อมูลการชำระเงิน */}
                    <div className="checkout-main-col">
                        {renderCheckoutStepper(2)}
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

                        {error && (
                            <div className="login-error" style={{ marginTop: 14 }}>
                                {error}
                            </div>
                        )}

                        <button
                            id="confirm-pay-btn"
                            className="solid-button full"
                            style={{ marginTop: 20 }}
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

                    {/* Column 3: รายการสินค้าที่สั่งซื้อ */}
                    {renderOrderedItemsSidebar(
                        orderedLines,
                        order.subtotalAmount,
                        order.shippingFee,
                        order.totalAmount,
                        order.shippingMethod
                    )}
                </div>
            </div>
        );
    }

    // ============================================================
    // STAGE 1: ADDRESS & SHIPPING
    // ============================================================
    return (
        <div className="cart-page">
            <div className="checkout-columns">
                {/* Column 1: ปุ่มย้อนกลับสู่ตะกร้า */}
                <div className="checkout-back-col">
                    <button
                        type="button"
                        className="back-to-cart-top-btn"
                        onClick={() => router.push("/cart")}
                    >
                        ← ย้อนกลับสู่ตะกร้าสินค้า
                    </button>
                </div>

                {/* Column 2: ข้อมูลสำหรับจัดส่ง */}
                <div className="checkout-main-col">
                    {renderCheckoutStepper(1)}
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
                                    className={`saved-address-card ${
                                        selectedAddressId === addr.id ? "selected" : ""
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
                                    setNewAddress({
                                        ...newAddress,
                                        recipientName: e.target.value,
                                    })
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
                                    setNewAddress({
                                        ...newAddress,
                                        addressLine: e.target.value,
                                    })
                                }
                            />
                            <input
                                placeholder="เขต / อำเภอ"
                                value={newAddress.district}
                                onChange={(e) =>
                                    setNewAddress({
                                        ...newAddress,
                                        district: e.target.value,
                                    })
                                }
                            />
                            <input
                                placeholder="จังหวัด"
                                value={newAddress.province}
                                onChange={(e) =>
                                    setNewAddress({
                                        ...newAddress,
                                        province: e.target.value,
                                    })
                                }
                            />
                            <input
                                className="wide"
                                placeholder="รหัสไปรษณีย์ 5 หลัก (เช่น 10110)"
                                maxLength={5}
                                value={newAddress.postalCode}
                                onChange={(e) =>
                                    setNewAddress({
                                        ...newAddress,
                                        postalCode: e.target.value,
                                    })
                                }
                            />
                        </div>
                    )}

                    <div className="shipping-methods-box">
                        <p className="field-label" style={{ marginBottom: 10 }}>
                            รูปแบบการจัดส่ง (SHIPPING METHOD)
                        </p>
                        <label
                            className={`shipping-option ${
                                shippingMethod === "STANDARD" ? "selected" : ""
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
                                <strong>
                                    จัดส่งมาตรฐาน 2–4 วันทำการ (ครบ ฿500 ส่งฟรี)
                                </strong>
                            </div>
                            <b>
                                {selectedSubtotal >= FREE_SHIPPING_THRESHOLD
                                    ? "ฟรี (฿0)"
                                    : "฿40"}
                            </b>
                        </label>

                        <label
                            className={`shipping-option ${
                                shippingMethod === "EXPRESS" ? "selected" : ""
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

                    {error && (
                        <div className="login-error" style={{ marginBottom: 12 }}>
                            {error}
                        </div>
                    )}

                    <button
                        id="go-payment-btn"
                        className="solid-button full"
                        onClick={handleCheckout}
                        disabled={loading || cartLoading || selectedLines.length === 0}
                    >
                        {loading ? (
                            "กำลังดำเนินการสั่งซื้อ…"
                        ) : (
                            <>
                                ยืนยันที่อยู่และสั่งซื้อ ({money(grandTotal)}){" "}
                                <ArrowRightIcon />
                            </>
                        )}
                    </button>
                </div>

                {/* Column 3: รายการสินค้าที่สั่งซื้อ */}
                {renderOrderedItemsSidebar(
                    selectedLines,
                    selectedSubtotal,
                    shippingFee,
                    grandTotal,
                    shippingMethod
                )}
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <div className="cart-page">
                    <div className="cart-empty">
                        <p>กำลังโหลดหน้าสั่งซื้อสินค้า…</p>
                    </div>
                </div>
            }
        >
            <CheckoutContent />
        </Suspense>
    );
}
