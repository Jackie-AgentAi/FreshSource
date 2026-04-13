package service

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

const (
	defaultOrderAutoCancelMinutes      = 30
	defaultOrderAutoCompleteHours      = 24
	orderScheduleBatchLimit            = 100
	autoCancelReasonSystemTimeout      = "超时未接单"
	systemOrderCancelBy                = 3
	systemOrderOperatorRole       int8 = 4
)

type OrderScheduleService struct {
	tickMu      sync.Mutex
	txManager   *repository.TxManager
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
	configRepo  *repository.SystemConfigRepository
}

func NewOrderScheduleService(
	txManager *repository.TxManager,
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
	configRepo *repository.SystemConfigRepository,
) *OrderScheduleService {
	return &OrderScheduleService{
		txManager:   txManager,
		orderRepo:   orderRepo,
		productRepo: productRepo,
		configRepo:  configRepo,
	}
}

// RunTick 执行一轮：先处理待确认超时取消，再处理已送达超时完成。配置键见 system_configs。
func (s *OrderScheduleService) RunTick(ctx context.Context, log *zap.Logger) {
	if !s.tickMu.TryLock() {
		return
	}
	defer s.tickMu.Unlock()

	cancelMin := loadPositiveIntConfig(ctx, s.configRepo, "order_auto_cancel_minutes", defaultOrderAutoCancelMinutes)
	completeHrs := loadPositiveIntConfig(ctx, s.configRepo, "order_auto_complete_hours", defaultOrderAutoCompleteHours)

	now := time.Now()
	pendingCutoff := now.Add(-time.Duration(cancelMin) * time.Minute)
	pendingIDs, err := s.orderRepo.ListPendingOrderIDsForAutoCancel(ctx, pendingCutoff, orderScheduleBatchLimit)
	if err != nil {
		if log != nil {
			log.Warn("order schedule: list pending for auto-cancel failed", zap.Error(err))
		}
	} else {
		for _, id := range pendingIDs {
			if err := s.autoCancelPendingOrder(ctx, id); err != nil {
				if log != nil {
					log.Warn("order schedule: auto-cancel failed", zap.Uint64("order_id", id), zap.Error(err))
				}
				continue
			}
			if log != nil {
				log.Info("order schedule: auto-cancelled pending order", zap.Uint64("order_id", id))
			}
		}
	}

	arrivedCutoff := now.Add(-time.Duration(completeHrs) * time.Hour)
	arrivedIDs, err := s.orderRepo.ListArrivedOrderIDsForAutoComplete(ctx, arrivedCutoff, orderScheduleBatchLimit)
	if err != nil {
		if log != nil {
			log.Warn("order schedule: list arrived for auto-complete failed", zap.Error(err))
		}
		return
	}
	for _, id := range arrivedIDs {
		if err := s.autoCompleteArrivedOrder(ctx, id); err != nil {
			if log != nil {
				log.Warn("order schedule: auto-complete failed", zap.Uint64("order_id", id), zap.Error(err))
			}
			continue
		}
		if log != nil {
			log.Info("order schedule: auto-completed arrived order", zap.Uint64("order_id", id))
		}
	}
}

func loadPositiveIntConfig(
	ctx context.Context,
	repo *repository.SystemConfigRepository,
	key string,
	defaultVal int,
) int {
	raw, err := repo.GetValueByKey(ctx, key)
	if err != nil || strings.TrimSpace(raw) == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n <= 0 {
		return defaultVal
	}
	return n
}

func (s *OrderScheduleService) autoCancelPendingOrder(ctx context.Context, orderID uint64) error {
	reason := autoCancelReasonSystemTimeout
	cancelBy := systemOrderCancelBy
	role := systemOrderOperatorRole

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByID(ctx, tx, orderID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		if o.Status != 0 {
			return nil
		}
		var items []model.OrderItem
		if err := tx.WithContext(ctx).Where("order_id = ?", orderID).Order("id ASC").Find(&items).Error; err != nil {
			return err
		}
		for _, it := range items {
			if err := s.productRepo.AddStockWithTx(ctx, tx, it.ProductID, o.ShopID, it.Quantity); err != nil {
				return err
			}
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status":        5,
			"cancel_reason": reason,
			"cancel_by":     cancelBy,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   0,
			ToStatus:     5,
			OperatorID:   nil,
			OperatorRole: &role,
			Remark:       reason,
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

func (s *OrderScheduleService) autoCompleteArrivedOrder(ctx context.Context, orderID uint64) error {
	role := systemOrderOperatorRole
	now := time.Now()

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByID(ctx, tx, orderID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		if o.Status != 3 {
			return nil
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status":       4,
			"completed_at": now,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   3,
			ToStatus:     4,
			OperatorID:   nil,
			OperatorRole: &role,
			Remark:       "",
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}
