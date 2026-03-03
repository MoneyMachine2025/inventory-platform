import { Controller, Get, Query, Post } from '@nestjs/common';
import { ProjectionService } from './projection.service';

@Controller('projections')
export class ProjectionController {
  constructor(private readonly projectionService: ProjectionService) {}

  /**
   * Query inventory balance projection
   * Fast endpoint: <20ms expected (served directly from projection table)
   */
  @Get('inventory-balance')
  async getInventoryBalance(
    @Query('tenant_id') tenantId: string,
    @Query('sku_id') skuId?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    // This would query the pre-computed projection table
    // For now, just a placeholder
    return {
      message: 'Query projections endpoint',
      tenantId,
      skuId,
      warehouseId,
    };
  }

  /**
   * Refresh a specific inventory balance projection
   */
  @Post('refresh-balance')
  async refreshBalance(
    @Query('tenant_id') tenantId: string,
    @Query('sku_id') skuId: string,
    @Query('warehouse_id') warehouseId: string,
  ) {
    await this.projectionService.refreshInventoryBalance(tenantId, skuId, warehouseId);
    return { status: 'ok' };
  }

  /**
   * Full refresh of all projections
   */
  @Post('refresh-all')
  async refreshAll(@Query('tenant_id') tenantId: string) {
    await this.projectionService.fullRefresh(tenantId);
    return { status: 'ok' };
  }
}
