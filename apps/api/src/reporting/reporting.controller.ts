import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('reporting')
export class ReportingController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get inventory summary by warehouse
   */
  @Get('inventory-summary')
  async getInventorySummary(@Query('tenant_id') tenantId: string) {
    const summary = await this.prisma.inventoryBalanceProjection.groupBy({
      by: ['warehouseId'],
      where: { tenantId },
      _sum: {
        onHand: true,
        available: true,
      },
    });

    return {
      summary,
      timestamp: new Date(),
    };
  }

  /**
   * Get low stock items
   */
  @Get('low-stock')
  async getLowStock(
    @Query('tenant_id') tenantId: string,
    @Query('threshold') threshold: string = '10',
  ) {
    const items = await this.prisma.inventoryBalanceProjection.findMany({
      where: {
        tenantId,
        available: {
          lt: parseInt(threshold, 10),
        },
      },
      take: 100,
    });

    return {
      items,
      count: items.length,
    };
  }
}
