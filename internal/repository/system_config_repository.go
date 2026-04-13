package repository

import (
	"context"

	"gorm.io/gorm"
)

type SystemConfigRepository struct {
	db *gorm.DB
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
