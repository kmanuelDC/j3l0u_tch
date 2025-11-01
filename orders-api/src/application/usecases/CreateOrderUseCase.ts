// src/application/usecases/CreateOrderUseCase.ts
import { z } from 'zod';
import { ProductRepository } from '../../domain/repositories/ProductRepository.js';
import { OrderRepository } from '../../domain/repositories/OrderRepository.js';

export const CreateOrderSchema = z.object({
    customer_id: z.number().positive(),
    items: z.array(
        z.object({
            product_id: z.number().positive(),
            qty: z.number().int().positive(),
        })
    ).min(1),
});

export class CreateOrderUseCase {
    constructor(
        private products: ProductRepository,
        private orders: OrderRepository
    ) { }

    async execute(input: z.infer<typeof CreateOrderSchema>) {
        const { customer_id, items } = CreateOrderSchema.parse(input);

        let total = 0;
        const priced: { product_id: number; qty: number; unit_price_cents: number; subtotal_cents: number }[] = [];

        for (const it of items) {
            const p = await this.products.findById(it.product_id);
            if (!p) throw new Error(`Product ${it.product_id} not found`);
            if (p.stock < it.qty) throw new Error(`Insufficient stock for product ${it.product_id}`);
            const subtotal = p.price_cents * it.qty;
            total += subtotal;
            priced.push({
                product_id: it.product_id,
                qty: it.qty,
                unit_price_cents: p.price_cents,
                subtotal_cents: subtotal,
            });
        }

        const order = await this.orders.createWithItemsAndDecrementStock({
            customer_id,
            total_cents: total,
            items: priced,
        });

        return order;
    }
}
