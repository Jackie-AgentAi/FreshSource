package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type SystemConfigRepository struct {
	db *gorm.DB
}

// SystemConfigRow 管理端列表用（与表 system_configs 对齐）。
type SystemConfigRow struct {
	ID          uint64    `gorm:"column:id"`
	ConfigKey   string    `gorm:"column:config_key"`
	ConfigValue string    `gorm:"column:config_value"`
	Remark      string    `gorm:"column:remark"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func NewSystemConfigRepository(db *gorm.DB) *SystemConfigRepository {
	return &SystemConfigRepository{db: db}
}

func (r *SystemConfigRepository) GetValueByKey(ctx context.Context, key string) (string, error) {
	type row struct {
		ConfigValue string `gorm:"column:config_value"`
	}
	var result row
	err := r.db.WithContext(ctx).
		Table("system_configs").
		Select("config_value").
		Where("config_key = ?", key).
		Limit(1).
		Scan(&result).Error
	if err != nil {
		return "", err
	}
	return result.ConfigValue, nil
}

func (r *SystemConfigRepository) ListAll(ctx context.Context) ([]SystemConfigRow, error) {
	var rows []SystemConfigRow
	err := r.db.WithContext(ctx).
		Table("system_configs").
		Select("id, config_key, config_value, remark, created_at, updated_at").
		Order("config_key ASC").
		Scan(&rows).Error
	return rows, err
}

// UpdateValueByKey 更新 config_value；返回影响行数（0 表示 key 不存在）。
func (r *SystemConfigRepository) UpdateValueByKey(ctx context.Context, key, value string) (int64, error) {
	res := r.db.WithContext(ctx).
		Table("system_configs").
		Where("config_key = ?", key).
		Update("config_value", value)
	return res.RowsAffected, res.Error
}
