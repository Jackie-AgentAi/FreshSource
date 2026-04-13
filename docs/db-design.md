# MVP 数据库设计（B2B 生鲜订货平台）

> **依据**：`docs/requirement.md`、`docs/architecture.md`  
> **数据库**：MySQL 8 · InnoDB · utf8mb4  
> **版本**：**v1.1** · **日期**：2026-04-13  
> **文档套系**：与 `docs/task-list.md` **v1.1**、`docs/api-design.md` **v1.1** 同窗对齐（表结构变更需同步评估接口与验收条款）。

---

## 1. 设计原则（MVP）

- **单体**：单库单 schema，无外键微服务拆分。
- **与需求一致**：字段语义以 `docs/requirement.md` 第三章为准；本文件只作 **MVP 裁剪说明** 与 **实现提示**。
- **文档协同**：**D2 冻结**（见 `docs/task-list.md`）以 **本文件 v1.1** 为基线；订单/库存/对账/定时任务语义与 task-list **「核心业务规则」**、**AC-1～AC-8** 一致。
- **接口对应**：`orders.settlement_status` 由 `PUT /api/v1/admin/orders/:id/settlement` 维护，**不参与** `status` 状态机（见 `docs/api-design.md` 5.6）。
- **库存与订单**：下单与取消/超时必须 **可逆且一致**；与 `order_logs` 同步记录。
- **支付**：无支付表；金额字段仅表达「应付」，线下结清。
- **SKU**：保留 `product_skus` 表，MVP **允许全部业务 `sku_id` 为空**，仅使用 `products.stock`。
- **对账**：在 `orders` 增加 **一个可选字段** `settlement_status`，避免单独做对账流水表（可后续再拆）。

---

## 2. ER 关系（文字）

- `users` 1 — 1 `shops`（卖家）；`users` 1 — N `user_addresses`；`users` 1 — 1 `admins`（管理员扩展）。
- `shops` 1 — N `products`；`categories` 自关联（`parent_id`）；`products` N — 1 `categories`。
- `products` 1 — N `product_skus`（MVP 可不用）。
- `users` 1 — N `cart_items`（含 `shop_id`、`product_id`）。
- `orders` N — 1 `users`（buyer）、N — 1 `shops`、`orders` 1 — N `order_items`；`orders` 1 — N `order_logs`。
- `reviews` 关联 `order`、`order_item`、`product`、`shop`、`user`。
- `notifications` 关联 `user_id`（接收人）。
- `banners`、`system_configs` 独立配置类。

---

## 3. 表清单（MVP）

| 表名 | MVP 用途 |
|------|----------|
| users | 账号、角色（1 订货 2 发货/卖家 3 管理）、状态 |
| shops | 供应商/店铺、审核、营业状态 |
| user_addresses | 收货地址 |
| admins | 管理员扩展、权限 JSON |
| categories | 两级分类 |
| products | 商品主数据、库存、上下架/审核 |
| product_skus | 预留规格，MVP 可空跑 |
| cart_items | 购物车 |
| orders | 订单主单 |
| order_items | 订单行 |
| order_logs | 状态流转审计 |
| reviews | 评价 |
| notifications | 消息通知 |
| banners | 轮播 |
| system_configs | 运费、超时时间等 K-V |

**MVP 不建表**：支付流水、优惠券、对账明细、独立配送员、IM 消息。

---

## 4. DDL（与需求对齐 + MVP 增补）

以下在 `docs/requirement.md` 已有完整 DDL 的表 **直接复用该文件 SQL**，迁移时按依赖顺序执行：

1. `users` → `shops` → `user_addresses` → `admins`  
2. `categories`  
3. `products` → `product_skus`  
4. `cart_items`  
5. `orders` → `order_items` → `order_logs`  
6. `reviews`  
7. `notifications`  
8. `banners` → `system_configs`  

### 4.1 MVP 对 `orders` 表的增补字段

在需求文档 `orders` 表基础上 **增加**（若尚未存在）：

```sql
ALTER TABLE orders
  ADD COLUMN settlement_status TINYINT NOT NULL DEFAULT 0
    COMMENT '对账: 0=未标记 1=已核对（线下对账用，不参与状态机）'
    AFTER status;
```

> 若团队希望「零 ALTER」，也可将该字段合并进未来首次建表 DDL 中一次性创建。

### 4.2 索引建议（MVP）

| 表 | 索引 | 说明 |
|----|------|------|
| orders | `(shop_id, status, created_at)` | 发货端订单列表 |
| orders | `(buyer_id, status, created_at)` | 订货端订单列表 |
| orders | `(status, created_at)` | 定时任务扫超时单 |
| products | `(shop_id, status)` | 卖家商品列表 |
| notifications | `(user_id, is_read, created_at)` | 未读与列表 |

`products` 上 FULLTEXT（`name`, `subtitle`）按需求保留；若初期数据量小，可先用 `LIKE` + 索引降级，后续再开 FULLTEXT。

---

## 5. 枚举与常量（实现时抽常量）

### 5.1 users.role

| 值 | 含义 | 终端 |
|----|------|------|
| 1 | 订货方（buyer） | 订货端 APP |
| 2 | 发货方/卖家（seller） | 发货端 APP |
| 3 | 管理员 | 管理后台 |

### 5.2 shops.audit_status

| 值 | 含义 |
|----|------|
| 0 | 待审核 |
| 1 | 通过 |
| 2 | 拒绝 |

### 5.3 products.status

| 值 | 含义 |
|----|------|
| 0 | 下架 |
| 1 | 上架 |
| 2 | 审核中 |

### 5.4 orders.status

| 值 | 含义 |
|----|------|
| 0 | 待确认 |
| 1 | 已确认 |
| 2 | 配送中 |
| 3 | 已送达 |
| 4 | 已完成 |
| 5 | 已取消 |
| 6 | 退货中 |
| 7 | 已退货 |

### 5.5 orders.cancel_by

| 值 | 含义 |
|----|------|
| 1 | 订货方 |
| 2 | 发货方 |
| 3 | 系统 |

### 5.6 order_logs.operator_role

| 值 | 含义 |
|----|------|
| 1 | 订货方 |
| 2 | 发货方 |
| 3 | 管理员 |
| 4 | 系统 |

---

## 6. 库存策略（MVP 实现约束）

**目标**：无独立 `locked_stock` 列，减少 MVP 表复杂度。

**建议实现**（与 `docs/architecture.md` 中 inventory 职责一致）：

1. **创建订单**（状态 0）：在 **同一事务** 内，对每个 `order_item` 执行  
   `UPDATE products SET stock = stock - quantity WHERE id = ? AND stock >= quantity`（`sku_id` 非空时改扣 `product_skus`，MVP 可暂不启用 SKU）。  
   任一行影响行数为 0 则整单回滚，返回 30002。
2. **取消 / 超时取消**（→ 状态 5）：按 `order_items` **加回** `stock`，并写 `order_logs`。
3. **并发**：使用事务 + 行锁（上述 `UPDATE` 自然锁住 `products` 行）。

> 若后续要「展示可售 = stock - 未完结占用」，再引入 `locked_stock` 或占用表。

---

## 7. system_configs 预设键（MVP 必灌）

| config_key | 示例值 | 用途 |
|------------|--------|------|
| delivery_base_fee | 5.00 | 基础运费 |
| delivery_free_threshold | 50.00 | 满额包邮门槛 |
| order_auto_cancel_minutes | 30 | 待确认超时取消 |
| order_auto_complete_hours | 24 | 送达后自动完成 |
| review_deadline_days | 7 | 评价截止天数 |

---

## 8. 软删除

- `users`、`shops`、`products`、`orders` 等按需求文档使用 `deleted_at`（GORM 软删）时，**列表接口默认过滤**；管理端可查「已删除」按需扩展，MVP 可不做。

---

## 9. 迁移与种子

- **迁移工具**：golang-migrate / Atlas / 纯 SQL 均可，团队选一种固化。
- **种子**：一级/二级分类示例、`system_configs` 全键、超级管理员账号（密码 bcrypt）、可选 1～2 张 banner。

---

*完整字段级 DDL 以 `docs/requirement.md` 第三章 SQL 为准；本文件 v1.1 与 `docs/api-design.md` v1.1、`docs/task-list.md` v1.1 套系对齐。*
