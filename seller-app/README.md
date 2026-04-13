# FreshMart Seller App

## Start

From repo root:

```bash
npm install --prefix seller-app
npm run start --prefix seller-app
```

Or inside app directory:

```bash
cd seller-app
npm install
npm run start
```

## P0-3-3 Selection

- Architecture selection is **two independent Expo projects**:
  - `buyer-app` for buyer role
  - `seller-app` for seller role
- The two projects are **directory-isomorphic** (`app`, `src/api`, `src/store`, `src/constants`, `src/types`)
- Conflict-free startup:
  - `buyer-app` uses Expo dev port `8081`
  - `seller-app` uses Expo dev port `8082`

## P0-3-3 Scope

- Expo Router navigation scaffold
- Axios client with token header
- Token persistence by Zustand + AsyncStorage
- Real login API call: `POST /api/v1/common/auth/login` (seller account)

## Expo SDK note

- Project is pinned to Expo SDK 52 (`expo ~52.0.46`).
- Expo Go 54 cannot run this project directly.
- For real device debug, install Expo Go compatible with SDK 52, or upgrade project to SDK 54 in a dedicated task.

## API base URL

Configure `EXPO_PUBLIC_API_BASE_URL` when needed.

Examples:

- Android emulator: `http://10.0.2.2:8080`
- iOS simulator: `http://127.0.0.1:8080`
- Real device: `http://<your-lan-ip>:8080`
