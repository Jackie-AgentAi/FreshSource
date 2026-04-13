# FreshMart Buyer App

## Start

From repo root:

```bash
npm install --prefix buyer-app
npm run start --prefix buyer-app
```

Or inside app directory:

```bash
cd buyer-app
npm install
npm run start
```

## P0-3-2 Scope

- Expo Router navigation scaffold
- Axios client with token header
- Token persistence by Zustand + AsyncStorage
- Real login API call: `POST /api/v1/common/auth/login` (buyer account)
- Expo dev port fixed to `8081` for parallel start with seller app

## Expo SDK note

- Project is pinned to Expo SDK 54 (`expo ~54.0.0`).
- Expo Go 54 is supported.
- After pulling latest code, run dependency alignment once:
  - `npx expo install --fix`

## API base URL

Configure `EXPO_PUBLIC_API_BASE_URL` when needed.

Examples:

- Android emulator: `http://10.0.2.2:8080`
- iOS simulator: `http://127.0.0.1:8080`
- Real device: `http://<your-lan-ip>:8080`
