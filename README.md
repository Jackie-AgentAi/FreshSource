# FreshMart

## Quick Start (P0-1-7)

One command to start API + MySQL + Redis + Nginx:

```bash
docker compose up -d --build
```

Stop all services:

```bash
docker compose down
```

Stop and remove database/cache data:

```bash
docker compose down -v
```

## Endpoints

- API direct: `http://localhost:8080`
- API via Nginx: `http://localhost`
- Health check: `GET /health`
- Swagger UI: `http://localhost/swagger/index.html`

## Default service credentials

- MySQL
  - host: `127.0.0.1`
  - port: `3306`
  - db: `freshmart`
  - user: `freshmart`
  - password: `freshmart`
- Redis
  - host: `127.0.0.1`
  - port: `6379`

## Notes

- `migration/001_schema.sql` and `migration/002_seed.sql` are mounted into MySQL init directory and run automatically on first boot of a new `mysql-data` volume.
- To re-run initialization SQL from scratch, execute `docker compose down -v` and start again.
