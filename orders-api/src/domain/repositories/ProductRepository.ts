import { Product } from "../entities/Product.js";


export interface ProductRepository {
    findById(id: number): Promise<Product | null>;
    create(input: Omit<Product, 'id'>): Promise<Product>;
    patch(id: number, data: Partial<Omit<Product, 'id'>>): Promise<Product>;
    findMany(params: { search?: string; limit: number; cursor?: number }): Promise<{
        items: Product[];
        nextCursor?: number;
    }>;
}
