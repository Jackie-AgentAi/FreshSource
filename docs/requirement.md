# 生鲜交易平台 — 详细需求文档

> **项目代号**：FreshMart  
> **技术栈**：Go (Gin) + MySQL / React + Ant Design Pro / React Native + Expo  
> **架构模式**：单体应用  
> **版本**：v1.0  
> **最后更新**：2026-04-13

---

## 一、项目概述

### 1.1 项目背景

构建一个生鲜交易平台，主要品类为蔬菜、猪肉、鱼类等生鲜食材。平台连接商户（卖家）与消费者（买家），同时提供管理后台供运营团队管理平台数据。本期暂不涉及在线支付功能，订单以线下结算或货到付款方式完成。

### 1.2 三端定义

| 端 | 技术方案 | 使用者 | 核心定位 |
|---|---|---|---|
| 买家端 APP | React Native + Expo | 消费者 | 浏览商品、下单、查看订单 |
| 卖家端 APP | React Native + Expo | 商户/摊贩 | 商品管理、接单、发货 |
| 管理后台 Web | React + Ant Design Pro | 平台运营 | 数据管理、审核、运营 |

### 1.3 第一期范围边界

**包含**：用户体系、商品管理、购物车、订单流程（无在线支付）、地址管理、搜索、分类、评价、消息通知、管理后台全功能。

**不包含**：在线支付/退款、营销活动/优惠券（预留字段）、即时通讯、直播、供应链/仓储管理。

---

## 二、系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    客户端层                           │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ 买家 APP │  │ 卖家 APP │  │   管理后台 Web     │  │
│  │ RN+Expo  │  │ RN+Expo  │  │ React+AntDesignPro│  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
└───────┼──────────────┼─────────────────┼────────────┘
        │              │                 │
        └──────────────┼─────────────────┘
                       │ HTTPS / RESTful API
                       ▼
┌─────────────────────────────────────────────────────┐
│                   API 网关层 (Gin)                    │
│  ┌────────┐ ┌──────────┐ ┌───────┐ ┌────────────┐  │
│  │JWT认证 │ │ 限流中间件│ │CORS   │ │ 日志/链路  │  │
│  └────────┘ └──────────┘ └───────┘ └────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────┐
│                  业务服务层                           │
│  ┌────────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐  │
│  │用户模块│ │商品  │ │订单  │ │消息通知│ │评价  │  │
│  └────────┘ └──────┘ └──────┘ └────────┘ └──────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────┐
│                   数据层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  MySQL   │  │  Redis   │  │ 文件存储(本地/OSS)│   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 项目目录结构（后端 Go）

```
freshmart/
├── cmd/
│   └── server/
│       └── main.go              # 入口
├── config/
│   └── config.go                # 配置加载
├── internal/
│   ├── middleware/               # JWT、CORS、限流、日志
│   ├── model/                    # 数据库模型（GORM）
│   ├── repository/               # 数据访问层
│   ├── service/                  # 业务逻辑层
│   ├── handler/                  # HTTP Handler（Controller）
│   │   ├── buyer/                # 买家端接口
│   │   ├── seller/               # 卖家端接口
│   │   └── admin/                # 管理后台接口
│   ├── dto/                      # 请求/响应结构体
│   └── pkg/                      # 工具包（上传、短信、分页等）
├── router/
│   └── router.go                # 路由注册
├── migration/                    # 数据库迁移脚本
├── docs/                         # Swagger 文档
├── .env
├── go.mod
└── go.sum
```

### 2.3 API 路由规划

```
/api/v1/buyer/      # 买家端接口前缀
/api/v1/seller/     # 卖家端接口前缀
/api/v1/admin/      # 管理后台接口前缀
/api/v1/common/     # 公共接口（上传、地区等）
```

---

## 三、数据库设计

### 3.1 用户体系

```sql
-- 用户表（三端共用）
CREATE TABLE users (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone           VARCHAR(20) NOT NULL COMMENT '手机号',
    password_hash   VARCHAR(255) NOT NULL COMMENT '密码哈希',
    nickname        VARCHAR(50) DEFAULT '' COMMENT '昵称',
    avatar          VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    role            TINYINT NOT NULL DEFAULT 1 COMMENT '角色: 1=买家 2=卖家 3=管理员',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用 1=正常',
    last_login_at   DATETIME DEFAULT NULL COMMENT '最后登录时间',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    UNIQUE KEY uk_phone (phone),
    KEY idx_role (role),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 卖家店铺信息表
CREATE TABLE shops (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID',
    shop_name       VARCHAR(100) NOT NULL COMMENT '店铺名称',
    logo            VARCHAR(500) DEFAULT '' COMMENT '店铺Logo',
    description     TEXT COMMENT '店铺简介',
    contact_phone   VARCHAR(20) DEFAULT '' COMMENT '联系电话',
    province        VARCHAR(50) DEFAULT '' COMMENT '省',
    city            VARCHAR(50) DEFAULT '' COMMENT '市',
    district        VARCHAR(50) DEFAULT '' COMMENT '区',
    address         VARCHAR(255) DEFAULT '' COMMENT '详细地址',
    latitude        DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
    longitude       DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
    business_license VARCHAR(500) DEFAULT '' COMMENT '营业执照图片',
    audit_status    TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态: 0=待审核 1=已通过 2=已拒绝',
    audit_remark    VARCHAR(255) DEFAULT '' COMMENT '审核备注',
    rating          DECIMAL(2,1) DEFAULT 5.0 COMMENT '店铺评分',
    total_sales     INT UNSIGNED DEFAULT 0 COMMENT '总销量',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0=关店 1=营业',
    opening_time    TIME DEFAULT NULL COMMENT '营业开始时间',
    closing_time    TIME DEFAULT NULL COMMENT '营业结束时间',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    UNIQUE KEY uk_user_id (user_id),
    KEY idx_audit_status (audit_status),
    KEY idx_city (city),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店铺表';

-- 收货地址表
CREATE TABLE user_addresses (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    contact_name    VARCHAR(50) NOT NULL COMMENT '联系人',
    contact_phone   VARCHAR(20) NOT NULL COMMENT '联系电话',
    province        VARCHAR(50) NOT NULL,
    city            VARCHAR(50) NOT NULL,
    district        VARCHAR(50) NOT NULL,
    detail_address  VARCHAR(255) NOT NULL COMMENT '详细地址',
    latitude        DECIMAL(10,7) DEFAULT NULL,
    longitude       DECIMAL(10,7) DEFAULT NULL,
    is_default      TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认: 0=否 1=是',
    tag             VARCHAR(20) DEFAULT '' COMMENT '标签: 家、公司等',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址表';

-- 管理员扩展表
CREATE TABLE admins (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    real_name       VARCHAR(50) DEFAULT '' COMMENT '真实姓名',
    role_level      TINYINT NOT NULL DEFAULT 1 COMMENT '1=普通管理 2=超级管理',
    permissions     JSON DEFAULT NULL COMMENT '权限列表',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';
```

### 3.2 商品体系

```sql
-- 商品分类表（两级分类）
CREATE TABLE categories (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id       BIGINT UNSIGNED DEFAULT 0 COMMENT '父分类ID, 0=一级分类',
    name            VARCHAR(50) NOT NULL COMMENT '分类名称',
    icon            VARCHAR(500) DEFAULT '' COMMENT '分类图标',
    sort_order      INT DEFAULT 0 COMMENT '排序值，越小越靠前',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '0=隐藏 1=显示',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_parent_id (parent_id),
    KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 预设分类数据示例：
-- 一级：蔬菜(1) | 猪肉(2) | 鱼类(3) | 其他(4)
-- 二级-蔬菜：叶菜类 | 根茎类 | 瓜果类 | 菌菇类 | 豆类
-- 二级-猪肉：五花肉 | 排骨 | 里脊 | 猪蹄 | 内脏 | 猪骨
-- 二级-鱼类：淡水鱼 | 海水鱼 | 虾蟹 | 贝类 | 干货

-- 商品表
CREATE TABLE products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_id         BIGINT UNSIGNED NOT NULL COMMENT '店铺ID',
    category_id     BIGINT UNSIGNED NOT NULL COMMENT '分类ID（二级）',
    name            VARCHAR(100) NOT NULL COMMENT '商品名称',
    subtitle        VARCHAR(200) DEFAULT '' COMMENT '副标题/卖点',
    cover_image     VARCHAR(500) NOT NULL COMMENT '封面图',
    images          JSON DEFAULT NULL COMMENT '商品图片列表',
    description     TEXT COMMENT '商品详情（富文本）',
    price           DECIMAL(10,2) NOT NULL COMMENT '销售单价',
    original_price  DECIMAL(10,2) DEFAULT NULL COMMENT '原价（划线价）',
    unit            VARCHAR(20) NOT NULL DEFAULT '斤' COMMENT '单位: 斤/条/只/份/kg',
    min_buy         DECIMAL(10,2) DEFAULT 1 COMMENT '起购量',
    step_buy        DECIMAL(10,2) DEFAULT 0.5 COMMENT '递增步长',
    stock           INT NOT NULL DEFAULT 0 COMMENT '库存量',
    sales           INT UNSIGNED DEFAULT 0 COMMENT '销量',
    status          TINYINT NOT NULL DEFAULT 0 COMMENT '0=下架 1=上架 2=审核中',
    is_recommend    TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否 1=是',
    origin_place    VARCHAR(100) DEFAULT '' COMMENT '产地',
    shelf_life      VARCHAR(50) DEFAULT '' COMMENT '保质期描述',
    storage_method  VARCHAR(100) DEFAULT '' COMMENT '储存方式',
    sort_order      INT DEFAULT 0 COMMENT '排序',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    KEY idx_shop_id (shop_id),
    KEY idx_category_id (category_id),
    KEY idx_status (status),
    KEY idx_created_at (created_at),
    FULLTEXT KEY ft_name (name, subtitle) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 商品SKU表（预留，支持规格选择）
CREATE TABLE product_skus (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id      BIGINT UNSIGNED NOT NULL,
    sku_name        VARCHAR(100) NOT NULL COMMENT '规格名: 如"精选五花肉 2斤装"',
    price           DECIMAL(10,2) NOT NULL,
    stock           INT NOT NULL DEFAULT 0,
    weight          DECIMAL(10,2) DEFAULT NULL COMMENT '重量(kg)',
    status          TINYINT NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';
```

### 3.3 购物车

```sql
CREATE TABLE cart_items (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    shop_id         BIGINT UNSIGNED NOT NULL COMMENT '店铺ID（按店分组）',
    product_id      BIGINT UNSIGNED NOT NULL,
    sku_id          BIGINT UNSIGNED DEFAULT NULL,
    quantity        DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT '数量',
    selected        TINYINT NOT NULL DEFAULT 1 COMMENT '是否选中: 0=否 1=是',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product_sku (user_id, product_id, sku_id),
    KEY idx_user_shop (user_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';
```

### 3.4 订单体系

```sql
-- 订单主表
CREATE TABLE orders (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no        VARCHAR(32) NOT NULL COMMENT '订单编号',
    buyer_id        BIGINT UNSIGNED NOT NULL COMMENT '买家ID',
    shop_id         BIGINT UNSIGNED NOT NULL COMMENT '店铺ID',
    seller_id       BIGINT UNSIGNED NOT NULL COMMENT '卖家ID',

    -- 金额
    total_amount    DECIMAL(10,2) NOT NULL COMMENT '商品总金额',
    freight_amount  DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额（预留）',
    pay_amount      DECIMAL(10,2) NOT NULL COMMENT '应付金额',

    -- 收货信息（快照）
    receiver_name   VARCHAR(50) NOT NULL,
    receiver_phone  VARCHAR(20) NOT NULL,
    receiver_address VARCHAR(500) NOT NULL,
    receiver_lat    DECIMAL(10,7) DEFAULT NULL,
    receiver_lng    DECIMAL(10,7) DEFAULT NULL,

    -- 状态
    status          TINYINT NOT NULL DEFAULT 0
        COMMENT '0=待确认 1=已确认 2=配送中 3=已送达 4=已完成 5=已取消 6=退货中 7=已退货',
    cancel_reason   VARCHAR(255) DEFAULT '' COMMENT '取消原因',
    cancel_by       TINYINT DEFAULT NULL COMMENT '取消方: 1=买家 2=卖家 3=系统',

    -- 配送
    delivery_type   TINYINT DEFAULT 1 COMMENT '1=商家配送 2=自提',
    delivery_time   VARCHAR(50) DEFAULT '' COMMENT '期望送达时间',
    delivered_at    DATETIME DEFAULT NULL COMMENT '实际送达时间',

    buyer_remark    VARCHAR(255) DEFAULT '' COMMENT '买家备注',
    seller_remark   VARCHAR(255) DEFAULT '' COMMENT '卖家备注',

    confirmed_at    DATETIME DEFAULT NULL COMMENT '卖家确认时间',
    completed_at    DATETIME DEFAULT NULL COMMENT '完成时间',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME DEFAULT NULL,
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_buyer_id (buyer_id),
    KEY idx_shop_id (shop_id),
    KEY idx_seller_id (seller_id),
    KEY idx_status (status),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 订单明细表
CREATE TABLE order_items (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    sku_id          BIGINT UNSIGNED DEFAULT NULL,
    product_name    VARCHAR(100) NOT NULL COMMENT '商品名快照',
    product_image   VARCHAR(500) DEFAULT '' COMMENT '商品图快照',
    unit            VARCHAR(20) NOT NULL COMMENT '单位快照',
    price           DECIMAL(10,2) NOT NULL COMMENT '单价快照',
    quantity        DECIMAL(10,2) NOT NULL COMMENT '数量',
    subtotal        DECIMAL(10,2) NOT NULL COMMENT '小计',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

-- 订单状态流水表
CREATE TABLE order_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED NOT NULL,
    from_status     TINYINT NOT NULL,
    to_status       TINYINT NOT NULL,
    operator_id     BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人',
    operator_role   TINYINT DEFAULT NULL COMMENT '1=买家 2=卖家 3=管理员 4=系统',
    remark          VARCHAR(255) DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单状态流水表';
```

### 3.5 评价体系

```sql
CREATE TABLE reviews (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED NOT NULL,
    order_item_id   BIGINT UNSIGNED NOT NULL,
    product_id      BIGINT UNSIGNED NOT NULL,
    shop_id         BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL COMMENT '评价人（买家）',
    rating          TINYINT NOT NULL DEFAULT 5 COMMENT '评分1-5',
    content         TEXT COMMENT '评价内容',
    images          JSON DEFAULT NULL COMMENT '评价图片',
    is_anonymous    TINYINT DEFAULT 0 COMMENT '是否匿名',
    reply_content   TEXT COMMENT '商家回复',
    reply_at        DATETIME DEFAULT NULL,
    status          TINYINT DEFAULT 1 COMMENT '0=隐藏 1=显示',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_item (order_item_id),
    KEY idx_product_id (product_id),
    KEY idx_shop_id (shop_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价表';
```

### 3.6 消息通知

```sql
CREATE TABLE notifications (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL COMMENT '接收人',
    type            VARCHAR(30) NOT NULL COMMENT '类型: order/system/promotion/review',
    title           VARCHAR(100) NOT NULL,
    content         VARCHAR(500) NOT NULL,
    biz_type        VARCHAR(30) DEFAULT '' COMMENT '关联业务类型',
    biz_id          BIGINT UNSIGNED DEFAULT NULL COMMENT '关联业务ID',
    is_read         TINYINT NOT NULL DEFAULT 0 COMMENT '0=未读 1=已读',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_read (user_id, is_read),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知表';
```

### 3.7 系统配置 & 轮播图

```sql
CREATE TABLE banners (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(100) DEFAULT '',
    image_url       VARCHAR(500) NOT NULL,
    link_type       TINYINT DEFAULT 0 COMMENT '0=无跳转 1=商品 2=分类 3=外链',
    link_value      VARCHAR(500) DEFAULT '',
    position        VARCHAR(30) DEFAULT 'home' COMMENT '位置: home/category',
    sort_order      INT DEFAULT 0,
    status          TINYINT DEFAULT 1 COMMENT '0=隐藏 1=显示',
    start_time      DATETIME DEFAULT NULL,
    end_time        DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播图/广告位';

CREATE TABLE system_configs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    config_key      VARCHAR(50) NOT NULL,
    config_value    TEXT NOT NULL,
    remark          VARCHAR(255) DEFAULT '',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 预设配置:
-- delivery_base_fee: 5.00         (基础配送费)
-- delivery_free_threshold: 50.00  (免配送费门槛)
-- order_auto_cancel_minutes: 30   (未确认自动取消时间)
-- order_auto_complete_hours: 24   (送达后自动完成时间)
-- review_deadline_days: 7         (评价截止天数)
```

---

## 四、功能模块详细设计

### 4.1 用户模块

#### 4.1.1 注册与登录

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 短信验证码 | POST | /api/v1/common/sms/send | 发送验证码（限频60秒） |
| 手机号注册 | POST | /api/v1/common/auth/register | 手机号+验证码+密码 |
| 密码登录 | POST | /api/v1/common/auth/login | 手机号+密码，返回JWT |
| 验证码登录 | POST | /api/v1/common/auth/login-sms | 手机号+验证码 |
| 刷新Token | POST | /api/v1/common/auth/refresh | RefreshToken换取新Token |
| 退出登录 | POST | /api/v1/common/auth/logout | 使Token失效 |

**业务规则**：
- JWT双Token机制：AccessToken有效期2小时，RefreshToken有效期7天
- 注册时默认角色为买家，卖家需单独申请入驻
- 同一手机号60秒内不可重复发送验证码，单日上限10条
- 密码要求：8-20位，需含字母和数字

#### 4.1.2 个人信息管理

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 获取个人信息 | GET | /api/v1/buyer/profile | - |
| 修改个人信息 | PUT | /api/v1/buyer/profile | 昵称、头像 |
| 修改密码 | PUT | /api/v1/buyer/password | 旧密码+新密码 |
| 重置密码 | POST | /api/v1/common/auth/reset-password | 手机验证码+新密码 |

#### 4.1.3 收货地址

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 地址列表 | GET | /api/v1/buyer/addresses | - |
| 新增地址 | POST | /api/v1/buyer/addresses | 上限20条 |
| 修改地址 | PUT | /api/v1/buyer/addresses/:id | - |
| 删除地址 | DELETE | /api/v1/buyer/addresses/:id | - |
| 设为默认 | PUT | /api/v1/buyer/addresses/:id/default | - |

---

### 4.2 商品模块

#### 4.2.1 买家端 — 商品浏览

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 首页数据 | GET | /api/v1/buyer/home | 轮播+分类+推荐商品 |
| 分类列表 | GET | /api/v1/buyer/categories | 两级分类树 |
| 商品列表 | GET | /api/v1/buyer/products | 分页、筛选、排序 |
| 商品详情 | GET | /api/v1/buyer/products/:id | 含店铺信息+评价概览 |
| 商品搜索 | GET | /api/v1/buyer/products/search | 关键词搜索+筛选 |
| 店铺主页 | GET | /api/v1/buyer/shops/:id | 店铺信息+商品列表 |

**商品列表筛选参数**：
- `category_id`：分类筛选
- `shop_id`：店铺筛选
- `keyword`：关键词搜索
- `sort_by`：排序字段（price_asc / price_desc / sales / newest）
- `min_price` / `max_price`：价格区间
- `page` / `page_size`：分页

#### 4.2.2 卖家端 — 商品管理

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 我的商品列表 | GET | /api/v1/seller/products | 含各状态筛选 |
| 发布商品 | POST | /api/v1/seller/products | 提交审核 |
| 编辑商品 | PUT | /api/v1/seller/products/:id | - |
| 上架/下架 | PUT | /api/v1/seller/products/:id/status | 切换上下架 |
| 删除商品 | DELETE | /api/v1/seller/products/:id | 软删除 |
| 批量改价 | PUT | /api/v1/seller/products/batch-price | 生鲜价格波动频繁 |
| 库存调整 | PUT | /api/v1/seller/products/:id/stock | 手动补货/清零 |

**业务规则**：
- 新发布商品默认状态为"审核中"，管理后台审核通过后方可上架
- 生鲜商品价格支持每日调价（批量改价功能）
- 库存为0时自动下架，补货后需手动上架
- 商品图片上限9张，封面图必填

---

### 4.3 购物车模块

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 购物车列表 | GET | /api/v1/buyer/cart | 按店铺分组返回 |
| 加入购物车 | POST | /api/v1/buyer/cart | 已存在则累加数量 |
| 修改数量 | PUT | /api/v1/buyer/cart/:id | - |
| 删除商品 | DELETE | /api/v1/buyer/cart/:id | - |
| 批量删除 | DELETE | /api/v1/buyer/cart/batch | - |
| 全选/取消 | PUT | /api/v1/buyer/cart/select-all | - |
| 清空失效商品 | DELETE | /api/v1/buyer/cart/invalid | 下架/删除的商品 |

**业务规则**：
- 购物车按店铺分组展示
- 加购时校验库存、商品状态、起购量
- 实时显示小计金额
- 失效商品（下架/删除/售罄）标记为"失效"，置灰展示
- 单个购物车上限100条

---

### 4.4 订单模块

#### 4.4.1 订单流转状态机

```
              买家下单
                │
                ▼
         ┌──[待确认]──────┐
         │(0)             │
    卖家确认          取消（买家/卖家/超时）
         │                │
         ▼                ▼
     [已确认]          [已取消]
      (1)               (5)
         │
    卖家发货
         │
         ▼
     [配送中]
      (2)
         │
    确认送达
         │
         ▼
     [已送达]
      (3)
         │
    买家确认收货 / 超时自动完成
         │
         ▼
     [已完成]──────────→ 可评价
      (4)
```

#### 4.4.2 买家端 — 订单接口

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 提交订单（确认页） | POST | /api/v1/buyer/orders/confirm | 返回确认信息，不创建订单 |
| 创建订单 | POST | /api/v1/buyer/orders | 锁库存、生成订单 |
| 订单列表 | GET | /api/v1/buyer/orders | 按状态筛选 |
| 订单详情 | GET | /api/v1/buyer/orders/:id | - |
| 取消订单 | PUT | /api/v1/buyer/orders/:id/cancel | 仅待确认可取消 |
| 确认收货 | PUT | /api/v1/buyer/orders/:id/receive | - |
| 再来一单 | POST | /api/v1/buyer/orders/:id/reorder | 加入购物车 |
| 删除订单 | DELETE | /api/v1/buyer/orders/:id | 软删除（仅已完成/已取消） |

#### 4.4.3 卖家端 — 订单接口

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 订单列表 | GET | /api/v1/seller/orders | 按状态筛选+时间 |
| 订单详情 | GET | /api/v1/seller/orders/:id | - |
| 确认接单 | PUT | /api/v1/seller/orders/:id/confirm | - |
| 拒绝接单 | PUT | /api/v1/seller/orders/:id/reject | 需填原因 |
| 标记配送 | PUT | /api/v1/seller/orders/:id/deliver | - |
| 确认送达 | PUT | /api/v1/seller/orders/:id/arrived | - |
| 订单备注 | PUT | /api/v1/seller/orders/:id/remark | 卖家内部备注 |

**核心业务规则**：
- 下单时锁定库存，取消或超时释放库存
- 同一店铺的商品合并为一个订单，不同店铺拆分为多个订单
- 订单编号规则：`FM` + 年月日时分秒(14位) + 随机数(6位)，如 `FM20260413143052892371`
- 待确认超过30分钟（可配置）自动取消
- 已送达超过24小时（可配置）自动完成
- 配送费逻辑：订单金额 ≥ 免运费门槛则免配送费，否则收取基础配送费

---

### 4.5 评价模块

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 提交评价 | POST | /api/v1/buyer/reviews | 订单完成后7天内可评价 |
| 商品评价列表 | GET | /api/v1/buyer/products/:id/reviews | 分页 |
| 我的评价 | GET | /api/v1/buyer/reviews | - |
| 商家回复评价 | PUT | /api/v1/seller/reviews/:id/reply | - |

**业务规则**：
- 每个订单明细只能评价一次
- 支持1-5星评分 + 文字 + 最多6张图片
- 支持匿名评价
- 超过评价期限自动5星好评
- 评价影响店铺评分（加权平均）

---

### 4.6 消息通知模块

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 通知列表 | GET | /api/v1/{role}/notifications | 分页+按类型筛选 |
| 未读数 | GET | /api/v1/{role}/notifications/unread-count | - |
| 标记已读 | PUT | /api/v1/{role}/notifications/:id/read | - |
| 全部已读 | PUT | /api/v1/{role}/notifications/read-all | - |

**通知触发场景**：
- 买家：订单被确认/拒绝/发货/送达、评价被回复、系统公告
- 卖家：新订单、买家取消、新评价、商品审核结果、系统公告
- 实现方式：第一期使用数据库轮询，后续升级为 WebSocket / 推送

---

### 4.7 卖家入驻模块

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 申请入驻 | POST | /api/v1/seller/shop/apply | 提交店铺+资质信息 |
| 入驻状态查询 | GET | /api/v1/seller/shop/audit-status | - |
| 店铺信息修改 | PUT | /api/v1/seller/shop | 需重新审核 |
| 店铺营业状态 | PUT | /api/v1/seller/shop/status | 开/关店 |
| 经营数据概览 | GET | /api/v1/seller/dashboard | 今日/本周/本月数据 |

---

### 4.8 文件上传

| 接口 | 方法 | 路径 | 说明 |
|---|---|---|---|
| 图片上传 | POST | /api/v1/common/upload/image | 单张，限5MB |
| 批量上传 | POST | /api/v1/common/upload/images | 最多9张 |

**规则**：
- 支持 jpg/jpeg/png/webp 格式
- 单张限制 5MB
- 服务端压缩+生成缩略图
- 第一期使用本地存储 `/uploads/`，预留 OSS 接口

---

## 五、管理后台功能

### 5.1 功能模块总览

| 模块 | 功能点 |
|---|---|
| 工作台 | 数据看板：今日订单数/金额、新增用户、待处理事项 |
| 用户管理 | 用户列表、启用/禁用、角色变更、详情查看 |
| 店铺管理 | 入驻审核、店铺列表、强制关店、详情查看 |
| 商品管理 | 商品审核、商品列表、强制下架、推荐管理 |
| 分类管理 | 一二级分类CRUD、排序、状态切换 |
| 订单管理 | 订单列表、详情、介入处理、数据导出 |
| 评价管理 | 评价列表、隐藏/显示、敏感词过滤 |
| 内容管理 | 轮播图管理、系统公告 |
| 系统配置 | 配送费、自动取消时间等参数配置 |
| 管理员管理 | 管理员CRUD、权限分配 |
| 数据统计 | 交易趋势、品类分析、商户排行、用户增长 |

### 5.2 管理后台 API 示例

```
GET    /api/v1/admin/dashboard              # 工作台数据
GET    /api/v1/admin/users                   # 用户列表
PUT    /api/v1/admin/users/:id/status        # 禁用/启用用户
GET    /api/v1/admin/shops                   # 店铺列表
PUT    /api/v1/admin/shops/:id/audit         # 审核店铺
GET    /api/v1/admin/products                # 商品列表
PUT    /api/v1/admin/products/:id/audit      # 审核商品
PUT    /api/v1/admin/products/:id/recommend  # 推荐/取消推荐
GET    /api/v1/admin/orders                  # 订单列表
GET    /api/v1/admin/orders/export           # 导出订单Excel
POST   /api/v1/admin/categories              # 创建分类
PUT    /api/v1/admin/categories/:id          # 修改分类
DELETE /api/v1/admin/categories/:id          # 删除分类
POST   /api/v1/admin/banners                 # 创建轮播图
PUT    /api/v1/admin/banners/:id             # 修改轮播图
DELETE /api/v1/admin/banners/:id             # 删除轮播图
GET    /api/v1/admin/configs                 # 获取配置列表
PUT    /api/v1/admin/configs/:key            # 修改配置
GET    /api/v1/admin/statistics/overview     # 统计概览
GET    /api/v1/admin/statistics/trends       # 交易趋势
```

---

## 六、三端页面规划

### 6.1 买家端 APP 页面

| 页面 | 功能描述 |
|---|---|
| **首页** | 搜索栏 + 轮播图 + 分类入口(横向滚动) + 推荐商品流 |
| **分类页** | 左侧一级分类 + 右侧二级分类及商品列表 |
| **搜索页** | 搜索历史 + 热门搜索 + 实时搜索结果 |
| **商品详情页** | 商品图轮播 + 价格/单位 + 规格选择 + 店铺信息 + 评价 + 加购/立即购买 |
| **店铺主页** | 店铺信息 + 全部商品 + 按分类筛选 |
| **购物车页** | 按店铺分组 + 编辑数量 + 全选 + 结算 |
| **确认订单页** | 地址选择 + 商品清单 + 配送方式 + 备注 + 费用合计 |
| **订单列表页** | Tab切换状态 + 订单卡片 + 操作按钮 |
| **订单详情页** | 订单状态流程 + 收货信息 + 商品清单 + 金额明细 + 操作 |
| **评价页** | 星级评分 + 文字输入 + 图片上传 |
| **消息中心** | 订单消息 / 系统通知 分组展示 |
| **个人中心** | 头像昵称 + 订单快捷入口(待确认/配送中/待评价) + 地址管理 + 设置 |
| **地址管理页** | 地址列表 + 新增/编辑 + 设为默认 |
| **设置页** | 修改密码 + 关于我们 + 退出登录 |

### 6.2 卖家端 APP 页面

| 页面 | 功能描述 |
|---|---|
| **工作台** | 今日订单/收入 + 待处理订单数 + 快捷操作入口 |
| **订单管理** | Tab切换(全部/待确认/待配送/配送中) + 操作 |
| **订单详情** | 买家信息 + 商品明细 + 操作按钮(接单/拒绝/发货/送达) |
| **商品管理** | Tab(在售/仓库/审核中) + 商品卡片 + 上下架 |
| **发布商品** | 分类选择 + 图片上传 + 价格/库存/单位等信息填写 |
| **快速改价** | 商品列表 + 内联编辑价格 + 批量保存 |
| **评价管理** | 评价列表 + 回复入口 |
| **店铺设置** | 店铺信息编辑 + 营业状态 + 营业时间 |
| **数据统计** | 日/周/月销售额 + 订单量 + 热销商品排行 |
| **消息中心** | 新订单 / 审核结果 / 系统通知 |
| **个人中心** | 店铺信息 + 设置 + 退出 |

### 6.3 管理后台 Web 页面

基于 Ant Design Pro 的 Layout，侧边栏菜单结构：

```
├── 工作台                # Dashboard
├── 用户管理
│   ├── 用户列表
│   └── 用户详情
├── 店铺管理
│   ├── 入驻审核
│   ├── 店铺列表
│   └── 店铺详情
├── 商品管理
│   ├── 商品审核
│   ├── 商品列表
│   └── 推荐管理
├── 分类管理
├── 订单管理
│   ├── 订单列表
│   └── 订单详情
├── 评价管理
├── 内容管理
│   ├── 轮播图管理
│   └── 系统公告
├── 数据统计
│   ├── 交易趋势
│   ├── 品类分析
│   └── 商户排行
├── 系统设置
│   ├── 参数配置
│   └── 管理员管理
```

---

## 七、开发排期规划

### 7.1 开发阶段划分

以下按 2人后端 + 2人前端(含APP) + 1人兼职UI 配置估算，总工期约 **12-14 周**。

| 阶段 | 周期 | 内容 | 产出 |
|---|---|---|---|
| **P0 基础搭建** | 第1-2周 | 项目脚手架、DB建表、认证体系、基础中间件、UI设计 | 前后端可联调的骨架 |
| **P1 核心链路** | 第3-6周 | 商品CRUD+列表+搜索、购物车、下单+订单流转、买家/卖家核心页面 | 可走通下单全流程的MVP |
| **P2 运营功能** | 第7-9周 | 管理后台全部功能、审核流程、分类管理、轮播图、评价体系 | 可运营的完整后台 |
| **P3 体验优化** | 第10-11周 | 消息通知、数据统计、店铺入驻流程、页面细节打磨 | 功能完整 |
| **P4 测试上线** | 第12-14周 | 集成测试、性能优化、Bug修复、部署上线 | 生产就绪 |

### 7.2 各阶段详细任务

#### P0 基础搭建（第1-2周）

**后端**：
- Go项目初始化（Gin + GORM + JWT + Zap日志）
- MySQL建库建表 + 数据迁移脚本
- 统一响应格式封装（code/message/data）
- JWT认证中间件 + RBAC权限中间件
- 文件上传接口 + 图片处理
- Swagger文档集成
- 短信验证码接口（对接第三方或Mock）

**前端/APP**：
- React + Ant Design Pro 管理后台脚手架
- React Native + Expo 项目初始化（买家端+卖家端）
- 统一请求封装（Axios / fetch）、Token管理
- 公共组件库搭建（导航、空状态、加载、Toast等）
- 登录/注册页面

#### P1 核心链路（第3-6周）

**后端**：
- 分类CRUD接口
- 商品CRUD + 列表 + 详情 + 搜索接口
- 购物车全套接口
- 订单创建 + 状态流转接口（含库存锁定/释放）
- 定时任务：超时取消、自动完成

**买家APP**：
- 首页（轮播 + 分类 + 推荐商品流）
- 分类页 + 搜索页
- 商品详情页
- 购物车页
- 确认订单页 + 地址选择
- 订单列表 + 详情页

**卖家APP**：
- 工作台首页
- 商品管理（列表 + 发布 + 编辑）
- 订单管理（列表 + 详情 + 接单/拒绝/发货）

#### P2 运营功能（第7-9周）

**后端**：
- 管理后台全部接口（用户/店铺/商品/订单/分类/轮播/配置）
- 审核流程（店铺入驻审核、商品审核）
- 评价接口 + 店铺评分更新
- 订单数据导出

**管理后台**：
- 工作台数据看板
- 用户管理页
- 店铺审核 + 列表页
- 商品审核 + 列表页
- 分类管理（可拖拽排序）
- 订单管理 + 导出
- 轮播图管理
- 系统配置页

#### P3 体验优化（第10-11周）

**后端**：
- 消息通知接口 + 触发逻辑
- 数据统计接口（趋势、排行）
- 卖家数据概览接口
- Redis缓存热点数据（首页、分类树）
- 接口性能优化

**APP + 后台**：
- 消息中心页面
- 卖家数据统计页
- 管理后台数据统计（图表）
- 页面动效、骨架屏、下拉刷新
- 个人中心完善
- 卖家入驻流程页面

#### P4 测试上线（第12-14周）

- 接口自动化测试
- APP多机型适配测试
- 压力测试（核心接口）
- 安全扫描（SQL注入、XSS等）
- 生产环境部署（Docker + Nginx）
- 数据库初始化（分类、配置、管理员账号）
- 应用商店发布准备

---

## 八、API 统一规范

### 8.1 请求响应格式

```json
// 成功响应
{
    "code": 0,
    "message": "success",
    "data": {}
}

// 分页响应
{
    "code": 0,
    "message": "success",
    "data": {
        "list": [],
        "pagination": {
            "page": 1,
            "page_size": 20,
            "total": 100,
            "total_pages": 5
        }
    }
}

// 错误响应
{
    "code": 40001,
    "message": "手机号已注册",
    "data": null
}
```

### 8.2 错误码规划

| 范围 | 模块 |
|---|---|
| 10000-19999 | 系统级错误（参数、认证、权限） |
| 20000-29999 | 用户模块 |
| 30000-39999 | 商品模块 |
| 40000-49999 | 订单模块 |
| 50000-59999 | 店铺模块 |

关键错误码示例：

| Code | 说明 |
|---|---|
| 10001 | 参数校验失败 |
| 10002 | Token无效或过期 |
| 10003 | 无权限 |
| 10004 | 请求频率超限 |
| 20001 | 手机号已注册 |
| 20002 | 账号或密码错误 |
| 20003 | 验证码错误或过期 |
| 30001 | 商品不存在或已下架 |
| 30002 | 库存不足 |
| 40001 | 订单不存在 |
| 40002 | 订单状态不允许当前操作 |
| 50001 | 店铺审核未通过 |

---

## 九、非功能性需求

### 9.1 性能要求

| 指标 | 目标值 |
|---|---|
| 接口平均响应时间 | < 200ms |
| 首页加载时间 | < 1.5s（含图片） |
| 商品列表接口 | < 300ms（含分页） |
| 并发支持 | 500 QPS（初期） |
| APP冷启动时间 | < 3s |

### 9.2 安全要求

- 所有接口走 HTTPS
- 密码 bcrypt 哈希存储，不可逆
- SQL 注入防护（GORM 参数化查询）
- XSS 防护（输入过滤 + 输出转义）
- 接口限流（IP维度 + 用户维度）
- 敏感操作日志记录（登录、改密、审核等）
- 文件上传类型和大小校验

### 9.3 部署方案

```
                    ┌──────────┐
                    │  Nginx   │ 反向代理 + 静态资源 + SSL
                    └────┬─────┘
             ┌───────────┼───────────┐
             ▼           ▼           ▼
        ┌────────┐  ┌────────┐  ┌────────┐
        │ Go API │  │ Go API │  │ Admin  │
        │ :8080  │  │ :8081  │  │  Web   │
        └───┬────┘  └───┬────┘  └────────┘
            └─────┬──────┘
                  ▼
          ┌──────────────┐
          │ MySQL + Redis│
          └──────────────┘
```

- Docker 容器化部署
- MySQL 主从（生产环境建议）
- Redis 用于缓存 + Session + 限流
- Nginx 负载均衡 + 静态资源托管（管理后台）
- APP通过 Expo EAS Build 打包发布

---

## 十、后续迭代规划（v2.0+）

| 版本 | 功能 |
|---|---|
| v1.1 | 接入在线支付（微信/支付宝），退款流程 |
| v1.2 | 优惠券、满减活动、限时折扣 |
| v2.0 | 骑手端APP、实时配送追踪、地图导航 |
| v2.1 | IM即时通讯（买卖家沟通） |
| v2.2 | 供应链管理、批发功能 |
| v3.0 | 直播卖货、社区团购 |

---

## 附录 A：技术选型明细

| 层级 | 技术 | 说明 |
|---|---|---|
| 后端框架 | Go + Gin | 高性能HTTP框架 |
| ORM | GORM | Go主流ORM |
| 数据库 | MySQL 8.0 | 主数据存储 |
| 缓存 | Redis 7 | 热点缓存、限流、验证码 |
| 认证 | JWT (golang-jwt) | 无状态认证 |
| 日志 | Zap + Lumberjack | 结构化日志+轮转 |
| 文档 | Swagger (swag) | API文档自动生成 |
| 管理后台 | React 18 + Ant Design Pro 6 | 企业级中后台 |
| APP框架 | React Native 0.76+ | 跨平台移动开发 |
| APP工具链 | Expo SDK 52+ | 构建+发布工具链 |
| 状态管理 | Zustand（APP）/ UmiJS（后台） | 轻量状态管理 |
| 网络请求 | Axios | 统一HTTP客户端 |
| 图片处理 | sharp (Node) / imaging (Go) | 压缩+缩略图 |
| 部署 | Docker + Docker Compose | 容器化 |
| Web服务器 | Nginx | 反向代理+静态托管 |

## 附录 B：预设数据

### 商品分类初始化数据

```
蔬菜
  ├── 叶菜类（白菜、菠菜、生菜、空心菜、油麦菜...）
  ├── 根茎类（土豆、萝卜、莲藕、山药、芋头...）
  ├── 瓜果类（黄瓜、西红柿、茄子、辣椒、南瓜...）
  ├── 菌菇类（香菇、平菇、金针菇、杏鲍菇...）
  └── 豆类（豆角、毛豆、豌豆、豆芽...）

猪肉
  ├── 五花肉
  ├── 排骨（肋排、大排、小排）
  ├── 里脊肉
  ├── 前腿肉/后腿肉
  ├── 猪蹄/猪手
  ├── 猪骨（筒骨、龙骨、扇骨）
  └── 内脏（猪肝、猪肚、大肠...）

鱼类水产
  ├── 淡水鱼（草鱼、鲫鱼、鲤鱼、鲈鱼、黑鱼...）
  ├── 海水鱼（带鱼、黄鱼、鲳鱼、三文鱼...）
  ├── 虾蟹（基围虾、小龙虾、大闸蟹、花蟹...）
  ├── 贝类（蛤蜊、生蚝、扇贝、花甲...）
  └── 干货（虾米、鱿鱼干、紫菜、海带...）

其他
  ├── 蛋类（鸡蛋、鸭蛋、鹌鹑蛋）
  ├── 豆制品（豆腐、豆皮、腐竹）
  └── 调味料（葱、姜、蒜、香菜）
```
