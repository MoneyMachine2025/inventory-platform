# API Testing Guide (cURL)

## Health Check

```bash
curl -s http://localhost:3000/health | jq
```

## Post Inventory Event

### Sample Receipt Event
```bash
curl -X POST http://localhost:3000/inventory/events?tenant_id=test-tenant-001 \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "RECEIPT",
    "effectiveAt": "2026-03-03T22:00:00Z",
    "skuId": "sku-123",
    "warehouseId": "wh-456",
    "qtyDelta": 100,
    "sourceSystem": "shopify",
    "sourceRef": "order-789"
  }' | jq
```

### Sample Ship Event
```bash
curl -X POST http://localhost:3000/inventory/events?tenant_id=test-tenant-001 \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "SHIP",
    "effectiveAt": "2026-03-03T23:00:00Z",
    "skuId": "sku-123",
    "warehouseId": "wh-456",
    "qtyDelta": -25,
    "sourceSystem": "ecommerce",
    "sourceRef": "sale-456"
  }' | jq
```

### Sample Reserve Event
```bash
curl -X POST http://localhost:3000/inventory/events?tenant_id=test-tenant-001 \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "RESERVE",
    "effectiveAt": "2026-03-03T23:30:00Z",
    "skuId": "sku-123",
    "warehouseId": "wh-456",
    "qtyDelta": 10,
    "sourceSystem": "order-system",
    "sourceRef": "reserve-789"
  }' | jq
```

## Get Events (Ledger Query)

```bash
curl -s "http://localhost:3000/inventory/events?tenant_id=test-tenant-001" | jq
```

Filter by SKU:
```bash
curl -s "http://localhost:3000/inventory/events?tenant_id=test-tenant-001&sku_id=sku-123" | jq
```

## Refresh Projections

### Refresh Specific Balance
```bash
curl -X POST "http://localhost:3000/projections/refresh-balance?tenant_id=test-tenant-001&sku_id=sku-123&warehouse_id=wh-456" | jq
```

### Refresh All Projections
```bash
curl -X POST "http://localhost:3000/projections/refresh-all?tenant_id=test-tenant-001" | jq
```

## Query Projections (Fast)

### Get Balance for SKU/Warehouse
```bash
curl -s "http://localhost:3000/projections/inventory-balance?tenant_id=test-tenant-001&sku_id=sku-123&warehouse_id=wh-456" | jq
```

## Reporting

### Inventory Summary
```bash
curl -s "http://localhost:3000/reporting/inventory-summary?tenant_id=test-tenant-001" | jq
```

### Low Stock Items
```bash
curl -s "http://localhost:3000/reporting/low-stock?tenant_id=test-tenant-001&threshold=50" | jq
```

## Automation

### Create Rule
```bash
curl -X POST "http://localhost:3000/automation/rules?tenant_id=test-tenant-001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Low Stock Alert",
    "ruleType": "LOW_INVENTORY",
    "trigger": {"type": "inventory_level_change"},
    "condition": {"field": "available", "op": "lt", "value": 20},
    "action": {"type": "create_suggestion", "actionType": "reorder"}
  }' | jq
```

### Get Suggestions
```bash
curl -s "http://localhost:3000/automation/suggestions?tenant_id=test-tenant-001" | jq
```

## Performance Testing

### Measure Projection Query Latency

```bash
time curl -s "http://localhost:3000/projections/inventory-balance?tenant_id=test-tenant-001&sku_id=sku-123&warehouse_id=wh-456" > /dev/null
```

Expected output:
```
real    0m0.020s    ← Should be < 20ms
user    0m0.005s
sys     0m0.003s
```

### Batch Test (100 requests)

```bash
#!/bin/bash
for i in {1..100}; do
  curl -s "http://localhost:3000/projections/inventory-balance?tenant_id=test-tenant-001&sku_id=sku-123&warehouse_id=wh-456" > /dev/null
done
echo "✅ 100 requests completed"
```

## Complete End-to-End Flow

```bash
#!/bin/bash

TENANT="test-tenant-001"
SKU="sku-test-$(date +%s)"
WH="wh-test"

echo "1. Post receipt (100 units)..."
curl -X POST "http://localhost:3000/inventory/events?tenant_id=$TENANT" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventType\": \"RECEIPT\",
    \"effectiveAt\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
    \"skuId\": \"$SKU\",
    \"warehouseId\": \"$WH\",
    \"qtyDelta\": 100,
    \"sourceSystem\": \"test\",
    \"sourceRef\": \"order-1\"
  }" | jq '.id'

echo -e "\n2. Refresh projections..."
curl -X POST "http://localhost:3000/projections/refresh-balance?tenant_id=$TENANT&sku_id=$SKU&warehouse_id=$WH" | jq

echo -e "\n3. Query projection (<20ms expected)..."
time curl -s "http://localhost:3000/projections/inventory-balance?tenant_id=$TENANT&sku_id=$SKU&warehouse_id=$WH" | jq

echo -e "\n4. Post ship (25 units)..."
curl -X POST "http://localhost:3000/inventory/events?tenant_id=$TENANT" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventType\": \"SHIP\",
    \"effectiveAt\": \"$(date -u +'%Y-%m-%dT%H:%M:%SZ')\",
    \"skuId\": \"$SKU\",
    \"warehouseId\": \"$WH\",
    \"qtyDelta\": -25,
    \"sourceSystem\": \"test\",
    \"sourceRef\": \"sale-1\"
  }" | jq '.id'

echo -e "\n5. Refresh projections again..."
curl -X POST "http://localhost:3000/projections/refresh-balance?tenant_id=$TENANT&sku_id=$SKU&warehouse_id=$WH" | jq

echo -e "\n6. Final balance (should be 75 on_hand)..."
curl -s "http://localhost:3000/projections/inventory-balance?tenant_id=$TENANT&sku_id=$SKU&warehouse_id=$WH" | jq
```

Save as `test.sh`, then:
```bash
chmod +x test.sh
./test.sh
```

## Notes

- Replace `test-tenant-001`, `sku-123`, `wh-456` with actual IDs after seeding
- All timestamps should be ISO-8601 with Z suffix (UTC)
- Query parameters use snake_case (tenant_id, sku_id, warehouse_id)
- Body JSON uses camelCase (eventType, effectiveAt, skuId, qtyDelta)
- Idempotency: posting same (sourceSystem, sourceRef) twice returns same event
