export type OrderItemRow = {
    product_id: number;
    qty: number;
    unit_price_cents: number;
    subtotal_cents: number;
};

export type OrderRow = {
    id: number;
    customer_id: number;
    status: 'CREATED' | 'CONFIRMED' | 'CANCELED';
    total_cents: number;
    items: OrderItemRow[];
};

export interface OrderRepository {
    getById(id: number): Promise<OrderRow | null>;
    createWithItemsAndDecrementStock(input: { customer_id: number; total_cents: number; items: OrderItemRow[] }): Promise<OrderRow>;
    confirm(orderId: number): Promise<OrderRow>;
    cancel(orderId: number): Promise<OrderRow>;
}
