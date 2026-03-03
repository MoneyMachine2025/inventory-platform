import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('rules')
  async createRule(
    @Query('tenant_id') tenantId: string,
    @Body() body: any,
  ) {
    return this.automationService.createRule(tenantId, body);
  }

  @Get('suggestions')
  async getSuggestions(@Query('tenant_id') tenantId: string) {
    return this.automationService.getPendingSuggestions(tenantId);
  }

  @Post('suggestions/:id/accept')
  async acceptSuggestion(
    @Query('tenant_id') tenantId: string,
    @Param('id') suggestionId: string,
  ) {
    return this.automationService.acceptSuggestion(tenantId, suggestionId);
  }

  @Post('suggestions/:id/reject')
  async rejectSuggestion(
    @Query('tenant_id') tenantId: string,
    @Param('id') suggestionId: string,
  ) {
    return this.automationService.rejectSuggestion(tenantId, suggestionId);
  }
}
