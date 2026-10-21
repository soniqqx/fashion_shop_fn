/**
 * context/CartContext.tsx
 * Global cart state — ใช้ useCart() hook ในทุก component
 */
"use client";
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { CartLine, Product } from "../lib/types";
interface CartContextValue {
    cart: CartLine[];
    cartCount: number;
    cartTotal: number;
    cartOpen: boolean;
    setCartOpen: (open: boolean) => void;
    addToCart: (product: Product) => void;
    updateQuantity: (id: string, delta: number) => void;
    clearCart: () => void;
}
const CartContext = createContext<CartContextValue | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const addToCart = useCallback((product: Product) => {
        const variant = product.variants?.[0];
        if (!variant) return;
        setCart((prev) => {
            const existing = prev.find((line) => line.variant.id === variant.id);
            if (existing) {
                return prev.map((line) =>
                    line.variant.id === variant.id ? { ...line, quantity: line.quantity + 1 } : line
                );
            }
            return [
                ...prev,
                { id: `local-${variant.id}`, variant, product: { name: product.name }, quantity: 1 },
            ];
        });
        setCartOpen(true);
    }, []);
    const updateQuantity = useCallback((id: string, delta: number) => {
        setCart((lines) =>
            lines.flatMap((line) => {
                if (line.id !== id) return [line];
                const newQty = line.quantity + delta;
                return newQty > 0 ? [{ ...line, quantity: newQty }] : [];
            })
        );
    }, []);
    const clearCart = useCallback(() => setCart([]), []);
    const cartCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
    const cartTotal = useMemo(
        () => cart.reduce((s, l) => s + Number(l.variant.price) * l.quantity, 0),
        [cart]
    );
    return (
        <CartContext.Provider value={{ cart, cartCount, cartTotal, cartOpen, setCartOpen, addToCart, updateQuantity, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}
export function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be inside <CartProvider>");
    return ctx;
}
