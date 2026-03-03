import {
  generateIdempotencyKey,
  validateQtyDelta,
  validateSerialQty,
} from './idempotency';

describe('Idempotency', () => {
  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys for the same input', () => {
      const key1 = generateIdempotencyKey('shopify', 'order-123');
      const key2 = generateIdempotencyKey('shopify', 'order-123');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different sources', () => {
      const key1 = generateIdempotencyKey('shopify', 'order-123');
      const key2 = generateIdempotencyKey('amazon', 'order-123');
      expect(key1).not.toBe(key2);
    });
  });

  describe('validateQtyDelta', () => {
    it('should accept positive quantities', () => {
      expect(() => validateQtyDelta(10)).not.toThrow();
    });

    it('should accept negative quantities', () => {
      expect(() => validateQtyDelta(-5)).not.toThrow();
    });

    it('should reject zero quantities', () => {
      expect(() => validateQtyDelta(0)).toThrow('Quantity delta cannot be zero');
    });

    it('should handle string inputs', () => {
      expect(() => validateQtyDelta('10')).not.toThrow();
      expect(() => validateQtyDelta('0')).toThrow();
    });
  });

  describe('validateSerialQty', () => {
    it('should accept serial movements with qty ±1', () => {
      expect(() => validateSerialQty('SN-123', 1)).not.toThrow();
      expect(() => validateSerialQty('SN-123', -1)).not.toThrow();
    });

    it('should reject serial movements with qty != ±1', () => {
      expect(() => validateSerialQty('SN-123', 2)).toThrow('Serial movements must have qty delta of ±1');
    });

    it('should not validate if no serial code', () => {
      expect(() => validateSerialQty(null, 100)).not.toThrow();
      expect(() => validateSerialQty(undefined, 100)).not.toThrow();
    });
  });
});
