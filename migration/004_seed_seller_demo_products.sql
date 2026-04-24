-- 6 条模拟商品：写入测试卖家店铺（手机 13800003333，依赖 002_seed）
-- status=2 审核中 → 发货端「商品管理」审核中 Tab 可见 → 管理后台商品列表审核通过（audit_status=1）后自动上架（stock>0）
-- 可重复执行：按固定商品名清理本店旧数据（勿改名称前缀「演示·」以免误删）

DELETE p
FROM products p
         INNER JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND p.deleted_at IS NULL
  AND p.name IN (
                '演示·高山生菜', '演示·胡萝卜组合', '演示·番茄盒装',
                '演示·精选五花肉', '演示·肋排切件', '演示·鲜活鲫鱼'
    );

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       101,
       '演示·高山生菜',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm101/400/400',
       JSON_ARRAY('https://picsum.photos/seed/fm101b/400/400'),
       '模拟数据：叶菜类，供联调审核与上架流程。',
       4.50,
       5.80,
       '斤',
       1,
       0.5,
       80,
       0,
       2,
       0,
       '云南',
       '3天',
       '冷藏',
       1
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       102,
       '演示·胡萝卜组合',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm102/400/400',
       JSON_ARRAY(),
       '模拟数据：根茎类。',
       3.20,
       3.90,
       '斤',
       1,
       0.5,
       120,
       0,
       2,
       0,
       '山东',
       '7天',
       '阴凉干燥',
       2
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       103,
       '演示·番茄盒装',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm103/400/400',
       JSON_ARRAY('https://picsum.photos/seed/fm103b/400/400'),
       '模拟数据：瓜果类。',
       6.00,
       NULL,
       '盒',
       1,
       1,
       45,
       0,
       2,
       0,
       '本地',
       '5天',
       '冷藏',
       3
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       201,
       '演示·精选五花肉',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm201/400/400',
       JSON_ARRAY(),
       '模拟数据：五花肉分类。',
       28.00,
       32.00,
       '斤',
       1,
       0.5,
       40,
       0,
       2,
       0,
       '国产',
       '冷冻180天',
       '-18℃冷冻',
       4
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       202,
       '演示·肋排切件',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm202/400/400',
       JSON_ARRAY('https://picsum.photos/seed/fm202b/400/400'),
       '模拟数据：排骨分类。',
       35.00,
       38.00,
       '斤',
       1,
       0.5,
       25,
       0,
       2,
       0,
       '国产',
       '当天分割',
       '0-4℃冷藏',
       5
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;

INSERT INTO products (shop_id, category_id, name, subtitle, cover_image, images, description, price, original_price,
                      unit, min_buy, step_buy, stock, sales, status, is_recommend, origin_place, shelf_life,
                      storage_method, sort_order)
SELECT s.id,
       301,
       '演示·鲜活鲫鱼',
       'MVP 模拟数据',
       'https://picsum.photos/seed/fm301/400/400',
       JSON_ARRAY(),
       '模拟数据：淡水鱼类。',
       18.80,
       22.00,
       '条',
       1,
       1,
       30,
       0,
       2,
       0,
       '本地水产',
       '当日鲜',
       '充氧活水',
       6
FROM shops s
         INNER JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
WHERE u.phone = '13800003333'
  AND s.deleted_at IS NULL
LIMIT 1;
