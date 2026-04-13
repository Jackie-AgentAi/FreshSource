# FreshMart Admin Web

## Run

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:8000`

## P0-3-1 Acceptance Mapping

- Framework: Umi + Ant Design Pro components
- Proxy: `/api` -> `http://localhost:8080`
- Login page uses real API: `POST /api/v1/common/auth/login`
- Token strategy:
  - access token in localStorage
  - refresh token in localStorage
  - auto refresh on `code=10002` and retry request
