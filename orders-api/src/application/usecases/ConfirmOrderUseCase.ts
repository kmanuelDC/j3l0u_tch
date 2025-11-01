// src/application/usecases/ConfirmOrderUseCase.ts
import { IdempotencyRepository } from '../../domain/repositories/IdempotencyRepository.js';
import { OrderRepository } from '../../domain/repositories/OrderRepository.js';

export class ConfirmOrderUseCase {
    constructor(
        private orders: OrderRepository,
        private idempotency: IdempotencyRepository
    ) { }

    async execute(orderId: number, key: string) {

        const existing = await this.idempotency.find(key);
        console.log('existing', existing);
        if (existing) {
            if (existing.target_type !== 'order_confirm' || existing.target_id !== orderId) {
                throw new Error('Idempotency key used for different target');
            }
            if (existing.response_body) {
                try {
                    return JSON.parse(existing.response_body);
                } catch {
                    return existing.response_body;
                }
            }
            return await this.orders.getById(orderId);
        }

        const confirmed = await this.orders.confirm(orderId);

        await this.idempotency.save({
            key,
            target_type: 'order_confirm',
            target_id: orderId,
            status: 'SUCCESS',
            response_body: JSON.stringify(confirmed),
        });

        return confirmed;
    }
}
