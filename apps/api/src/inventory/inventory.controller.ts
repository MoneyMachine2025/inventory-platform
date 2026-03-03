import { Controller, Post, Body, Param, Get, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PostInventoryEventDto } from '@inventory/core';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('events')
  async postEvent(
    @Body() dto: PostInventoryEventDto,
    @Query('tenant_id') tenantId: string,
  ) {
    return this.inventoryService.postEvent(tenantId, dto);
  }

  @Get('events')
  async getEvents(
    @Query('tenant_id') tenantId: string,
    @Query('sku_id') skuId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('event_type') eventType?: string,
    @Query('since') since?: string,
  ) {
    return this.inventoryService.getEvents(tenantId, {
      skuId,
      warehouseId,
      eventType,
      since: since ? new Date(since) : undefined,
    });
  }
}
