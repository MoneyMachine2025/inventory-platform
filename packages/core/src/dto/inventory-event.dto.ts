export enum InventoryEventType {
  RECEIPT = 'RECEIPT',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  RESERVE = 'RESERVE',
  UNRESERVE = 'UNRESERVE',
  SHIP = 'SHIP',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  QUARANTINE_IN = 'QUARANTINE_IN',
  QUARANTINE_OUT = 'QUARANTINE_OUT',
}

export class PostInventoryEventDto {
  // Ledger fields
  eventType!: InventoryEventType;
  effectiveAt!: Date;
  skuId!: string;
  warehouseId!: string;
  binId?: string;
  lotCode?: string;
  serialCode?: string;
  qtyDelta!: number;

  // Idempotency & source
  sourceSystem!: string;
  sourceRef!: string;

  // Optional metadata
  metadata?: Record<string, any>;
}

export class InventoryEventResponseDto {
  id!: string;
  eventType!: InventoryEventType;
  effectiveAt!: Date;
  recordedAt!: Date;
  skuId!: string;
  warehouseId!: string;
  qtyDelta!: number;
  idempotencyKey!: string;
}
