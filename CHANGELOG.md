# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2026-04-16

### Changed

- **Buyer app visual consistency refresh**：订货端核心链路统一为深墨绿 + 琥珀金的商务视觉体系，覆盖登录、首页、搜索、分类、商品列表、店铺、商品详情、购物车、下单确认、订单管理、我的等关键页面。
- **Category and shop browsing flow unified**：完成 `分类 -> 列表 -> 店铺 -> 详情 -> 下单` 的连续视觉升级，统一筛选条、信息卡片、状态标签与底部操作栏层级。
- **Reusable design base strengthened**：升级 `tokens`、`AppHeader`、`ProductCard` 等通用层，确保商品流页面保持一致的颜色语义、边框规则与按钮反馈。
- **Buyer app package version**：`buyer-app/package.json` 与 `buyer-app/package-lock.json` 版本提升至 `0.4.2`。

### Notes

- 本版本聚焦订货端 UI 一致性与品牌化提升，不新增后端业务接口。
- `buyer-app/.env`、`seller-app/.env` 继续保持本地未跟踪，不入库。

## [0.4.0] - 2026-04-14

### Added

- **Buyer App UI system upgrade (phase 1)**：新增统一 `AppHeader`，升级 `PageContainer` 支持头部与滚动容器组合，建立 token 2.0（颜色、字号、圆角、间距、阴影、层级）以支撑整端视觉一致性。
- **Unified state views**：`LoadingView`、`EmptyState`、`ErrorRetryView` 升级为统一卡片体系，并补充可复用的空态操作能力。

### Changed

- **Product card redesign**：`ProductCard` 重构为价格/单位/库存/步长/起购/加购一体卡片，搜索与店铺列表统一复用该组件。
- **Core buyer flow pages restyled**：首页、分类（含左右分栏）、购物车、确认订单、商品详情、订单列表与详情、地址管理、个人中心、搜索页、店铺页统一视觉与交互层级。
- **Order status single source of truth**：订单状态筛选与标签样式统一下沉至 `buyer-app/src/constants/order.ts`，列表与详情页共用，减少页面硬编码。
- **Package versions aligned to 0.4.0**：`buyer-app`、`seller-app`、`admin-web` 的 `package.json` 版本统一提升至 `0.4.0`。

### Notes

- 本版本聚焦订货端 UI 升级与可维护性收敛，不引入新的后端业务接口。
- 本地环境变量文件 `buyer-app/.env`、`seller-app/.env` 继续保持不入库。

## [0.3.3] - 2026-04-14

### Added

- **Buyer UI upgrade task doc**：新增 `docs/buyer-app-ui-upgrade-plan.md`，将订货端 UI 升级拆解为可执行任务（含分阶段实施、验收与风险）。
- **Cart schema patch migration**：新增 `migration/003_cart_items_deleted_at.sql`，为存量库补齐 `cart_items.deleted_at` 与索引，兼容既有仓储软删查询。
- **App test accounts and seller seed shop**：`migration/002_seed.sql` 增加订货端/发货端测试账号（`13800002222`、`13800003333`，密码 `abc12345`）及发货测试店铺（已审核、营业中）。

### Changed

- **Cart table base schema**：`migration/001_schema.sql` 中 `cart_items` 表新增 `deleted_at` 和 `idx_deleted_at`，避免新库初始化后购物车查询报 `system error`。
- **Docker compose web entry**：`docker-compose.yml` 纳入 `admin-web` 服务（`8000` 端口），并通过 `ADMIN_API_PROXY_TARGET` 对接 compose 内 `api:8080`。
- **Admin web proxy config**：`admin-web/.umirc.ts` 支持 `ADMIN_API_PROXY_TARGET` 环境变量，容器与本地双环境可切换。
- **Package versions aligned to 0.3.3**：`buyer-app`、`seller-app`、`admin-web` 的 `package.json` 版本统一提升至 `0.3.3`。

### Notes

- 本版本聚焦联调可用性与发布维护：修复购物车系统错误、补齐测试账号数据、补充订货端 UI 升级执行文档。
- 本地环境变量文件 `buyer-app/.env`、`seller-app/.env` 继续保持不入库。

## [0.3.2] - 2026-04-14

### Changed

- **Package versions aligned to 0.3.2**：`buyer-app`、`seller-app`、`admin-web` 的 `package.json` / `package-lock.json` 统一升级为 `0.3.2`。
- **Mobile app dependency baseline sync**：`buyer-app` 与 `seller-app` 依赖集合保持一致（含 `react-dom`、`react-native-web` 与 Expo Web 相关开发依赖），便于同构开发与构建一致性。

### Notes

- 本版本为发布维护更新，聚焦包版本与锁文件一致性，不引入新的业务接口变更。

## [0.3.1] - 2026-04-14

### Added

- **Admin Web pages (P2-2-1 ~ P2-2-3)**：完成工作台看板、用户/店铺/商品/分类/订单/轮播/配置管理页面，全部对接真实 `admin` API。
- **Dashboard metrics**：工作台聚合订单状态统计（含退货状态）与待审核店铺数，支持刷新与错误态展示。
- **Order ops UI**：订单页新增筛选项（`status`、`shop_id`、`buyer_id`、`settlement_status`、`created_from`、`created_to`）并支持导出 CSV。
- **Admin web module infrastructure**：新增 `src/services/admin.ts` 统一封装管理端请求与类型，新增 `Users/Shops/Products/Categories/Orders/Banners/Configs` 页面路由与菜单。

### Changed

- **Filter-export consistency**：订单导出改为严格复用当前筛选条件，确保“下载内容与列表筛选一致”（P2-2-3 验收项）。
- **Task progress**：`docs/task-list.md` 中 `P2-2-1`、`P2-2-2`、`P2-2-3` 更新为 `done`（日期 `2026-04-14`）。
- **Admin web version**：`admin-web/package.json` 与 `admin-web/package-lock.json` 版本提升至 `0.3.1`。

### Notes

- 本版本聚焦 **管理后台 Web P2-2 首迭代闭环**，前置支撑后续运营功能（评价、看板增强、高级筛选等）。

## [0.3.0] - 2026-04-14

### Added

- **Admin API（P2-1 运营闸门后端）**
  - **用户**：`GET /admin/users`、`PUT /admin/users/:id/status`；登录侧校验禁用账号（与任务验收一致）。
  - **商品**：`GET /admin/products`、`PUT /admin/products/:id/audit`、`PUT /admin/products/:id/status`、`PUT /admin/products/:id/recommend`。
  - **订单**：`GET /admin/orders`（多条件筛选）、`GET /admin/orders/:id`、`GET /admin/orders/export`（CSV，UTF-8 BOM，最多 5000 行）、`PUT /admin/orders/:id/settlement`（仅 `settlement_status`，不改 `orders.status`）。
  - **轮播与配置**：`GET|POST /admin/banners`、`PUT|DELETE /admin/banners/:id`；`GET /admin/configs`、`PUT /admin/configs/:key`（含 MVP 键值校验；定时任务每轮读库，改 `order_auto_cancel_minutes` 等在下轮生效）。
  - **退货（可选）**：`PUT /admin/orders/:id/status`（允许 `4→6`、`6→7` 加回库存、`6→4`）、`GET /admin/orders/:id/logs`（`order_logs` 审计列表）。
- **支撑模块**：`Banner` 模型与 `banner_repository`；`system_configs` 列表/按 key 更新；`AdminOrderService` 扩展事务、导出、对账、退货与日志查询；`ShopRepository.FindShopNamesByIDs` 等。

### Changed

- **Task progress**：`docs/task-list.md` 中 `P2-1-1`～`P2-1-6` 更新为 `done`（日期 `2026-04-14`）。
- **API 契约**：`docs/api-design.md` 递增至 **v1.1.8**（管理端订单、轮播/配置、退货与日志说明）。
- **App 版本号**：`buyer-app` / `seller-app` 的 `package.json`（及 `buyer-app/package-lock.json`）对齐为 **0.3.0**（与仓库里程碑版本一致）。

### Notes

- 本版本聚焦 **管理端业务 API（P2-1）闭环**，便于管理后台 Web（P2-2）对接四闸门与订单运营能力。
- 请勿将本地 `buyer-app/.env`、`seller-app/.env` 提交入库（默认保持未跟踪即可）。

## [0.2.2] - 2026-04-14

### Added

- **Seller App dashboard (P1-5-1)**：工作台接入真实后端数据，展示店铺审核/营业状态与订单核心计数（总数、待确认、配送中、已送达、已完成、已取消），支持下拉刷新与错误重试。
- **Seller App product management (P1-5-2)**：新增商品列表、发布、编辑、上下架能力；支持状态筛选（审核中/上架/下架），并在工作台提供“商品管理”入口。
- **Seller App order fulfillment (P1-5-3)**：新增订单列表与详情页，接入接单、拒单、发货、送达、卖家备注等履约动作，形成与买家端联调所需主路径闭环。
- **Seller App module infrastructure**：新增 `src/api/{dashboard,product,order}.ts`、`src/types/{api,dashboard,product,order}.ts`、`src/constants/order.ts`、`src/components/ProductForm.tsx`、`src/utils/media.ts` 及 `products/orders` 路由栈。

### Changed

- **Task progress**：`docs/task-list.md` 中 `P1-5-1`、`P1-5-2`、`P1-5-3` 更新为 `done`（日期 `2026-04-14`）。
- **Seller app version**：`seller-app/package.json` 版本提升至 `0.2.2`。

### Notes

- 本版本聚焦 **发货端 App P1 页面闭环**，用于端到端演示履约路径：订单接单 → 发货 → 送达（并支持拒单与备注）。
- 发货端商品发布后默认“审核中”展示逻辑已与后端契约对齐。

## [0.2.1] - 2026-04-14

### Added

- **Buyer App pages (P1-4-1 ~ P1-4-3)**：完成首页/分类/搜索/商品详情/店铺主页；购物车、确认订单、地址管理；订单列表/详情、取消、收货与再来一单全链路页面。
- **Buyer App data layer**：新增 `src/api/{catalog,cart,address,buyerOrder,envelope}.ts`、`src/types/{catalog,cart,address,order,api}.ts`、`src/store/checkoutDraft.ts`、`src/constants/{checkout,order}.ts` 与通用 `theme/components/utils` 基础设施。
- **Buyer App routing**：新增 `category`、`product`、`shop`、`search`、`checkout`、`addresses`、`orders` 路由栈与入口，支持从“我的”进入地址与订单管理。

### Changed

- **Task progress**：`docs/task-list.md` 中 `P1-4-1`、`P1-4-2`、`P1-4-3` 状态更新为 `done`（日期 `2026-04-14`）。
- **Error handling UX**：前端 `client` 新增 `BusinessError(code,message)`，订单详情对 `40002` 进行明确提示（符合任务验收要求）。
- **Buyer app version**：`buyer-app/package.json` 与 `buyer-app/package-lock.json` 版本提升至 `0.2.1`。

### Notes

- 本版本聚焦 **订货端 App P1 页面闭环**，用于联调演示主路径：选品 → 加购 → 确认订单 → 下单 → 订单状态动作。
- 本地 `tsc` 在当前环境仍可能受 Expo 基座 `module` 选项兼容影响，与本次业务改动无直接冲突。

## [0.2.0] - 2026-04-14

### Added

- **Buyer API**：地址 CRUD；购物车（按店分组、上限 100、选中/失效清理）；`POST /buyer/orders/confirm` 与 `POST /buyer/orders`（拆单、运费、事务扣库存、订单与 `order_logs`）；订单列表/详情、取消、收货、软删、再次下单。
- **Seller API**：订单列表/详情、接单/拒单（释放库存）/发货/送达、卖家备注；店铺入驻 `POST /seller/shop/apply`、审核状态查询、店铺信息修改、营业开关。
- **Admin API**：店铺列表/详情、`PUT /admin/shops/:id/audit`、`PUT /admin/shops/:id/close`（后台闸门最小能力衔接）。
- **Order scheduling**：进程内定时任务（默认每分钟），读取 `system_configs` 的 `order_auto_cancel_minutes`、`order_auto_complete_hours`；待确认超时取消（加回库存、`order_logs` `operator_role=4`）、已送达超时自动完成；可通过 `ORDER_SCHEDULER_DISABLED` 关闭。
- **Infrastructure**：`internal/pkg/orderno`（`FM` + 时间 + 随机，冲突重试）；`repository`/`service`/`handler` 分层扩展；相关 GORM 模型与仓储。

### Changed

- **Buyer catalog**：商品列表与可见详情、加购均要求店铺 `audit_status=1` 且营业中，与下单链路 **AC-7** 一致；加购失败返回 **50001**（与订单侧语义对齐）。
- **Documentation**：`docs/api-design.md` 修订至 **v1.1.4**（订货/发货订单示例、超时任务、店铺入驻与审核）；`docs/task-list.md` 同步 P1-3-4～P1-3-7 等任务状态。

### Notes

- 本版本聚焦 **后端 P1 核心交易与店铺审核闭环**；管理后台 Web 与双端业务页仍以任务表后续条目为准。
- 数据库依赖既有 `migration/` 与种子中的 `system_configs` 键。

