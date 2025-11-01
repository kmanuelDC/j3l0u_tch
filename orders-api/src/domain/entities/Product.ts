
export type Product = {
    id: number;
    sku: string;
    name: string;
    price_cents: number;
    stock: number;
    created_at?: Date;
};
