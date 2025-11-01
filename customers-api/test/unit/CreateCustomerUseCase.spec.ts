import { describe, it, expect } from 'vitest';
import { CreateCustomerUseCase } from '../../src/application/usecases/CreateCustomerUseCase';

const fakeRepo = {
    create: async (d: any) => ({ id: 1, ...d })
} as any;

describe('CreateCustomerUseCase', () => {
    it('valida y crea', async () => {
        const uc = new CreateCustomerUseCase(fakeRepo);
        const out = await uc.execute({ name: 'ACME', email: 'ops@acme.com' });
        expect(out.id).toBe(1);
    });
});