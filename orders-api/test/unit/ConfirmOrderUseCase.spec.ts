import { describe, it, expect, vi } from 'vitest';
import { ConfirmOrderUseCase } from '../../src/application/usecases/ConfirmOrderUseCase';

describe('ConfirmOrderUseCase', () => {
    it('devuelve el mismo resultado con la misma key', async () => {
        const mockOrder = { id: 1, status: 'CONFIRMED', total_cents: 1000, items: [] };
        const orders = { confirm: vi.fn().mockResolvedValue(mockOrder) } as any;
        const idem = {
            find: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockResolvedValue(void 0),
            update: vi.fn().mockResolvedValue(void 0)
        } as any;
        const uc = new ConfirmOrderUseCase(orders, idem);
        const key = 'abc-123';
        const r1 = await uc.execute(1, key);
        expect(r1).toEqual(mockOrder);
        // segunda vez finge que existe
        idem.find.mockResolvedValue({ status: 'SUCCEEDED', response_body: JSON.stringify(mockOrder) });
        const r2 = await uc.execute(1, key);
        expect(r2).toEqual(mockOrder);
        expect(orders.confirm).toHaveBeenCalledTimes(1);
    });
});