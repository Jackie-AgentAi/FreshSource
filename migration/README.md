# Migration Usage

This directory contains idempotent SQL migrations for `P0-1-4`.

## Files

- `001_schema.sql`: create schema with `CREATE TABLE IF NOT EXISTS`
- `002_seed.sql`: seed categories, `system_configs`, and super admin with upsert

## Run Order

```bash
mysql -u<user> -p<password> <database_name> < migration/001_schema.sql
mysql -u<user> -p<password> <database_name> < migration/002_seed.sql
```

## Idempotency Check (P0-1-4 AC)

Run the two commands above twice on an empty database.  
Expected: no SQL error on second run, and seeded data remains consistent.
