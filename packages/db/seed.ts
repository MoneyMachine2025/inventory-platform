import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'test-tenant-001' },
    update: {},
    create: {
      id: 'test-tenant-001',
      name: 'Acme Corp',
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // Create sample user
  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'john@acme.com',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      email: 'john@acme.com',
      role: 'ADMIN',
    },
  });
  console.log('✅ User created:', user.email);

  // Create sample product
  const product = await prisma.product.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Widget Pro',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      name: 'Widget Pro',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Product created:', product.name);

  // Create variant
  const variant = await prisma.variant.upsert({
    where: {
      tenantId_productId_name: {
        tenantId: tenant.id,
        productId: product.id,
        name: 'Blue - Medium',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      productId: product.id,
      name: 'Blue - Medium',
      attributes: { color: 'blue', size: 'M' },
    },
  });
  console.log('✅ Variant created:', variant.name);

  // Create SKU
  const sku = await prisma.sku.upsert({
    where: {
      tenantId_skuCode: {
        tenantId: tenant.id,
        skuCode: 'WIDG-PRO-BLU-M',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      variantId: variant.id,
      skuCode: 'WIDG-PRO-BLU-M',
      barcode: '123456789',
      trackSerial: false,
      trackLot: true,
      uom: 'EA',
      active: true,
    },
  });
  console.log('✅ SKU created:', sku.skuCode);

  // Create warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Main Warehouse',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      name: 'Main Warehouse',
      country: 'US',
      region: 'CA',
      timezone: 'America/Los_Angeles',
      active: true,
    },
  });
  console.log('✅ Warehouse created:', warehouse.name);

  // Create bin
  const bin = await prisma.bin.upsert({
    where: {
      tenantId_warehouseId_code: {
        tenantId: tenant.id,
        warehouseId: warehouse.id,
        code: 'A-01-01',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      warehouseId: warehouse.id,
      code: 'A-01-01',
      active: true,
    },
  });
  console.log('✅ Bin created:', bin.code);

  // Create sample inventory events
  const event1 = await prisma.inventoryEvent.upsert({
    where: {
      tenantId_idempotencyKey: {
        tenantId: tenant.id,
        idempotencyKey: 'seed-receipt-001',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      eventType: 'RECEIPT',
      effectiveAt: new Date('2026-03-01T10:00:00Z'),
      recordedAt: new Date(),
      skuId: sku.id,
      warehouseId: warehouse.id,
      binId: bin.id,
      lotCode: 'LOT-2026-001',
      qtyDelta: 100,
      sourceSystem: 'supplier-system',
      sourceRef: 'PO-001',
      idempotencyKey: 'seed-receipt-001',
    },
  });
  console.log('✅ Receipt event created:', event1.qtyDelta, 'units');

  // Create another event (shipment)
  const event2 = await prisma.inventoryEvent.upsert({
    where: {
      tenantId_idempotencyKey: {
        tenantId: tenant.id,
        idempotencyKey: 'seed-ship-001',
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      eventType: 'SHIP',
      effectiveAt: new Date('2026-03-02T15:00:00Z'),
      recordedAt: new Date(),
      skuId: sku.id,
      warehouseId: warehouse.id,
      binId: bin.id,
      lotCode: 'LOT-2026-001',
      qtyDelta: -25,
      sourceSystem: 'ecommerce',
      sourceRef: 'ORD-123',
      idempotencyKey: 'seed-ship-001',
    },
  });
  console.log('✅ Ship event created:', Math.abs(event2.qtyDelta), 'units');

  // Create inventory balance projection
  const projection = await prisma.inventoryBalanceProjection.upsert({
    where: {
      tenantId_skuId_warehouseId_binId: {
        tenantId: tenant.id,
        skuId: sku.id,
        warehouseId: warehouse.id,
        binId: bin.id,
      },
    },
    update: {
      onHand: 75,
      reserved: 0,
      available: 75,
      lastUpdated: new Date(),
    },
    create: {
      id: uuidv4(),
      tenantId: tenant.id,
      skuId: sku.id,
      warehouseId: warehouse.id,
      binId: bin.id,
      onHand: 75,
      reserved: 0,
      available: 75,
    },
  });
  console.log('✅ Projection created: on_hand=75, available=75');

  console.log('\n✨ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
