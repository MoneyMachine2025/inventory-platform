import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryEventType, PostInventoryEventDto } from '@inventory/core';
import { Decimal } from '@prisma/client/runtime/library';

describe('InventoryService', () => {
  let service: InventoryService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    inventoryEvent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postEvent', () => {
    it('should post a valid receipt event', async () => {
      const tenantId = 'tenant-123';
      const dto: PostInventoryEventDto = {
        eventType: InventoryEventType.RECEIPT,
        effectiveAt: new Date(),
        skuId: 'sku-123',
        warehouseId: 'wh-456',
        qtyDelta: 100,
        sourceSystem: 'shopify',
        sourceRef: 'order-789',
      };

      const mockEvent = {
        id: 'evt-001',
        eventType: dto.eventType,
        effectiveAt: dto.effectiveAt,
        recordedAt: new Date(),
        skuId: dto.skuId,
        warehouseId: dto.warehouseId,
        qtyDelta: new Decimal(dto.qtyDelta),
        idempotencyKey: expect.any(String),
      };

      mockPrismaService.inventoryEvent.create.mockResolvedValueOnce(mockEvent);

      const result = await service.postEvent(tenantId, dto);

      expect(result).toMatchObject({
        id: 'evt-001',
        eventType: 'RECEIPT',
        skuId: 'sku-123',
        warehouseId: 'wh-456',
      });

      expect(mockPrismaService.inventoryEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            eventType: InventoryEventType.RECEIPT,
            skuId: dto.skuId,
            qtyDelta: new Decimal(dto.qtyDelta),
          }),
        }),
      );
    });

    it('should reject zero quantities', async () => {
      const tenantId = 'tenant-123';
      const dto: PostInventoryEventDto = {
        eventType: InventoryEventType.RECEIPT,
        effectiveAt: new Date(),
        skuId: 'sku-123',
        warehouseId: 'wh-456',
        qtyDelta: 0,
        sourceSystem: 'shopify',
        sourceRef: 'order-789',
      };

      await expect(service.postEvent(tenantId, dto)).rejects.toThrow(
        'Quantity delta cannot be zero',
      );
    });

    it('should handle idempotent posting (duplicate requests)', async () => {
      const tenantId = 'tenant-123';
      const dto: PostInventoryEventDto = {
        eventType: InventoryEventType.RECEIPT,
        effectiveAt: new Date(),
        skuId: 'sku-123',
        warehouseId: 'wh-456',
        qtyDelta: 100,
        sourceSystem: 'shopify',
        sourceRef: 'order-789',
      };

      const mockEvent = {
        id: 'evt-001',
        eventType: dto.eventType,
        effectiveAt: dto.effectiveAt,
        recordedAt: new Date(),
        skuId: dto.skuId,
        warehouseId: dto.warehouseId,
        qtyDelta: new Decimal(dto.qtyDelta),
        idempotencyKey: expect.any(String),
      };

      // First call creates event
      mockPrismaService.inventoryEvent.create.mockResolvedValueOnce(mockEvent);
      await service.postEvent(tenantId, dto);

      // Second call gets unique constraint error
      const uniqueConstraintError = new Error('Unique constraint failed');
      (uniqueConstraintError as any).code = 'P2002';
      mockPrismaService.inventoryEvent.create.mockRejectedValueOnce(uniqueConstraintError);

      // Should return existing event
      mockPrismaService.inventoryEvent.findUnique.mockResolvedValueOnce(mockEvent);

      const result = await service.postEvent(tenantId, dto);

      expect(result.id).toBe('evt-001');
      expect(mockPrismaService.inventoryEvent.findUnique).toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    it('should retrieve events for a tenant', async () => {
      const tenantId = 'tenant-123';
      const mockEvents = [
        {
          id: 'evt-001',
          eventType: 'RECEIPT',
          skuId: 'sku-123',
          qtyDelta: new Decimal(100),
        },
      ];

      mockPrismaService.inventoryEvent.findMany.mockResolvedValueOnce(mockEvents);

      const result = await service.getEvents(tenantId);

      expect(result).toEqual(mockEvents);
      expect(mockPrismaService.inventoryEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
    });

    it('should filter events by SKU', async () => {
      const tenantId = 'tenant-123';
      const skuId = 'sku-123';

      mockPrismaService.inventoryEvent.findMany.mockResolvedValueOnce([]);

      await service.getEvents(tenantId, { skuId });

      expect(mockPrismaService.inventoryEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ skuId }),
        }),
      );
    });
  });
});
