import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostInventoryEventDto } from '@inventory/core';
import { generateIdempotencyKey, validateQtyDelta, validateSerialQty } from '@inventory/core';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async postEvent(tenantId: string, dto: PostInventoryEventDto) {
    // Validate
    validateQtyDelta(dto.qtyDelta);
    validateSerialQty(dto.serialCode, dto.qtyDelta);

    // Generate idempotency key
    const idempotencyKey = generateIdempotencyKey(dto.sourceSystem, dto.sourceRef);

    try {
      const event = await this.prisma.inventoryEvent.create({
        data: {
          tenantId,
          eventType: dto.eventType,
          effectiveAt: new Date(dto.effectiveAt),
          recordedAt: new Date(),
          skuId: dto.skuId,
          warehouseId: dto.warehouseId,
          binId: dto.binId,
          lotCode: dto.lotCode,
          serialCode: dto.serialCode,
          qtyDelta: new Decimal(dto.qtyDelta),
          sourceSystem: dto.sourceSystem,
          sourceRef: dto.sourceRef,
          idempotencyKey,
          metadata: dto.metadata || {},
        },
      });

      return {
        id: event.id,
        eventType: event.eventType,
        effectiveAt: event.effectiveAt,
        recordedAt: event.recordedAt,
        skuId: event.skuId,
        warehouseId: event.warehouseId,
        qtyDelta: event.qtyDelta.toString(),
        idempotencyKey: event.idempotencyKey,
      };
    } catch (error: any) {
      // Check if it's a unique constraint violation (idempotency key already exists)
      if (error?.code === 'P2002') {
        // Return the existing event (idempotent)
        const existing = await this.prisma.inventoryEvent.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId,
              idempotencyKey,
            },
          },
        });
        if (!existing) {
          throw error;
        }
        return {
          id: existing.id,
          eventType: existing.eventType,
          effectiveAt: existing.effectiveAt,
          recordedAt: existing.recordedAt,
          skuId: existing.skuId,
          warehouseId: existing.warehouseId,
          qtyDelta: existing.qtyDelta.toString(),
          idempotencyKey: existing.idempotencyKey,
        };
      }
      throw error;
    }
  }

  /**
   * Get all events for a tenant (for ledger queries, used by projections)
   */
  async getEvents(tenantId: string, filters?: {
    skuId?: string;
    warehouseId?: string;
    eventType?: string;
    since?: Date;
  }) {
    return this.prisma.inventoryEvent.findMany({
      where: {
        tenantId,
        ...(filters?.skuId && { skuId: filters.skuId }),
        ...(filters?.warehouseId && { warehouseId: filters.warehouseId }),
        ...(filters?.eventType && { eventType: filters.eventType }),
        ...(filters?.since && { effectiveAt: { gte: filters.since } }),
      },
      orderBy: { effectiveAt: 'asc' },
    });
  }
}
