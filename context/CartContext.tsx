/**
 * context/CartContext.tsx
 * Global cart state — เรียกใช้ Backend API (/api/cart-item/*) ด้วย axios โดยตรง
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
import axios from "axios";
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

function translateCartError(err: any): string {
    const status: number | undefined = err?.response?.status;
    const message: string | undefined = err?.response?.data?.message ?? err?.message;

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

/** บันทึก local cart ลง localStorage เฉพาะรายการที่เป็น local-* */
function saveLocalCart(lines: CartLine[]) {
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
}

/** อ่าน local cart จาก localStorage */
function loadLocalCart(): CartLine[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(LOCAL_CART_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
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
                        axios.post("/api/cart-item/create", {
                            variantId: line.variant.id,
                            quantity: line.quantity,
                        })
                    )
                );
                if (typeof window !== "undefined") {
                    localStorage.removeItem(LOCAL_CART_STORAGE_KEY);
                }
            }

            const { data } = await axios.get<CartItemResponse[]>("/api/cart-item/find-all");
            const mapped = Array.isArray(data) ? data.map(mapCartItemToLine) : [];
            setCart(mapped);
            setIsSyncedWithBackend(true);
            setCartError(null);
        } catch (err: any) {
            setIsSyncedWithBackend(false);
            if (err?.response?.status === 403) {
                setCartError(
                    "บัญชีผู้ดูแลระบบ (ADMIN) ไม่สามารถใช้งานตะกร้าฝั่งลูกค้าได้ กรุณาเข้าสู่ระบบด้วยบัญชี USER"
                );
            }
            setCart(loadLocalCart());
        } finally {
            setCartLoading(false);
        }
    }, []);

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
                const { data } = await axios.get<CartItemResponse>(
                    `/api/cart-item/find-by-id/${itemId}`
                );
                return data;
            } catch (err: any) {
                setCartError(translateCartError(err));
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
                    await axios.post("/api/cart-item/create", {
                        variantId: variant.id,
                        quantity,
                    });
                    await refreshCart();
                    setCartOpen(true);
                    return true;
                } catch (err: any) {
                    setCartError(translateCartError(err));
                    return false;
                } finally {
                    setUpdatingItemId(null);
                }
            }

            // กรณี Guest หรือใช้ Sample Data (ยังไม่ได้ล็อกอิน)
            setCart((prev) => {
                const existing = prev.find((line) => line.variant.id === variant.id);
                const next = existing
                    ? prev.map((line) =>
                          line.variant.id === variant.id
                              ? { ...line, quantity: line.quantity + quantity }
                              : line
                      )
                    : [
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
                saveLocalCart(next);
                return next;
            });
            setCartOpen(true);
            return true;
        },
        [refreshCart]
    );

    /**
     * DELETE /api/cart-item/delete/:itemId
     * ลบรายการสินค้าออกจากตะกร้า
     */
    const removeItem = useCallback(async (itemId: string): Promise<boolean> => {
        setCartError(null);
        const token = getToken();

        if (token && isUuid(itemId)) {
            setUpdatingItemId(itemId);
            try {
                await axios.delete(`/api/cart-item/delete/${itemId}`);
                setCart((prev) => prev.filter((line) => line.id !== itemId));
                return true;
            } catch (err: any) {
                setCartError(translateCartError(err));
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
    }, []);

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
                    await axios.put(`/api/cart-item/update/${itemId}`, {
                        quantity: newQty,
                    });
                    setCart((prev) =>
                        prev.map((line) =>
                            line.id === itemId ? { ...line, quantity: newQty } : line
                        )
                    );
                    return true;
                } catch (err: any) {
                    setCartError(translateCartError(err));
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
        [removeItem]
    );

    /**
     * ปรับเพิ่ม/ลดจำนวนสินค้าทีละ delta (เช่น +1 หรือ -1)
     */
    const updateQuantity = useCallback(
        async (itemId: string, delta: number): Promise<boolean> => {
            const target = cart.find((line) => line.id === itemId);
            if (!target) return false;
            return setItemQuantity(itemId, target.quantity + delta);
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
                        axios.delete(`/api/cart-item/delete/${line.id}`)
                    )
                );
            } finally {
                setCartLoading(false);
            }
        }

        setCart([]);
        saveLocalCart([]);
    }, [cart]);

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
