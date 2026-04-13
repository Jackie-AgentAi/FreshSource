# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

