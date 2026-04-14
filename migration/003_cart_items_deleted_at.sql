-- Add soft-delete column for cart_items to match repository filters.
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cart_items'
      AND COLUMN_NAME = 'deleted_at'
);
SET @sql_add_col := IF(
    @col_exists = 0,
    'ALTER TABLE cart_items ADD COLUMN deleted_at DATETIME DEFAULT NULL AFTER updated_at',
    'SELECT 1'
);
PREPARE stmt_add_col FROM @sql_add_col;
EXECUTE stmt_add_col;
DEALLOCATE PREPARE stmt_add_col;

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cart_items'
      AND INDEX_NAME = 'idx_deleted_at'
);
SET @sql_add_idx := IF(
    @idx_exists = 0,
    'ALTER TABLE cart_items ADD INDEX idx_deleted_at (deleted_at)',
    'SELECT 1'
);
PREPARE stmt_add_idx FROM @sql_add_idx;
EXECUTE stmt_add_idx;
DEALLOCATE PREPARE stmt_add_idx;
