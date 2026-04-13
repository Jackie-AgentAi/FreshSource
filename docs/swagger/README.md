# Swagger Integration

This project uses `swag` for API documentation.

## Generate OpenAPI docs

Run from repository root:

```bash
swag init -g cmd/server/main.go -o docs/swagger
```

Then open:

- `http://localhost:8080/swagger/index.html`

## Current annotated endpoints

- `GET /api/v1/common/auth/dev-token` (auth)
- `POST /api/v1/common/tx-demo/commit` (business demo)
- `POST /api/v1/common/tx-demo/rollback` (business demo)
