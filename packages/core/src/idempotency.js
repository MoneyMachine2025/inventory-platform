"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.validateQtyDelta = validateQtyDelta;
exports.validateSerialQty = validateSerialQty;
const crypto_1 = require("crypto");
/**
 * Generates a stable idempotency key from a source system and reference
 * Used to ensure that posting the same event twice results in the same outcome
 */
function generateIdempotencyKey(sourceSystem, sourceRef) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${sourceSystem}:${sourceRef}`)
        .digest('hex');
}
/**
 * Validates that an inventory event has non-zero quantity
 */
function validateQtyDelta(qtyDelta) {
    const qty = typeof qtyDelta === 'string' ? parseFloat(qtyDelta) : qtyDelta;
    if (qty === 0) {
        throw new Error('Quantity delta cannot be zero');
    }
}
/**
 * For serial tracking, ensures qty is ±1
 */
function validateSerialQty(serialCode, qtyDelta) {
    if (!serialCode)
        return;
    const qty = typeof qtyDelta === 'string' ? parseFloat(qtyDelta) : qtyDelta;
    if (Math.abs(qty) !== 1) {
        throw new Error('Serial movements must have qty delta of ±1');
    }
}
//# sourceMappingURL=idempotency.js.map