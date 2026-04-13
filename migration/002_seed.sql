-- FreshMart MVP seed migration (idempotent)
-- Includes: categories + system_configs + super admin

INSERT INTO categories (id, parent_id, name, icon, sort_order, status)
VALUES
    (1, 0, '蔬菜', '', 1, 1),
    (2, 0, '猪肉', '', 2, 1),
    (3, 0, '鱼类', '', 3, 1),
    (4, 0, '其他', '', 4, 1),
    (101, 1, '叶菜类', '', 1, 1),
    (102, 1, '根茎类', '', 2, 1),
    (103, 1, '瓜果类', '', 3, 1),
    (104, 1, '菌菇类', '', 4, 1),
    (105, 1, '豆类', '', 5, 1),
    (201, 2, '五花肉', '', 1, 1),
    (202, 2, '排骨', '', 2, 1),
    (203, 2, '里脊', '', 3, 1),
    (204, 2, '猪蹄', '', 4, 1),
    (205, 2, '内脏', '', 5, 1),
    (206, 2, '猪骨', '', 6, 1),
    (301, 3, '淡水鱼', '', 1, 1),
    (302, 3, '海水鱼', '', 2, 1),
    (303, 3, '虾蟹', '', 3, 1),
    (304, 3, '贝类', '', 4, 1),
    (305, 3, '干货', '', 5, 1)
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    name = VALUES(name),
    icon = VALUES(icon),
    sort_order = VALUES(sort_order),
    status = VALUES(status);

INSERT INTO system_configs (config_key, config_value, remark)
VALUES
    ('delivery_base_fee', '5.00', '基础运费'),
    ('delivery_free_threshold', '50.00', '满额包邮门槛'),
    ('order_auto_cancel_minutes', '30', '待确认超时取消（分钟）'),
    ('order_auto_complete_hours', '24', '已送达自动完成（小时）'),
    ('review_deadline_days', '7', '评价截止天数')
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    remark = VALUES(remark);

-- seed super admin:
-- phone: 13800000000
-- password: Admin@123456
INSERT INTO users (phone, password_hash, nickname, role, status)
VALUES (
    '13800000000',
    '$2b$10$fqsSQYsCcjYLjyN1mrSZZepEHUj2ZUnFsoO8MP6F7lrbIXnb60k66',
    '系统超管',
    3,
    1
)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nickname = VALUES(nickname),
    role = VALUES(role),
    status = VALUES(status),
    deleted_at = NULL;

INSERT INTO admins (user_id, real_name, role_level, permissions)
SELECT id, '系统超管', 2, JSON_ARRAY('*')
FROM users
WHERE phone = '13800000000'
ON DUPLICATE KEY UPDATE
    real_name = '系统超管',
    role_level = 2,
    permissions = JSON_ARRAY('*');
