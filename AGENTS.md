# FreshMart — AI 协作约束（精简版）

> **必须严格遵守 [`docs/dev-spec.md`](docs/dev-spec.md) 的全部工程规范。**  
> **若与本文件冲突，以 `docs/dev-spec.md` 为准。**  
> **业务需求以 [`docs/requirement.md`](docs/requirement.md) 为准；接口/表结构以 `docs/api-design.md`、`docs/db-design.md` v1.1 为准。**

---

## 1. 架构（硬约束）

- **单体应用**；**禁止**拆微服务、禁止引入未立项的中间件（如 Kafka）。
- 路由前缀固定：`/api/v1/buyer/`、`/seller/`、`/admin/`、`/common/`。

## 2. 分层（硬约束）

- **禁止** `handler` 直接访问数据库或调用 `repository` 绕过 `service`（健康检查等极少数场景经 `service` 一行封装）。
- **禁止** `repository` 写业务状态机规则；**禁止** `service` 手写 SQL 字符串。
- **订单/库存事务**只在 `service` 层开启。

## 3. API（硬约束）

- 所有 JSON 响应必须符合统一结构：`code`、`message`、`data`；分页字段名与 `docs/api-design.md` **一致**。
- 对外 JSON 字段 **snake_case**。
- 错误码区间：10000 系统 · 20000 用户 · 30000 商品 · 40000 订单 · 50000 店铺；常用码见 api-design **§1.5**。

## 4. 核心业务（硬约束）

- **无在线支付**；不做支付回调、分账、退款接口。
- **下单**：同店一单、多店多订单；事务内扣减 `products.stock`，失败 **`30002`**，禁止部分建单；取消/拒单/超时取消须 **加回库存** 并写 **`order_logs`**。
- **对账标记** `settlement_status` 与订单 `status` **解耦**，仅管理端维护。
- 订单号：`FM` + 14 位时间 + 6 位随机；状态迁移与角色权限以 **`docs/task-list.md` v1.1**「核心业务规则」为准。
- 商品：新发布默认 **审核中**；库存 0 **自动下架**；购物车上限 **100**。

## 5. 文档与改动纪律

- 新增或改接口：先对 `docs/api-design.md`，再写代码。  
- 改表：先 `docs/db-design.md` + `migration/`，再改 model。  
- 任务与验收：参考 `docs/task-list.md` v1.1（含 AC-1～AC-8）。

## 6. AI 工作方式（硬约束）

- **禁止**一次生成整个项目或整个 `internal/` 树。
- **先读**相关 `docs/*.md` 再改；**最小范围**修改，不删无关代码与注释。
- **禁止**实现需求未列功能（支付、营销、IM、独立配送微服务等）。

## 7. 技术栈（速查）

Go + Gin + GORM + MySQL + Redis + JWT + Zap + swag · RN + Expo + **TypeScript** + **Expo Router** + Zustand + Axios · Ant Design Pro + UmiJS · Docker Compose + Nginx。

## 8. 前端（硬约束）

- **管理后台**与**双端 APP** 须遵守 [`docs/dev-spec.md`](docs/dev-spec.md) **§5 / §6**：统一 `api` 封装、**禁止页面裸请求**、订单状态等枚举集中在 **`constants`**，**禁止**多文件硬编码 `status === n`。
- **APP 固定四件套**：**TypeScript + Axios + Zustand + Expo Router**（+ **React Hook Form**）；两 App **目录同构**；先做 **client / theme / 通用组件** 再堆业务页（见 dev-spec **§6.15**）。不熟 TS 时按 dev-spec **§6.2.1** 执行。

---

*后端细则、三端完整规范见 [`docs/dev-spec.md`](docs/dev-spec.md) **v1.3（冻结开工版）**。*
