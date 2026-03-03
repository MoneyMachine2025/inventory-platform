import { createHash } from 'crypto';

/**
 * Generates a stable idempotency key from a source system and reference
 * Used to ensure that posting the same event twice results in the same outcome
 */
export function generateIdempotencyKey(sourceSystem: string, sourceRef: string): string {
  return createHash('sha256')
    .update(`${sourceSystem}:${sourceRef}`)
    .digest('hex');
}

/**
 * Validates that an inventory event has non-zero quantity
 */
export function validateQtyDelta(qtyDelta: number | string): void {
  const qty = typeof qtyDelta === 'string' ? parseFloat(qtyDelta) : qtyDelta;
  if (qty === 0) {
    throw new Error('Quantity delta cannot be zero');
  }
}

/**
 * For serial tracking, ensures qty is ±1
 */
export function validateSerialQty(serialCode: string | null | undefined, qtyDelta: number | string): void {
  if (!serialCode) return;
  const qty = typeof qtyDelta === 'string' ? parseFloat(qtyDelta) : qtyDelta;
  if (Math.abs(qty) !== 1) {
    throw new Error('Serial movements must have qty delta of ±1');
  }
}
