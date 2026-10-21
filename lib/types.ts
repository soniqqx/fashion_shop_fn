/** types.ts — shared data types ทั้งแอป */
export type Variant = {
    id: string;
    price: number | string;
    color: string;
    size: string;
    unit?: string;
    imageUrl?: string | null;
    sku?: string;
    isActive?: boolean;
};
export type Product = {
    id: string;
    name: string;
    description?: string | null;
    categoryId?: string;
    variants?: Variant[];
    isActive?: boolean;
};
export type CartLine = {
    id: string;
    variant: Variant;
    product: { name: string };
    quantity: number;
};
export type Category = {
    id: string;
    nameTh: string;
    nameEn: string;
    isActive?: boolean;
};
export type CheckoutStage = "address" | "payment" | "done";
