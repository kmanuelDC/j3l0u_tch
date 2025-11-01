// src/domain/repositories/IdempotencyRepository.ts
export type IdempotencyRow = {
    key: string;
    target_type: 'order_create' | 'order_confirm';
    target_id: number | null;
    status: 'CREATED' | 'SUCCEEDED' | 'FAILED';
    response_body: string | null;
};

export interface IdempotencyRepository {
    find(key: string, targetType: IdempotencyRow['target_type']): Promise<IdempotencyRow | null>;
    save(row: Omit<IdempotencyRow, 'response_body'> & { response_body?: string | null }): Promise<void>;
    update(
        key: string,
        targetType: IdempotencyRow['target_type'],
        data: Partial<IdempotencyRow>
    ): Promise<void>;
}
