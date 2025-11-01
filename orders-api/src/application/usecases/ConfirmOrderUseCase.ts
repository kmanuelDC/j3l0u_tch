import { IdempotencyRepository } from '../../domain/repositories/IdempotencyRepository.js';
import { OrderRepository } from '../../domain/repositories/OrderRepository.js';

export class ConfirmOrderUseCase {
    constructor(
        private orders: OrderRepository,
        private idempotency: IdempotencyRepository
    ) { }

    async execute(orderId: number, key: string) {
        const type = 'order_confirm' as const;

        const existing = await this.idempotency.find(key, type);
        if (existing) {
            if (existing.target_id !== orderId) {
                throw new Error('Idempotency key used for different target');
            }
            if (existing.response_body) {
                try { return JSON.parse(existing.response_body); }
                catch { return existing.response_body; }
            }
            return await this.orders.getById(orderId);
        }

        const confirmed = await this.orders.confirm(orderId);

        await this.idempotency.save({
            key,
            target_type: type,
            target_id: orderId,
            status: 'SUCCEEDED',
            response_body: JSON.stringify(confirmed),
        });

        return confirmed;
    }
}
