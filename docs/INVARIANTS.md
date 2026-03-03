# Database Invariants & Constraints

## Critical Non-Negotiables

### 1. Inventory Ledger Immutability
- `inventory_events` is **APPEND-ONLY**
- No UPDATE, no DELETE (except by explicit migration)
- Constraint: All qty_delta values must be non-zero
- Constraint: If serialCode is present, abs(qty_delta) must equal 1
- Constraint: Unique(tenant_id, idempotency_key) prevents duplicate ingestion

### 2. Cost Ledger Immutability
- `cost_events` is **APPEND-ONLY**
- No UPDATE, no DELETE
- Constraint: Unique(tenant_id, idempotency_key)

### 3. Multi-Tenancy Enforcement
Every table must have `tenant_id`:
- ✅ tenants, users, products, variants, skus, warehouses, bins
- ✅ inventory_events, cost_events
- ✅ automation_rules, automation_suggestions
- ✅ inventory_balance_projections, inventory_reservation_projections

**Enforcement Method:** Application-layer query filtering (all WHERE clauses include tenant_id)

### 4. Projection Integrity
- Projections are **computed views**, not source of truth
- Can be regenerated from ledger any time
- Upsert on (tenant_id, skuId, warehouseId, binId) ensures single version of truth
- lastUpdated timestamp tracks when projection was computed

### 5. Idempotency Keys
Every event ingestion must be idempotent:
- Generate: `idempotency_key = SHA256(source_system:source_ref)`
- Store: idempotency_key in event row
- Constraint: Unique(tenant_id, idempotency_key)
- Duplicate posts return existing event (not error)

---

## Inventory Event Constraints

### Event Types
```
RECEIPT           → qty_delta > 0, on_hand increases
TRANSFER_OUT      → qty_delta < 0, on_hand decreases from source warehouse
TRANSFER_IN       → qty_delta > 0, on_hand increases in dest warehouse
RESERVE           → qty_delta > 0, reserved increases
UNRESERVE         → qty_delta < 0, reserved decreases
SHIP              → qty_delta < 0, on_hand decreases
RETURN            → qty_delta > 0, on_hand increases
ADJUSTMENT        → qty_delta can be ±, corrects inventory
QUARANTINE_IN     → qty_delta < 0, removes from available (on_hand unchanged)
QUARANTINE_OUT    → qty_delta > 0, returns to available
```

### Serial Tracking
- If SKU has `track_serial = true`:
  - One row per unique serial_code
  - abs(qty_delta) must equal 1
  - Can track individual unit location/movement
  - Example: SN-12345 moved to Warehouse A (qty_delta = +1)

### Lot Tracking
- If SKU has `track_lot = true`:
  - lot_code identifies batch/expiration date
  - qty_delta can be > 1 (whole lot movement)
  - Example: Lot-2024-001 (100 units) moved to Warehouse B

### Projection Rules
```
on_hand = SUM(qty_delta) for events where eventType IN (RECEIPT, RETURN, ADJUSTMENT, QUARANTINE_OUT)
           - SUM(abs(qty_delta)) for events where eventType IN (SHIP, TRANSFER_OUT, QUARANTINE_IN)

reserved = SUM(qty_delta) for RESERVE - SUM(abs(qty_delta)) for UNRESERVE

available = on_hand - reserved
```

---

## Cost Event Constraints

### Cost Types
```
FREIGHT           → Shipping cost
INSURANCE         → Insurance cost
DUTY              → Customs duty
BROKERAGE         → Brokerage fees
INBOUND_SHIPPING  → Inbound logistics
WAREHOUSE_FEE     → Warehouse handling
OTHER             → Miscellaneous
```

### Allocation Methods (Future)
- Per unit: cost / units
- By weight: (weight / total_weight) * cost
- By volume: (volume / total_volume) * cost
- By value: (unit_cost / total_cost) * cost

### Late-Arriving Costs
- Costs can be effective_at dates in the past
- COGS recalculation is idempotent (use idempotency_key)

---

## Database Indexes

### Must-Have Indexes (for <20ms queries)
```sql
-- Inventory Ledger
CREATE INDEX idx_inventory_events_tenant_sku_wh 
  ON inventory_events(tenant_id, sku_id, warehouse_id);

CREATE INDEX idx_inventory_events_tenant_effective_at 
  ON inventory_events(tenant_id, effective_at DESC);

CREATE INDEX idx_inventory_events_idempotency 
  ON inventory_events(tenant_id, idempotency_key);

-- Projection Tables (hot path)
CREATE INDEX idx_inventory_balance_tenant_sku_wh 
  ON inventory_balance_projections(tenant_id, sku_id, warehouse_id);

CREATE INDEX idx_inventory_reservation_tenant_sku 
  ON inventory_reservation_projections(tenant_id, sku_id);

-- Automation
CREATE INDEX idx_automation_suggestions_tenant_status_expires 
  ON automation_suggestions(tenant_id, status, expires_at);
```

---

## Invariant Tests

All of these must be tested at the database level:

### ✅ Test 1: Idempotency
```sql
-- Posting same event twice returns same event ID
INSERT INTO inventory_events (tenant_id, event_type, sku_id, warehouse_id, 
  qty_delta, source_system, source_ref, idempotency_key, effective_at)
VALUES ('t1', 'RECEIPT', 'sku1', 'wh1', 100, 'shopify', 'ord123', 
  'hash1', NOW());

-- Should fail with unique constraint, not create duplicate
INSERT INTO inventory_events (tenant_id, event_type, sku_id, warehouse_id, 
  qty_delta, source_system, source_ref, idempotency_key, effective_at)
VALUES ('t1', 'RECEIPT', 'sku1', 'wh1', 100, 'shopify', 'ord123', 
  'hash1', NOW());
-- ERROR: duplicate key value violates unique constraint
```

### ✅ Test 2: Zero Qty Validation
```sql
-- Application must reject before INSERT, but constraint helps:
-- Can add: ADD CONSTRAINT qty_delta_not_zero CHECK (qty_delta != 0);
```

### ✅ Test 3: Serial Constraint
```sql
-- If serial_code is NOT NULL, abs(qty_delta) must be 1
-- Can add: ADD CONSTRAINT serial_qty_constraint 
--   CHECK (serial_code IS NULL OR abs(qty_delta) = 1);
```

### ✅ Test 4: Multi-Tenancy Isolation
```sql
-- Verify no cross-tenant data leaks
SELECT * FROM inventory_events WHERE tenant_id != 't1' AND ... -- Should be empty
```

### ✅ Test 5: Projection Consistency
```sql
-- Recompute projections and verify against fresh ledger scan
SELECT SUM(qty_delta) FROM inventory_events WHERE tenant_id='t1' AND sku_id='sku1'
  AND warehouse_id='wh1' AND event_type IN ('RECEIPT', 'RETURN', ...);
-- Should equal projection.on_hand
```

---

## Migration Strategy

### Adding New Columns
- ✅ Safe: Add new columns to existing tables
- ✅ Safe: Add default values
- ❌ Unsafe: Remove columns from ledger tables

### Schema Changes
- Always use Prisma migrations
- Test in dev environment first
- Idempotent migrations (use IF NOT EXISTS)
- No breaking changes to ledger structure

### Data Integrity
- On major deployments, run projection refresh jobs
- Audit logs verify all events ingested correctly
- Ledger can be queried directly to reconstruct state

---

## Compliance & Audit

### Ledger as Audit Trail
- Every event is immutable
- effective_at tracks economic time, recorded_at tracks ingestion time
- Metadata JSON can store context (user, reason, source)
- Full history available for compliance queries

### Tenant Isolation
- Data physically separated by tenant_id
- Row-level security enforced at query layer
- No cross-tenant queries unless explicitly allowed

### Performance SLA
- Inventory balance query: < 20ms (from projection)
- Dashboard load: < 100ms (aggregated projections)
- Full ledger scan (audit): < 1s (with indexes)
