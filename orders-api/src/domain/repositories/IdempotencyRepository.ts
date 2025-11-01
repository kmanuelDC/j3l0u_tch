export type IdempotencyRow = {
    key: string;
    target_type: string;         // e.g. 'order'
    target_id: number | null;
    status: 'CREATED' | 'SUCCEEDED' | 'FAILED';
    response_body: string | null;
};

export interface IdempotencyRepository {
    find(key: string): Promise<IdempotencyRow | null>;
    save(row: Omit<IdempotencyRow, 'response_body'> & { response_body?: string | null }): Promise<void>;
    update(key: string, data: Partial<IdempotencyRow>): Promise<void>;
}
