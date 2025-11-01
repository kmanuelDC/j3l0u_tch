import { z } from 'zod';
import { CustomerRepository } from '../../domain/repositories/CustomerRepository.js';


export const CreateCustomerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional()
});

export class CreateCustomerUseCase {
    constructor(private repo: CustomerRepository) { }
    async execute(input: z.infer<typeof CreateCustomerSchema>) {
        const data = CreateCustomerSchema.parse(input);
        return this.repo.create(data);
    }
}