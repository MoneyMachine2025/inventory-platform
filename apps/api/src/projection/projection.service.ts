import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProjectionService {
  private readonly logger = new Logger(ProjectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Refresh inventory balance projection for a specific SKU/Warehouse
   * This reads from the ledger and computes current balances
   */
  async refreshInventoryBalance(
    tenantId: string,
    skuId: string,
    warehouseId: string,
  ) {
    const events = await this.inventoryService.getEvents(tenantId, {
      skuId,
      warehouseId,
    });

    // Compute on-hand and reserved quantities
    let onHand = new Decimal(0);
    let reserved = new Decimal(0);

    for (const event of events) {
      const qty = new Decimal(event.qtyDelta);

      switch (event.eventType) {
        case 'RECEIPT':
        case 'RETURN':
        case 'ADJUSTMENT': // Positive adjustment
        case 'QUARANTINE_OUT':
          onHand = onHand.plus(qty);
          break;

        case 'SHIP':
        case 'TRANSFER_OUT':
        case 'ADJUSTMENT': // Negative adjustment
        case 'QUARANTINE_IN':
          onHand = onHand.minus(qty);
          break;

        case 'RESERVE':
          reserved = reserved.plus(qty);
          break;

        case 'UNRESERVE':
          reserved = reserved.minus(qty);
          break;

        case 'TRANSFER_IN':
          onHand = onHand.plus(qty);
          break;
      }
    }

    const available = onHand.minus(reserved);

    // Upsert the projection
    await this.prisma.inventoryBalanceProjection.upsert({
      where: {
        tenantId_skuId_warehouseId_binId: {
          tenantId,
          skuId,
          warehouseId,
          binId: null as any,
        },
      },
      update: {
        onHand,
        reserved,
        available,
        lastUpdated: new Date(),
      },
      create: {
        tenantId,
        skuId,
        warehouseId,
        binId: null as any,
        onHand,
        reserved,
        available,
      },
    });

    this.logger.debug(
      `Refreshed balance: SKU=${skuId}, WH=${warehouseId}, onHand=${onHand}, reserved=${reserved}, available=${available}`,
    );
  }

  /**
   * Refresh reservation projection for a SKU/Warehouse
   */
  async refreshReservation(
    tenantId: string,
    skuId: string,
    warehouseId: string,
  ) {
    const events = await this.inventoryService.getEvents(tenantId, {
      skuId,
      warehouseId,
    });

    let reserved = new Decimal(0);

    for (const event of events) {
      const qty = new Decimal(event.qtyDelta);
      if (event.eventType === 'RESERVE') {
        reserved = reserved.plus(qty);
      } else if (event.eventType === 'UNRESERVE') {
        reserved = reserved.minus(qty);
      }
    }

    await this.prisma.inventoryReservationProjection.upsert({
      where: {
        tenantId_skuId_warehouseId: {
          tenantId,
          skuId,
          warehouseId,
        },
      },
      update: {
        reserved,
        lastUpdated: new Date(),
      },
      create: {
        tenantId,
        skuId,
        warehouseId,
        reserved,
      },
    });

    this.logger.debug(`Refreshed reservation: SKU=${skuId}, WH=${warehouseId}, reserved=${reserved}`);
  }

  /**
   * Full refresh of all projections for a tenant
   * Used after data migration or integrity check
   */
  async fullRefresh(tenantId: string) {
    this.logger.log(`Starting full projection refresh for tenant ${tenantId}`);

    // Get all unique SKU/Warehouse combinations in ledger
    const combinations = await this.prisma.inventoryEvent.findMany({
      where: { tenantId },
      distinct: ['skuId', 'warehouseId'],
      select: { skuId: true, warehouseId: true },
    });

    for (const combo of combinations) {
      await this.refreshInventoryBalance(tenantId, combo.skuId, combo.warehouseId);
      await this.refreshReservation(tenantId, combo.skuId, combo.warehouseId);
    }

    this.logger.log(`✅ Full projection refresh complete for tenant ${tenantId}`);
  }
}
