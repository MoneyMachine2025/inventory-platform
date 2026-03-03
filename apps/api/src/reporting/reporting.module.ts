import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReportingController],
})
export class ReportingModule {}
