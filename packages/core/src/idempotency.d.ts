/**
 * Generates a stable idempotency key from a source system and reference
 * Used to ensure that posting the same event twice results in the same outcome
 */
export declare function generateIdempotencyKey(sourceSystem: string, sourceRef: string): string;
/**
 * Validates that an inventory event has non-zero quantity
 */
export declare function validateQtyDelta(qtyDelta: number | string): void;
/**
 * For serial tracking, ensures qty is ±1
 */
export declare function validateSerialQty(serialCode: string | null | undefined, qtyDelta: number | string): void;
