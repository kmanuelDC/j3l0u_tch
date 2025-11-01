
export type Product = {
    id: number;
    sku: string;
    name: string;
    price_cents: number;
    stock: number;
    created_at?: Date;
};


export interface ProductRepository {
    findById(id: number): Promise<Product | null>;
    create(input: Omit<Product, 'id'>): Promise<Product>;
    patch(id: number, data: Partial<Omit<Product, 'id'>>): Promise<Product>;
    findMany(params: { search?: string; limit: number; cursor?: number }): Promise<{
        items: Product[];
        nextCursor?: number;
    }>;
}
