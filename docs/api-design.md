# MVP API 接口设计（B2B 生鲜订货平台）

> **依据**：`docs/requirement.md`、`CLAUDE.md`、`docs/architecture.md`  
> **终端映射**：订货端 → `/api/v1/buyer/` · 发货端 → `/api/v1/seller/` · 管理后台 → `/api/v1/admin/` · 公共 → `/api/v1/common/`  
> **版本**：**v1.1** · **日期**：2026-04-13  
> **支付**：无；不涉及任何支付回调接口。  
> **文档套系**：与 `docs/task-list.md` **v1.1**、`docs/db-design.md` **v1.1** 同窗对齐（修订需同步评估另两份）。

---

## 1. 通用约定

### 1.1 基础

| 项 | 约定 |
|----|------|
| Base Path | `/api/v1` |
| 协议 | HTTPS（生产） |
| 格式 | `Content-Type: application/json`（上传除外） |
| 认证 | `Authorization: Bearer <access_token>`；`common` 中带 `/auth/*` 除外 |
| 角色 | 中间件校验 JWT 中 `role` 与路由前缀一致 |

### 1.2 统一响应

**成功**：

```json
{ "code": 0, "message": "success", "data": {} }
```

**分页**（`data` 内）：

```json
{
  "list": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

**失败**：`code != 0`，`data` 可为 `null`。错误码区间：10000 系统 · 20000 用户 · 30000 商品 · 40000 订单 · 50000 店铺（见 `docs/requirement.md` 8.2）。

### 1.3 常用查询参数

| 参数 | 说明 |
|------|------|
| page | 页码，从 1 开始，默认 1 |
| page_size | 每页条数，默认 20，最大建议 100 |

### 1.4 文档协同（冻结与验收）

| 项 | 约定 |
|----|------|
| **D1 冻结** | `docs/task-list.md` 规定：`P0-1-2` 开始前须冻结 API 契约；**冻结基线为本文件 v1.1**（小修订用 v1.1.x / 修订日期脚注）。 |
| **与 task-list** | 订单/库存/对账/状态权限的**可测试验收**见 task-list **「核心业务规则」**、**「P1 核心链路验收规则（AC-1～AC-8）」**。 |
| **与 db-design** | `orders.settlement_status` 与 `PUT /admin/orders/:id/settlement` 一一对应；库存扣减与回滚语义见 `docs/db-design.md` 第 6 节。 |
| **冲突优先级** | 路径与业务细节以 **`docs/requirement.md`** 为准；三份 MVP 文档冲突时以 **task-list 中已写死的 AC/规则** 为实施仲裁，并回写修订 api-design/db-design。 |

### 1.5 核心错误码速查（MVP 常用）

与 `docs/requirement.md` 8.2 一致；下列为 **P1 联调高频**，实现与测试应固定使用同一 `code`。

| code | 含义 | 典型场景 / 接口 |
|------|------|-----------------|
| 10001 | 参数校验失败 | 通用 |
| 10002 | Token 无效或过期 | 通用 |
| 10003 | 无权限（含角色与路由不符） | buyer 访问 seller 前缀等 |
| 10004 | 请求频率超限 | 短信 60s / 日上限 |
| 20001 | 手机号已注册 | 注册 |
| 20002 | 账号或密码错误 | 登录 |
| 20003 | 验证码错误或过期 | 登录 / 短信 |
| 30001 | 商品不存在或已下架 / 不可售 | 加购、下单前校验 |
| 30002 | 库存不足 | `POST /buyer/cart`、`POST /buyer/orders`；**禁止部分建单** |
| 40001 | 订单不存在 | 订单详情与动作 |
| 40002 | 订单状态不允许当前操作 | 取消、接单、发货、收货等状态机 |
| 50001 | 店铺审核未通过或不可售 | `POST /buyer/orders`（不建单） |

**约定**：越权访问订单资源时，团队固定使用 **10003** 或 **40002** 之一，全项目统一，并在接口测试中写死断言。

---

## 2. 公共模块 `/api/v1/common`

### 2.1 短信

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/sms/send` | Body: `phone`, `scene`（register/login）；限频与上限见 CLAUDE |

### 2.2 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 手机+验证码+密码；默认角色订货方 |
| POST | `/auth/login` | 手机+密码 |
| POST | `/auth/login-sms` | 手机+验证码 |
| POST | `/auth/refresh` | `refresh_token` |
| POST | `/auth/logout` | 作废 refresh（策略：黑名单或删库，MVP 择一） |
| POST | `/auth/reset-password` | 手机验证码+新密码 |

### 2.3 上传

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/upload/image` | `multipart/form-data` 单文件；≤5MB；jpg/jpeg/png/webp |
| POST | `/upload/images` | 最多 9 张 |

**响应 data 示例**：`{ "url": "..." }` 或 `{ "urls": ["..."] }`（团队统一一种）

---

## 3. 订货端 `/api/v1/buyer`

> 需 `role=1`。

### 3.1 个人与地址

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/profile` | 个人信息 |
| PUT | `/profile` | 昵称、头像等 |
| PUT | `/password` | 旧密码+新密码 |
| GET | `/addresses` | 地址列表 |
| POST | `/addresses` | 新增；上限 20 |
| PUT | `/addresses/:id` | 修改 |
| DELETE | `/addresses/:id` | 删除 |
| PUT | `/addresses/:id/default` | 默认地址 |

### 3.2 首页 / 分类 / 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/home` | 轮播 + 分类 + 推荐商品（结构见下「响应约定」） |
| GET | `/categories` | 两级分类树 |
| GET | `/products` | 分页列表；Query: `category_id`, `shop_id`, `keyword`, `sort_by`, `min_price`, `max_price` |
| GET | `/products/search` | 可与 `/products` 合并为同一 Handler（keyword 必填即可） |
| GET | `/products/:id` | 详情；含店铺摘要、评价统计（可简） |
| GET | `/shops/:id` | 店铺信息 + 店内商品列表（分页） |

### 3.3 购物车

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/cart` | 按 `shop_id` 分组返回 |
| POST | `/cart` | Body: `product_id`, `sku_id?`, `quantity` |
| PUT | `/cart/:id` | 修改数量 |
| DELETE | `/cart/:id` | 删除一项 |
| DELETE | `/cart/batch` | Body: `ids[]` |
| PUT | `/cart/select-all` | Body: `selected` 0/1 |
| DELETE | `/cart/invalid` | 清空失效条目 |

### 3.4 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/orders/confirm` | Body: 选中 `cart_item_ids` 或 `items[]` + `address_id` + `delivery_type`；**不创建订单**；返回拆单预览、运费、应付 |
| POST | `/orders` | 正式创建；返回 `order_ids[]` 或 `orders[]` |
| GET | `/orders` | Query: `status` |
| GET | `/orders/:id` | 详情 |
| PUT | `/orders/:id/cancel` | 仅 `status=0` |
| PUT | `/orders/:id/receive` | `status=3` → `4` |
| POST | `/orders/:id/reorder` | 将该单商品加入购物车 |
| DELETE | `/orders/:id` | 软删；仅 `status in (4,5)` |

### 3.5 评价

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/reviews` | Body: 订单明细维度评价列表 |
| GET | `/products/:id/reviews` | 商品评价列表 |
| GET | `/reviews` | 我的评价 |

### 3.6 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications` | Query: `type?`, 分页 |
| GET | `/notifications/unread-count` | |
| PUT | `/notifications/:id/read` | |
| PUT | `/notifications/read-all` | |

---

## 4. 发货端 `/api/v1/seller`

> 需 `role=2`；资源归属当前 `user_id` 对应 `shops.user_id`。

### 4.1 店铺入驻与信息

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/shop/apply` | 首次入驻 |
| GET | `/shop/audit-status` | |
| PUT | `/shop` | 修改店铺信息；若需求要求重审则置 `audit_status=0` |
| PUT | `/shop/status` | 营业/关店 |

### 4.2 工作台（MVP 可简）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 今日订单数、待确认数、销售额等（字段可迭代） |

### 4.3 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/products` | Query: `status` |
| POST | `/products` | 发布 → 审核中 |
| PUT | `/products/:id` | 编辑 |
| PUT | `/products/:id/status` | 上下架 |
| DELETE | `/products/:id` | 软删 |
| PUT | `/products/batch-price` | Body: `[{id, price}]` |
| PUT | `/products/:id/stock` | Body: `stock` |

### 4.4 订单（履约）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/orders` | Query: `status`, 时间范围可选 |
| GET | `/orders/:id` | |
| PUT | `/orders/:id/confirm` | 0→1 |
| PUT | `/orders/:id/reject` | 0→5；Body: `reason`；**释放库存** |
| PUT | `/orders/:id/deliver` | 1→2 |
| PUT | `/orders/:id/arrived` | 2→3 |
| PUT | `/orders/:id/remark` | Body: `seller_remark` |

### 4.5 评价

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/reviews/:id/reply` | Body: `reply_content` |

### 4.6 通知

同订货端路径模式：`/notifications`、`/notifications/unread-count`、`/notifications/:id/read`、`/notifications/read-all`。

---

## 5. 管理后台 `/api/v1/admin`

> 需 `role=3`；敏感操作记日志（MVP 可先打 Zap）。

### 5.1 工作台与统计（MVP 裁剪）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/dashboard` | 今日订单数、销售额、待审核店铺数等 |
| GET | `/statistics/overview` | 与 dashboard 可合并，择一实现 |
| GET | `/statistics/trends` | Query: `start`, `end`；返回按日聚合（可简） |

### 5.2 用户

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 分页+筛选 |
| GET | `/users/:id` | 详情 |
| PUT | `/users/:id/status` | 启用/禁用 |

### 5.3 店铺

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/shops` | 列表 |
| GET | `/shops/:id` | 详情 |
| PUT | `/shops/:id/audit` | Body: `audit_status`, `audit_remark` |
| PUT | `/shops/:id/close` | 强制关店（与需求「强制关店」对齐，路径名可团队统一） |

### 5.4 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/products` | 列表 |
| PUT | `/products/:id/audit` | 审核通过/驳回 |
| PUT | `/products/:id/status` | 强制下架等 |
| PUT | `/products/:id/recommend` | Body: `is_recommend` |

### 5.5 分类

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/categories` | |
| PUT | `/categories/:id` | |
| DELETE | `/categories/:id` | MVP 有子类或商品引用时拒绝或软删 |

### 5.6 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/orders` | 筛选：状态、店铺、时间、订货方 |
| GET | `/orders/:id` | 详情 |
| GET | `/orders/export` | 与列表相同 Query，返回文件流（Excel/CSV） |
| PUT | `/orders/:id/settlement` | **MVP 对账**：Body: `settlement_status` 0/1 |
| PUT | `/orders/:id/status` | **可选**：仅用于 `4→6`、`6→7`、`6→4`；强制写 `order_logs`，operator_role=3 |

### 5.7 评价

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/reviews` | 列表 |
| PUT | `/reviews/:id/status` | 隐藏/显示 |

### 5.8 内容与配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/banners` | |
| POST | `/banners` | |
| PUT | `/banners/:id` | |
| DELETE | `/banners/:id` | |
| GET | `/configs` | 配置列表 |
| PUT | `/configs/:key` | Body: `config_value` |

### 5.9 管理员（MVP 可后置）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admins` | |
| POST | `/admins` | 创建管理员账号 |
| PUT | `/admins/:id` | |

### 5.10 通知

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications` | |
| GET | `/notifications/unread-count` | |
| PUT | `/notifications/:id/read` | |
| PUT | `/notifications/read-all` | |

---

## 6. 关键请求/响应结构（实现参考）

### 6.1 POST `/buyer/orders/confirm`

**Request**：

```json
{
  "address_id": 1,
  "delivery_type": 1,
  "cart_item_ids": [1, 2, 3],
  "buyer_remark": ""
}
```

**Response data（示例）**：

```json
{
  "groups": [
    {
      "shop_id": 10,
      "shop_name": "某某生鲜",
      "items": [
        {
          "product_id": 1,
          "name": "土豆",
          "price": "2.50",
          "quantity": "5",
          "subtotal": "12.50"
        }
      ],
      "total_amount": "12.50",
      "freight_amount": "0.00",
      "pay_amount": "12.50"
    }
  ],
  "total_pay_amount": "12.50"
}
```

### 6.2 POST `/buyer/orders`

**Request**：与 confirm 类似（或 `confirm_token` 方案，MVP 可直接重复传相同 Body）。

**Response**：

```json
{ "order_ids": [101, 102] }
```

### 6.3 GET `/buyer/home`（data 示例）

```json
{
  "banners": [{ "id": 1, "image_url": "...", "link_type": 0, "link_value": "" }],
  "categories": [{ "id": 1, "name": "蔬菜", "children": [] }],
  "recommend_products": []
}
```

---

## 7. 状态机与 HTTP 映射（摘要）

| 动作 | 订货端 | 发货端 | 管理端 |
|------|--------|--------|--------|
| 取消待确认单 | PUT .../cancel | PUT .../reject | - |
| 接单 | - | PUT .../confirm | - |
| 发货 | - | PUT .../deliver | - |
| 送达 | - | PUT .../arrived | - |
| 收货完成 | PUT .../receive | - | - |
| 超时取消/完成 | （定时任务，无 HTTP） | 同左 | - |
| 对账标记 | - | - | PUT .../settlement |
| 退货流转 | - | - | 可选 PUT .../status |

---

## 8. MVP 范围外接口（不要实现）

- 微信支付/支付宝回调、退款、分账  
- 独立 `/api/v1/delivery/` 配送员端（见 `docs/architecture.md`，二期再加）  
- 优惠券领取与核销  

---

*路径与动词以本文档与 `docs/requirement.md` 第四章为准；与 `docs/task-list.md` v1.1、`docs/db-design.md` v1.1 套系对齐。冲突时：需求文档优先于本文件；本文件与 task-list AC 冲突时以 task-list 已钉死条款为准并修订本文档。*
