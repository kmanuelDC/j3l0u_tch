import { Customer } from "../entities/Customer.js";

export interface CustomerRepository {
    create(data: Omit<Customer, 'id'>): Promise<Customer>;
    findById(id: number): Promise<Customer | null>;
    search(query: string, limit: number, cursor?: number): Promise<{ items: Customer[]; nextCursor?: number }>;
    update(id: number, data: Partial<Pick<Customer, 'name' | 'email' | 'phone'>>): Promise<Customer>;
    softDelete(id: number): Promise<void>;
}