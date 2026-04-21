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

`EXPO_PUBLIC_API_BASE_URL` 优先。

在开发环境下，如果未显式配置，APP 会自动根据 Expo 当前宿主机地址推导 API 地址：
- 真机 + LAN 模式：自动使用电脑局域网 IP，并固定后端端口 `8080`
- Android 模拟器：回退到 `http://10.0.2.2:8080`
- iOS 模拟器：回退到 `http://127.0.0.1:8080`

如果你使用的是 Tunnel、远程调试或非默认后端端口，仍然建议显式配置 `EXPO_PUBLIC_API_BASE_URL`。

Examples:

- Android emulator: `http://10.0.2.2:8080`
- iOS simulator: `http://127.0.0.1:8080`
- Real device: `http://<your-lan-ip>:8080`
