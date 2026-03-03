import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PostInventoryEventHandler } from './commands/post-inventory-event.handler';

const CommandHandlers = [PostInventoryEventHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [InventoryController],
  providers: [InventoryService, ...CommandHandlers],
  exports: [InventoryService],
})
export class InventoryModule {}
