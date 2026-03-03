import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an automation rule
   * Rules are optional and can be enabled/disabled per tenant
   */
  async createRule(tenantId: string, rule: {
    name: string;
    ruleType: string;
    trigger: Record<string, any>;
    condition: Record<string, any>;
    action: Record<string, any>;
  }) {
    return this.prisma.automationRule.create({
      data: {
        tenantId,
        ...rule,
      },
    });
  }

  /**
   * Create an automation suggestion (output of a rule)
   * Suggestions never mutate the ledger directly
   * They are advisory; when accepted, they create events
   */
  async createSuggestion(tenantId: string, suggestion: {
    ruleId: string;
    skuId: string;
    warehouseId: string;
    suggestionType: string;
    payload: Record<string, any>;
    expiresAt: Date;
  }) {
    return this.prisma.automationSuggestion.create({
      data: {
        tenantId,
        ...suggestion,
      },
    });
  }

  /**
   * Accept a suggestion (user approves it)
   * This would trigger the actual action (e.g., create a purchase order event)
   */
  async acceptSuggestion(tenantId: string, suggestionId: string) {
    const suggestion = await this.prisma.automationSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'ACCEPTED' },
    });

    this.logger.log(`Accepted suggestion ${suggestionId}`);
    return suggestion;
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(tenantId: string, suggestionId: string) {
    return this.prisma.automationSuggestion.update({
      where: { id: suggestionId },
      data: { status: 'REJECTED' },
    });
  }

  /**
   * Get pending suggestions for a tenant
   */
  async getPendingSuggestions(tenantId: string) {
    return this.prisma.automationSuggestion.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        expiresAt: { gte: new Date() },
      },
    });
  }
}
