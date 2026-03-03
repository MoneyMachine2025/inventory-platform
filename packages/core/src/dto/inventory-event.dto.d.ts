export declare enum InventoryEventType {
    RECEIPT = "RECEIPT",
    TRANSFER_OUT = "TRANSFER_OUT",
    TRANSFER_IN = "TRANSFER_IN",
    RESERVE = "RESERVE",
    UNRESERVE = "UNRESERVE",
    SHIP = "SHIP",
    RETURN = "RETURN",
    ADJUSTMENT = "ADJUSTMENT",
    QUARANTINE_IN = "QUARANTINE_IN",
    QUARANTINE_OUT = "QUARANTINE_OUT"
}
export declare class PostInventoryEventDto {
    eventType: InventoryEventType;
    effectiveAt: Date;
    skuId: string;
    warehouseId: string;
    binId?: string;
    lotCode?: string;
    serialCode?: string;
    qtyDelta: number;
    sourceSystem: string;
    sourceRef: string;
    metadata?: Record<string, any>;
}
export declare class InventoryEventResponseDto {
    id: string;
    eventType: InventoryEventType;
    effectiveAt: Date;
    recordedAt: Date;
    skuId: string;
    warehouseId: string;
    qtyDelta: number;
    idempotencyKey: string;
}
