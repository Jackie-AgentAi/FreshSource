# FreshMart

## v0.5.0 Release (2026-04-21)

版本发布更新：完成订货端 App 的结构化重构与交互补强，并将三端包版本统一提升到 `0.5.0`，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：`buyer-app` 将首页、分类、购物车、确认订单、订单、地址、商品详情、店铺、搜索、个人中心与通知页拆分到 `src/screens/*`，减少路由页内联逻辑；新增分类本地图资源、`QuantityStepper` 通用步进器与带图标的底部 Tab；`EXPO_PUBLIC_API_BASE_URL` 之外补充 Expo 宿主自动推导后端地址能力，提升真机与模拟器联调体验。

## v0.4.0 Release (2026-04-14)

版本发布更新：完成订货端 App UI 升级第一阶段与核心交易链路视觉重构，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：`buyer-app` 完成 token 体系升级、通用头部与容器统一、列表空载错状态统一、商品卡片重构、首页/分类/购物车/确认订单/商品详情/订单链路/地址与个人中心/搜索与店铺页改版；订单状态标签与筛选项统一收敛到 `constants/order.ts`，降低重复硬编码与维护成本。

## v0.3.3 Release (2026-04-14)

版本发布更新：修复订货端购物车 `system error`、补齐双端测试账号种子、并补充订货端 UI 升级任务文档，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：新增 `migration/003_cart_items_deleted_at.sql` 修复 `cart_items` 软删字段缺失问题；`migration/002_seed.sql` 增加订货/发货测试账号及卖家测试店铺；`docker-compose.yml` 纳入 `admin-web` 启动；新增 `docs/buyer-app-ui-upgrade-plan.md` 用于订货端 UI 升级执行。

## v0.3.2 Release (2026-04-14)

版本维护更新：三端应用版本统一至 **0.3.2**，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：`buyer-app` / `seller-app` / `admin-web` 的 `package.json` 与 `package-lock.json` 对齐；买卖家 App 依赖基线保持一致，便于后续同构迭代与发布。

## v0.3.1 Release (2026-04-14)

管理后台 Web 完成 **P2-2 第一迭代页面闭环**，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：工作台真实数据看板；用户/店铺/商品/分类/订单/轮播/系统配置页全部对接 `admin` API；订单页筛选与导出参数一致（含时间区间）；`docs/task-list.md` 中 **P2-2-1～P2-2-3** 已完成。

## v0.3.0 Release (2026-04-14)

后端完成 **P2-1 管理端业务 API**（用户/商品/订单/轮播与系统配置/可选退货与日志），详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：管理端用户列表与启停；商品列表、审核、上下架、推荐；订单列表/详情/CSV 导出、对账标记；轮播 CRUD、`system_configs` 读写；可选退货 `4→6→7` 与 `6→4` 及 `order_logs` 查询；`docs/api-design.md` **v1.1.8**；`docs/task-list.md` 中 **P2-1-1～P2-1-6** 已完成；双端 App 包版本对齐 **0.3.0**。

## v0.2.2 Release (2026-04-14)

发货端 App 完成 **P1-5 页面闭环**，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：工作台接入真实数据看板；商品列表/发布/编辑/上下架；订单列表/详情与接单、拒单、发货、送达、备注动作；`docs/task-list.md` 中 `P1-5-1` 至 `P1-5-3` 已完成。

## v0.2.1 Release (2026-04-14)

订货端 App 完成 **P1-4 页面闭环**，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：主页/分类/搜索/商品详情/店铺主页；购物车与确认订单（多店拆单预览）；地址 CRUD 与默认地址；订单列表/详情、取消、收货、再来一单；`docs/task-list.md` 中 `P1-4-1` 至 `P1-4-3` 已完成。

## v0.2.0 Release (2026-04-14)

后端 **P1 核心交易链路** 与 **店铺入驻/审核** 最小闭环，详见 [`CHANGELOG.md`](CHANGELOG.md)。

要点：买家地址与购物车、订单确认/创建（拆单与库存）、买家订单与卖家订单全流程、订单超时定时任务、卖家入驻与管理端店铺审核；买家侧商品可见与加购校验 **AC-7**；API 契约见 `docs/api-design.md` **v1.1.4**。

## v0.1.1 Product Function Summary

- Backend scaffold is ready for integration: unified response envelope, role-based auth middleware, SMS mock flow, auth module, upload module, migrations, Swagger, and Docker Compose startup.
- Management web (`admin-web`) supports real login through backend auth API, token persistence, token refresh flow, and basic admin route verification.
- Buyer app (`buyer-app`) and seller app (`seller-app`) are independent Expo projects with isomorphic structure, covering Expo Router navigation, Axios client, Zustand token store, and role-based login.
- Expo versions are pinned to SDK 52 compatible ranges (`expo ~52.0.46`, `expo-router ~4.0.20`) for device testing with matching Expo Go.

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

## P1-1-4 Concurrency Notes

- Seller stock adjustment (`PUT /api/v1/seller/products/:id/stock`) runs inside a DB transaction.
- The product row is loaded with `SELECT ... FOR UPDATE` before stock update, so concurrent updates are serialized.
- Stock update is computed as `current_stock + delta`; if result is below `0`, request fails with `30002`, so no negative stock can be written.
