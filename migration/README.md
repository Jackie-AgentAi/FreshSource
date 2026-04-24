# Migration Usage

This directory contains idempotent SQL migrations for `P0-1-4`.

## Files

- `001_schema.sql`: create schema with `CREATE TABLE IF NOT EXISTS`
- `002_seed.sql`: seed categories, `system_configs`, and super admin with upsert
- `003_cart_items_deleted_at.sql`: cart soft-delete column fix（按需）
- `004_seed_seller_demo_products.sql`: 测试卖家 6 条模拟商品（审核中），依赖 `002_seed`

## Run Order

```bash
mysql -u<user> -p<password> <database_name> < migration/001_schema.sql
mysql -u<user> -p<password> <database_name> < migration/002_seed.sql
mysql -u<user> -p<password> <database_name> < migration/004_seed_seller_demo_products.sql
```

## Idempotency Check (P0-1-4 AC)

Run the two commands above twice on an empty database.  
Expected: no SQL error on second run, and seeded data remains consistent.
