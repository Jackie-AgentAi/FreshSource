# FreshMart

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
