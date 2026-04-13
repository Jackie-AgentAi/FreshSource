# Frontend Conventions (P0-3-4)

Date: 2026-04-13

## Scope

This page defines baseline conventions for three clients:

- `admin-web`
- `buyer-app`
- `seller-app`

## 1) Base URL convention

- **Admin Web**
  - Browser requests use relative `/api/...` paths.
  - Dev proxy forwards `/api` to `http://localhost:8080`.
- **Buyer App / Seller App**
  - Use `EXPO_PUBLIC_API_BASE_URL` as first priority.
  - Default fallback: `http://127.0.0.1:8080`.
  - Real-device debug should switch to LAN IP.

## 2) Unified response and error handling

- All clients parse backend envelope: `{ code, message, data }`.
- `code === 0` is success.
- `code !== 0` is business failure and should surface `message`.
- Token invalid (`10002`) must be handled centrally:
  - try refresh token once,
  - retry original request on success,
  - clear auth and go to login on failure.

## 3) Loading state convention

- Login submit buttons must show submitting state.
- During submitting:
  - disable repeated taps/clicks,
  - update button text to loading hint.
- For list/detail pages, keep same pattern for future pages:
  - initial loading,
  - refreshing,
  - action-level loading.

## 4) Existing implementation mapping

- `admin-web`
  - proxy and auth refresh in `src/utils/http.ts`
- `buyer-app`
  - base URL and token error handling in `src/constants/api.ts`, `src/api/client.ts`
- `seller-app`
  - same structure as buyer app (`src/constants/api.ts`, `src/api/client.ts`)
