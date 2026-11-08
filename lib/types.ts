/** types.ts — shared data types ทั้งแอป (อิงตาม Prisma schema & API ของ w_project_bn) */

export type Variant = {
    id: string;
    productId?: string;
    price: number | string;
    color: string;
    size: string;
    unit?: string;
    imageUrl?: string | null;
    sku?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    inventory?: {
        quantity?: number
    };
    product?: {
        id?: string;
        name: string;
        description?: string | null;
        categoryId?: string;
        isActive?: boolean;
    };
};

export type Product = {
    id: string;
    name: string;
    description?: string | null;
    categoryId?: string;
    variants?: Variant[];
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CartItemResponse = {
    id: string;
    cartId: string;
    variantId: string;
    quantity: number;
    createdAt?: string;
    updatedAt?: string;
    variant: Variant & {
        product?: {
            id?: string;
            name: string;
            description?: string | null;
            isActive?: boolean;
        };
    };
};

export type CartLine = {
    id: string; // cartItem.id (UUID จาก backend หรือ local-* กรณีไม่ได้ล็อกอิน)
    cartId?: string;
    variantId: string;
    variant: Variant;
    product: {
        name: string;
        description?: string | null;
        isActive?: boolean;
    };
    quantity: number;
    createdAt?: string;
    updatedAt?: string;
};

export type Category = {
    id: string;
    nameTh: string;
    nameEn: string;
    slug?: string;
    isActive?: boolean;
};

export type Address = {
    id: string;
    userId?: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    district: string;
    province: string;
    postalCode: string;
    isDefault?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateAddressInput = {
    recipientName: string;
    phone: string;
    addressLine: string;
    district: string;
    province: string;
    postalCode: string;
};

export type ShippingMethod = "STANDARD" | "EXPRESS";

export type OrderStatus =
    | "PENDING"
    | "PAID"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "DELIVERY_FAILED"
    | "RETURN";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";

export type Order = {
    id: string;
    userId: string;
    shippingName: string;
    shippingPhone: string;
    shippingAddressLine: string;
    shippingDistrict: string;
    shippingProvince: string;
    shippingPostalCode: string;
    courierName?: string | null;
    trackingNumber?: string | null;
    shippedAt?: string | null;
    shippingFee: number | string;
    shippingMethod: ShippingMethod;
    subtotalAmount: number | string;
    totalAmount: number | string;
    cancelledReason?: string | null;
    status: OrderStatus;
    expiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type Payment = {
    id: string;
    orderId: string;
    status: PaymentStatus;
    method: string;
    amount: number | string;
    transactionRef?: string | null;
    paidAt?: string | null;
    createdAt: string;
};

export type CheckoutResponse = {
    order: Order;
    payment: Payment;
};

export type CheckoutStage = "cart" | "address" | "payment" | "done";
