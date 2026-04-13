-- FreshMart MVP schema migration (idempotent)
-- Source of truth: docs/requirement.md + docs/db-design.md v1.1

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS shops (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID',
    shop_name        VARCHAR(100) NOT NULL COMMENT '店铺名称',
    logo             VARCHAR(500) DEFAULT '' COMMENT '店铺Logo',
    description      TEXT COMMENT '店铺简介',
    contact_phone    VARCHAR(20) DEFAULT '' COMMENT '联系电话',
    province         VARCHAR(50) DEFAULT '' COMMENT '省',
    city             VARCHAR(50) DEFAULT '' COMMENT '市',
    district         VARCHAR(50) DEFAULT '' COMMENT '区',
    address          VARCHAR(255) DEFAULT '' COMMENT '详细地址',
    latitude         DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
    longitude        DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
    business_license VARCHAR(500) DEFAULT '' COMMENT '营业执照图片',
    audit_status     TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态: 0=待审核 1=已通过 2=已拒绝',
    audit_remark     VARCHAR(255) DEFAULT '' COMMENT '审核备注',
    rating           DECIMAL(2,1) DEFAULT 5.0 COMMENT '店铺评分',
    total_sales      INT UNSIGNED DEFAULT 0 COMMENT '总销量',
    status           TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0=关店 1=营业',
    opening_time     TIME DEFAULT NULL COMMENT '营业开始时间',
    closing_time     TIME DEFAULT NULL COMMENT '营业结束时间',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       DATETIME DEFAULT NULL,
    UNIQUE KEY uk_user_id (user_id),
    KEY idx_audit_status (audit_status),
    KEY idx_city (city),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='店铺表';

CREATE TABLE IF NOT EXISTS user_addresses (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    contact_name   VARCHAR(50) NOT NULL COMMENT '联系人',
    contact_phone  VARCHAR(20) NOT NULL COMMENT '联系电话',
    province       VARCHAR(50) NOT NULL,
    city           VARCHAR(50) NOT NULL,
    district       VARCHAR(50) NOT NULL,
    detail_address VARCHAR(255) NOT NULL COMMENT '详细地址',
    latitude       DECIMAL(10,7) DEFAULT NULL,
    longitude      DECIMAL(10,7) DEFAULT NULL,
    is_default     TINYINT NOT NULL DEFAULT 0 COMMENT '是否默认: 0=否 1=是',
    tag            VARCHAR(20) DEFAULT '' COMMENT '标签: 家、公司等',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME DEFAULT NULL,
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址表';

CREATE TABLE IF NOT EXISTS admins (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    real_name   VARCHAR(50) DEFAULT '' COMMENT '真实姓名',
    role_level  TINYINT NOT NULL DEFAULT 1 COMMENT '1=普通管理 2=超级管理',
    permissions JSON DEFAULT NULL COMMENT '权限列表',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

CREATE TABLE IF NOT EXISTS categories (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id  BIGINT UNSIGNED DEFAULT 0 COMMENT '父分类ID, 0=一级分类',
    name       VARCHAR(50) NOT NULL COMMENT '分类名称',
    icon       VARCHAR(500) DEFAULT '' COMMENT '分类图标',
    sort_order INT DEFAULT 0 COMMENT '排序值，越小越靠前',
    status     TINYINT NOT NULL DEFAULT 1 COMMENT '0=隐藏 1=显示',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_parent_id (parent_id),
    KEY idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

CREATE TABLE IF NOT EXISTS products (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    shop_id        BIGINT UNSIGNED NOT NULL COMMENT '店铺ID',
    category_id    BIGINT UNSIGNED NOT NULL COMMENT '分类ID（二级）',
    name           VARCHAR(100) NOT NULL COMMENT '商品名称',
    subtitle       VARCHAR(200) DEFAULT '' COMMENT '副标题/卖点',
    cover_image    VARCHAR(500) NOT NULL COMMENT '封面图',
    images         JSON DEFAULT NULL COMMENT '商品图片列表',
    description    TEXT COMMENT '商品详情（富文本）',
    price          DECIMAL(10,2) NOT NULL COMMENT '销售单价',
    original_price DECIMAL(10,2) DEFAULT NULL COMMENT '原价（划线价）',
    unit           VARCHAR(20) NOT NULL DEFAULT '斤' COMMENT '单位: 斤/条/只/份/kg',
    min_buy        DECIMAL(10,2) DEFAULT 1 COMMENT '起购量',
    step_buy       DECIMAL(10,2) DEFAULT 0.5 COMMENT '递增步长',
    stock          INT NOT NULL DEFAULT 0 COMMENT '库存量',
    sales          INT UNSIGNED DEFAULT 0 COMMENT '销量',
    status         TINYINT NOT NULL DEFAULT 0 COMMENT '0=下架 1=上架 2=审核中',
    is_recommend   TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否 1=是',
    origin_place   VARCHAR(100) DEFAULT '' COMMENT '产地',
    shelf_life     VARCHAR(50) DEFAULT '' COMMENT '保质期描述',
    storage_method VARCHAR(100) DEFAULT '' COMMENT '储存方式',
    sort_order     INT DEFAULT 0 COMMENT '排序',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME DEFAULT NULL,
    KEY idx_shop_id (shop_id),
    KEY idx_category_id (category_id),
    KEY idx_status (status),
    KEY idx_created_at (created_at),
    FULLTEXT KEY ft_name (name, subtitle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

CREATE TABLE IF NOT EXISTS product_skus (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    sku_name   VARCHAR(100) NOT NULL COMMENT '规格名: 如"精选五花肉 2斤装"',
    price      DECIMAL(10,2) NOT NULL,
    stock      INT NOT NULL DEFAULT 0,
    weight     DECIMAL(10,2) DEFAULT NULL COMMENT '重量(kg)',
    status     TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品SKU表';

CREATE TABLE IF NOT EXISTS cart_items (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NOT NULL,
    shop_id    BIGINT UNSIGNED NOT NULL COMMENT '店铺ID（按店分组）',
    product_id BIGINT UNSIGNED NOT NULL,
    sku_id     BIGINT UNSIGNED DEFAULT NULL,
    quantity   DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT '数量',
    selected   TINYINT NOT NULL DEFAULT 1 COMMENT '是否选中: 0=否 1=是',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_product_sku (user_id, product_id, sku_id),
    KEY idx_user_shop (user_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='购物车表';

CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no         VARCHAR(32) NOT NULL COMMENT '订单编号',
    buyer_id         BIGINT UNSIGNED NOT NULL COMMENT '买家ID',
    shop_id          BIGINT UNSIGNED NOT NULL COMMENT '店铺ID',
    seller_id        BIGINT UNSIGNED NOT NULL COMMENT '卖家ID',
    total_amount     DECIMAL(10,2) NOT NULL COMMENT '商品总金额',
    freight_amount   DECIMAL(10,2) DEFAULT 0.00 COMMENT '运费',
    discount_amount  DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额（预留）',
    pay_amount       DECIMAL(10,2) NOT NULL COMMENT '应付金额',
    receiver_name    VARCHAR(50) NOT NULL,
    receiver_phone   VARCHAR(20) NOT NULL,
    receiver_address VARCHAR(500) NOT NULL,
    receiver_lat     DECIMAL(10,7) DEFAULT NULL,
    receiver_lng     DECIMAL(10,7) DEFAULT NULL,
    status           TINYINT NOT NULL DEFAULT 0 COMMENT '0=待确认 1=已确认 2=配送中 3=已送达 4=已完成 5=已取消 6=退货中 7=已退货',
    settlement_status TINYINT NOT NULL DEFAULT 0 COMMENT '对账: 0=未标记 1=已核对（线下对账用，不参与状态机）',
    cancel_reason    VARCHAR(255) DEFAULT '' COMMENT '取消原因',
    cancel_by        TINYINT DEFAULT NULL COMMENT '取消方: 1=买家 2=卖家 3=系统',
    delivery_type    TINYINT DEFAULT 1 COMMENT '1=商家配送 2=自提',
    delivery_time    VARCHAR(50) DEFAULT '' COMMENT '期望送达时间',
    delivered_at     DATETIME DEFAULT NULL COMMENT '实际送达时间',
    buyer_remark     VARCHAR(255) DEFAULT '' COMMENT '买家备注',
    seller_remark    VARCHAR(255) DEFAULT '' COMMENT '卖家备注',
    confirmed_at     DATETIME DEFAULT NULL COMMENT '卖家确认时间',
    completed_at     DATETIME DEFAULT NULL COMMENT '完成时间',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       DATETIME DEFAULT NULL,
    UNIQUE KEY uk_order_no (order_no),
    KEY idx_buyer_id (buyer_id),
    KEY idx_shop_id (shop_id),
    KEY idx_seller_id (seller_id),
    KEY idx_status (status),
    KEY idx_created_at (created_at),
    KEY idx_shop_status_created (shop_id, status, created_at),
    KEY idx_buyer_status_created (buyer_id, status, created_at),
    KEY idx_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

CREATE TABLE IF NOT EXISTS order_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id      BIGINT UNSIGNED NOT NULL,
    product_id    BIGINT UNSIGNED NOT NULL,
    sku_id        BIGINT UNSIGNED DEFAULT NULL,
    product_name  VARCHAR(100) NOT NULL COMMENT '商品名快照',
    product_image VARCHAR(500) DEFAULT '' COMMENT '商品图快照',
    unit          VARCHAR(20) NOT NULL COMMENT '单位快照',
    price         DECIMAL(10,2) NOT NULL COMMENT '单价快照',
    quantity      DECIMAL(10,2) NOT NULL COMMENT '数量',
    subtotal      DECIMAL(10,2) NOT NULL COMMENT '小计',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';

CREATE TABLE IF NOT EXISTS order_logs (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id      BIGINT UNSIGNED NOT NULL,
    from_status   TINYINT NOT NULL,
    to_status     TINYINT NOT NULL,
    operator_id   BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人',
    operator_role TINYINT DEFAULT NULL COMMENT '1=买家 2=卖家 3=管理员 4=系统',
    remark        VARCHAR(255) DEFAULT '',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单状态流水表';

CREATE TABLE IF NOT EXISTS reviews (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id      BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NOT NULL,
    product_id    BIGINT UNSIGNED NOT NULL,
    shop_id       BIGINT UNSIGNED NOT NULL,
    user_id       BIGINT UNSIGNED NOT NULL COMMENT '评价人（买家）',
    rating        TINYINT NOT NULL DEFAULT 5 COMMENT '评分1-5',
    content       TEXT COMMENT '评价内容',
    images        JSON DEFAULT NULL COMMENT '评价图片',
    is_anonymous  TINYINT DEFAULT 0 COMMENT '是否匿名',
    reply_content TEXT COMMENT '商家回复',
    reply_at      DATETIME DEFAULT NULL,
    status        TINYINT DEFAULT 1 COMMENT '0=隐藏 1=显示',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_item (order_item_id),
    KEY idx_product_id (product_id),
    KEY idx_shop_id (shop_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评价表';

CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NOT NULL COMMENT '接收人',
    type       VARCHAR(30) NOT NULL COMMENT '类型: order/system/promotion/review',
    title      VARCHAR(100) NOT NULL,
    content    VARCHAR(500) NOT NULL,
    biz_type   VARCHAR(30) DEFAULT '' COMMENT '关联业务类型',
    biz_id     BIGINT UNSIGNED DEFAULT NULL COMMENT '关联业务ID',
    is_read    TINYINT NOT NULL DEFAULT 0 COMMENT '0=未读 1=已读',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user_read (user_id, is_read),
    KEY idx_created_at (created_at),
    KEY idx_user_is_read_created (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息通知表';

CREATE TABLE IF NOT EXISTS banners (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(100) DEFAULT '',
    image_url  VARCHAR(500) NOT NULL,
    link_type  TINYINT DEFAULT 0 COMMENT '0=无跳转 1=商品 2=分类 3=外链',
    link_value VARCHAR(500) DEFAULT '',
    position   VARCHAR(30) DEFAULT 'home' COMMENT '位置: home/category',
    sort_order INT DEFAULT 0,
    status     TINYINT DEFAULT 1 COMMENT '0=隐藏 1=显示',
    start_time DATETIME DEFAULT NULL,
    end_time   DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮播图/广告位';

CREATE TABLE IF NOT EXISTS system_configs (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    config_key   VARCHAR(50) NOT NULL,
    config_value TEXT NOT NULL,
    remark       VARCHAR(255) DEFAULT '',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
