/**
 * Entidad de dominio que representa un producto en el sistema.
 * Se utiliza dentro de los casos de uso y repositorios de Orders.
 */
export type Product = {
    /** Identificador único del producto */
    id: number;

    /** Código SKU (Stock Keeping Unit) único */
    sku: string;

    /** Nombre descriptivo del producto */
    name: string;

    /** Precio en centavos (por ejemplo: 129900 = 1299.00) */
    price_cents: number;

    /** Stock actual disponible en unidades */
    stock: number;

    /** Fecha de creación opcional (según base de datos) */
    created_at?: Date;
};
