package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"freshmart/internal/repository"
)

var (
	ErrSystemConfigNotFound     = errors.New("config not found")
	ErrSystemConfigInvalidValue = errors.New("invalid config_value")
)

type AdminSystemConfigService struct {
	configRepo *repository.SystemConfigRepository
}

func NewAdminSystemConfigService(configRepo *repository.SystemConfigRepository) *AdminSystemConfigService {
	return &AdminSystemConfigService{configRepo: configRepo}
}

type SystemConfigView struct {
	ID          uint64 `json:"id"`
	ConfigKey   string `json:"config_key"`
	ConfigValue string `json:"config_value"`
	Remark      string `json:"remark"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func (s *AdminSystemConfigService) List(ctx context.Context) ([]SystemConfigView, error) {
	rows, err := s.configRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]SystemConfigView, 0, len(rows))
	for _, r := range rows {
		out = append(out, SystemConfigView{
			ID:          r.ID,
			ConfigKey:   r.ConfigKey,
			ConfigValue: r.ConfigValue,
			Remark:      r.Remark,
			CreatedAt:   r.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   r.UpdatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

func (s *AdminSystemConfigService) UpdateValue(ctx context.Context, key, value string) error {
	key = strings.TrimSpace(key)
	if key == "" {
		return ErrSystemConfigNotFound
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return ErrSystemConfigInvalidValue
	}
	if err := validateSystemConfigValue(key, value); err != nil {
		return err
	}
	n, err := s.configRepo.UpdateValueByKey(ctx, key, value)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrSystemConfigNotFound
	}
	return nil
}

func validateSystemConfigValue(key, value string) error {
	switch key {
	case "order_auto_cancel_minutes", "order_auto_complete_hours", "review_deadline_days":
		n, err := strconv.Atoi(value)
		if err != nil || n <= 0 {
			return ErrSystemConfigInvalidValue
		}
	case "delivery_base_fee", "delivery_free_threshold":
		f, err := strconv.ParseFloat(value, 64)
		if err != nil || f < 0 {
			return ErrSystemConfigInvalidValue
		}
	default:
		// 其它键：允许非空字符串（便于扩展）
	}
	return nil
}
