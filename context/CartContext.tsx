/**
 * context/CartContext.tsx
 * Global cart state — เชื่อมต่อกับ Backend API (/api/cart-item/*)
 * รองรับทั้งผู้ใช้ที่ล็อกอิน (ROLE: USER) และโหมด Guest / Sample Data
 */
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from "react";
import { CartItemResponse, CartLine, Product, Variant } from "../lib/types";
import { getToken } from "../lib/auth";

const LOCAL_CART_STORAGE_KEY = "atelier_guest_cart";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value?: string | null): boolean {
    if (!value) return false;
    return UUID_REGEX.test(value);
}

function mapCartItemToLine(item: CartItemResponse): CartLine {
    return {
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        variant: {
            id: item.variant.id,
            productId: item.variant.productId,
            sku: item.variant.sku,
            price: Number(item.variant.price),
            imageUrl: item.variant.imageUrl,
            color: item.variant.color,
            size: item.variant.size,
            unit: item.variant.unit ?? "ตัว",
            isActive: item.variant.isActive ?? true,
        },
        product: {
            name: item.variant?.product?.name ?? "สินค้า",
            description: item.variant?.product?.description ?? null,
            isActive: item.variant?.product?.isActive ?? true,
        },
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

function translateCartError(message?: string, status?: number): string {
    if (!message) {
        if (status === 401) return "กรุณาเข้าสู่ระบบก่อนใช้งานตะกร้าสินค้า";
        if (status === 403)
            return "บัญชีนี้ไม่มีสิทธิ์ใช้งานตะกร้าสินค้า (เฉพาะบัญชีลูกค้า USER เท่านั้น)";
        return "เกิดข้อผิดพลาดในการอัปเดตตะกร้าสินค้า";
    }
    if (message.toLowerCase().includes("insufficient stock")) {
        return "สินค้าในสต็อกไม่เพียงพอสำหรับจำนวนที่เลือก";
    }
    if (message.toLowerCase().includes("cart item not found")) {
        return "ไม่พบรายการสินค้านี้ในตะกร้า";
    }
    if (message.toLowerCase().includes("inventory not found")) {
        return "ไม่พบข้อมูลสต็อกของสินค้านี้";
    }
    if (status === 403 || message.toLowerCase().includes("forbidden")) {
        return "เฉพาะบัญชีผู้ใช้งานทั่วไป (USER) เท่านั้นที่สามารถจัดการตะกร้าสินค้าได้";
    }
    return message;
}

interface CartContextValue {
    cart: CartLine[];
    cartCount: number;
    cartTotal: number;
    cartOpen: boolean;
    setCartOpen: (open: boolean) => void;
    cartLoading: boolean;
    updatingItemId: string | null;
    cartError: string | null;
    clearCartError: () => void;
    isSyncedWithBackend: boolean;
    refreshCart: () => Promise<void>;
    addToCart: (product: Product, variant?: Variant, quantity?: number) => Promise<boolean>;
    updateQuantity: (id: string, delta: number) => Promise<boolean>;
    setItemQuantity: (id: string, quantity: number) => Promise<boolean>;
    removeItem: (id: string) => Promise<boolean>;
    getCartItemById: (itemId: string) => Promise<CartItemResponse | null>;
    clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [cartLoading, setCartLoading] = useState(false);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [cartError, setCartError] = useState<string | null>(null);
    const [isSyncedWithBackend, setIsSyncedWithBackend] = useState(false);

    const clearCartError = useCallback(() => setCartError(null), []);

    // บันทึก local cart ลง localStorage เฉพาะรายการที่เป็น local-*
    const saveLocalCart = useCallback((lines: CartLine[]) => {
        if (typeof window === "undefined") return;
        try {
            const localLines = lines.filter((l) => l.id.startsWith("local-"));
            if (localLines.length > 0) {
                localStorage.setItem(LOCAL_CART_STORAGE_KEY, JSON.stringify(localLines));
            } else {
                localStorage.removeItem(LOCAL_CART_STORAGE_KEY);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    const loadLocalCart = useCallback((): CartLine[] => {
        if (typeof window === "undefined") return [];
        try {
            const raw = localStorage.getItem(LOCAL_CART_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, []);

    /**
     * GET /api/cart-item/find-all
     * ดึงรายการสินค้าในตะกร้าของ User ปัจจุบันจาก Backend
     */
    const refreshCart = useCallback(async () => {
        const token = getToken();
        if (!token) {
            setIsSyncedWithBackend(false);
            setCart(loadLocalCart());
            return;
        }

        setCartLoading(true);
        try {
            // หากมีรายการใน localStorage ที่เป็น UUID จริง ให้ซิงค์ขึ้น Backend ก่อน
            const pendingLocal = loadLocalCart().filter((l) => isUuid(l.variant?.id));
            if (pendingLocal.length > 0) {
                await Promise.allSettled(
                    pendingLocal.map((line) =>
                        fetch("/api/cart-item/create", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                variantId: line.variant.id,
                                quantity: line.quantity,
                            }),
                        })
                    )
                );
                if (typeof window !== "undefined") {
                    localStorage.removeItem(LOCAL_CART_STORAGE_KEY);
                }
            }

            const res = await fetch("/api/cart-item/find-all", {
                method: "GET",
                cache: "no-store",
            });

            if (res.ok) {
                const data = (await res.json()) as CartItemResponse[];
                const mapped = Array.isArray(data) ? data.map(mapCartItemToLine) : [];
                setCart(mapped);
                setIsSyncedWithBackend(true);
                setCartError(null);
            } else {
                // กรณี 401/403 (เช่น ล็อกอินด้วย ADMIN หรือ token หมดอายุ)
                setIsSyncedWithBackend(false);
                if (res.status === 403) {
                    setCartError(
                        "บัญชีผู้ดูแลระบบ (ADMIN) ไม่สามารถใช้งานตะกร้าฝั่งลูกค้าได้ กรุณาเข้าสู่ระบบด้วยบัญชี USER"
                    );
                }
                setCart(loadLocalCart());
            }
        } catch {
            setIsSyncedWithBackend(false);
            setCart(loadLocalCart());
        } finally {
            setCartLoading(false);
        }
    }, [loadLocalCart]);

    useEffect(() => {
        void refreshCart();
    }, [refreshCart]);

    /**
     * GET /api/cart-item/find-by-id/:itemId
     * ดึงรายละเอียดเชิงลึกของรายการในตะกร้า
     */
    const getCartItemById = useCallback(
        async (itemId: string): Promise<CartItemResponse | null> => {
            if (!getToken() || !isUuid(itemId)) return null;
            try {
                const res = await fetch(`/api/cart-item/find-by-id/${itemId}`, {
                    method: "GET",
                    cache: "no-store",
                });
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    setCartError(translateCartError(errData.message, res.status));
                    return null;
                }
                return (await res.json()) as CartItemResponse;
            } catch {
                setCartError("ไม่สามารถดึงรายละเอียดสินค้าในตะกร้าได้");
                return null;
            }
        },
        []
    );

    /**
     * POST /api/cart-item/create
     * เพิ่มสินค้าลงตะกร้า (ถ้ามีอยู่แล้ว Backend จะ upsert + increment quantity)
     */
    const addToCart = useCallback(
        async (product: Product, selectedVariant?: Variant, quantity = 1): Promise<boolean> => {
            const variant = selectedVariant ?? product.variants?.[0];
            if (!variant) {
                setCartError("ไม่พบตัวเลือกสินค้า (Variant) สำหรับสินค้านี้");
                return false;
            }

            setCartError(null);
            const token = getToken();

            // กรณีล็อกอินแล้ว และ Variant ID เป็น UUID จริงจาก Backend
            if (token && isUuid(variant.id)) {
                setUpdatingItemId(variant.id);
                try {
                    const res = await fetch("/api/cart-item/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            variantId: variant.id,
                            quantity,
                        }),
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        setCartError(translateCartError(errData.message, res.status));
                        return false;
                    }

                    await refreshCart();
                    setCartOpen(true);
                    return true;
                } catch {
                    setCartError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเพิ่มสินค้าลงตะกร้าได้");
                    return false;
                } finally {
                    setUpdatingItemId(null);
                }
            }

            // กรณี Guest หรือใช้ Sample Data (ยังไม่ได้ล็อกอิน)
            setCart((prev) => {
                const existing = prev.find((line) => line.variant.id === variant.id);
                let next: CartLine[];
                if (existing) {
                    next = prev.map((line) =>
                        line.variant.id === variant.id
                            ? { ...line, quantity: line.quantity + quantity }
                            : line
                    );
                } else {
                    next = [
                        ...prev,
                        {
                            id: `local-${variant.id}`,
                            variantId: variant.id,
                            variant,
                            product: {
                                name: product.name,
                                description: product.description ?? null,
                                isActive: product.isActive ?? true,
                            },
                            quantity,
                        },
                    ];
                }
                saveLocalCart(next);
                return next;
            });
            setCartOpen(true);
            return true;
        },
        [refreshCart, saveLocalCart]
    );

    /**
     * DELETE /api/cart-item/delete/:itemId
     * ลบรายการสินค้าออกจากตะกร้า
     */
    const removeItem = useCallback(
        async (itemId: string): Promise<boolean> => {
            setCartError(null);
            const token = getToken();

            if (token && isUuid(itemId)) {
                setUpdatingItemId(itemId);
                try {
                    const res = await fetch(`/api/cart-item/delete/${itemId}`, {
                        method: "DELETE",
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        setCartError(translateCartError(errData.message, res.status));
                        return false;
                    }

                    setCart((prev) => prev.filter((line) => line.id !== itemId));
                    return true;
                } catch {
                    setCartError("ไม่สามารถลบรายการสินค้าออกจากตะกร้าได้");
                    return false;
                } finally {
                    setUpdatingItemId(null);
                }
            }

            // กรณี Local item
            setCart((prev) => {
                const next = prev.filter((line) => line.id !== itemId);
                saveLocalCart(next);
                return next;
            });
            return true;
        },
        [saveLocalCart]
    );

    /**
     * PUT /api/cart-item/update/:itemId
     * กำหนดจำนวนสินค้าในตะกร้า (ตรวจสอบสต็อกจาก Backend)
     */
    const setItemQuantity = useCallback(
        async (itemId: string, newQty: number): Promise<boolean> => {
            if (newQty <= 0) {
                return removeItem(itemId);
            }

            setCartError(null);
            const token = getToken();

            if (token && isUuid(itemId)) {
                setUpdatingItemId(itemId);
                try {
                    const res = await fetch(`/api/cart-item/update/${itemId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ quantity: newQty }),
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        setCartError(translateCartError(errData.message, res.status));
                        return false;
                    }

                    setCart((prev) =>
                        prev.map((line) =>
                            line.id === itemId ? { ...line, quantity: newQty } : line
                        )
                    );
                    return true;
                } catch {
                    setCartError("ไม่สามารถอัปเดตจำนวนสินค้าได้ กรุณาลองใหม่อีกครั้ง");
                    return false;
                } finally {
                    setUpdatingItemId(null);
                }
            }

            // กรณี Local item
            setCart((prev) => {
                const next = prev.map((line) =>
                    line.id === itemId ? { ...line, quantity: newQty } : line
                );
                saveLocalCart(next);
                return next;
            });
            return true;
        },
        [removeItem, saveLocalCart]
    );

    /**
     * ปรับเพิ่ม/ลดจำนวนสินค้าทีละ delta (เช่น +1 หรือ -1)
     */
    const updateQuantity = useCallback(
        async (itemId: string, delta: number): Promise<boolean> => {
            const target = cart.find((line) => line.id === itemId);
            if (!target) return false;
            const newQty = target.quantity + delta;
            return setItemQuantity(itemId, newQty);
        },
        [cart, setItemQuantity]
    );

    /**
     * ล้างตะกร้าทั้งหมด (ลบทุก item ใน Backend หากล็อกอินอยู่)
     */
    const clearCart = useCallback(async () => {
        setCartError(null);
        const token = getToken();
        const backendItems = cart.filter((line) => isUuid(line.id));

        if (token && backendItems.length > 0) {
            setCartLoading(true);
            try {
                await Promise.allSettled(
                    backendItems.map((line) =>
                        fetch(`/api/cart-item/delete/${line.id}`, {
                            method: "DELETE",
                        })
                    )
                );
            } finally {
                setCartLoading(false);
            }
        }

        setCart([]);
        saveLocalCart([]);
    }, [cart, saveLocalCart]);

    const cartCount = useMemo(
        () => cart.reduce((sum, line) => sum + line.quantity, 0),
        [cart]
    );

    const cartTotal = useMemo(
        () =>
            cart.reduce(
                (sum, line) => sum + Number(line.variant.price) * line.quantity,
                0
            ),
        [cart]
    );

    return (
        <CartContext.Provider
            value={{
                cart,
                cartCount,
                cartTotal,
                cartOpen,
                setCartOpen,
                cartLoading,
                updatingItemId,
                cartError,
                clearCartError,
                isSyncedWithBackend,
                refreshCart,
                addToCart,
                updateQuantity,
                setItemQuantity,
                removeItem,
                getCartItemById,
                clearCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be inside <CartProvider>");
    return ctx;
}
