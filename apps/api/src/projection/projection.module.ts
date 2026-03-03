import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProjectionService } from './projection.service';
import { ProjectionController } from './projection.controller';

@Module({
  imports: [PrismaModule, InventoryModule],
  providers: [ProjectionService],
  controllers: [ProjectionController],
  exports: [ProjectionService],
})
export class ProjectionModule {}
