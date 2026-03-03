import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { InventoryModule } from './inventory/inventory.module';
import { ProjectionModule } from './projection/projection.module';
import { ReportingModule } from './reporting/reporting.module';
import { AutomationModule } from './automation/automation.module';
import { IntegrationModule } from './integration/integration.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    CqrsModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    PrismaModule,
    InventoryModule,
    ProjectionModule,
    ReportingModule,
    AutomationModule,
    IntegrationModule,
    HealthModule,
  ],
})
export class AppModule {}
