package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/pkg/response"
	"freshmart/internal/repository"
)

var (
	ErrSellerOrderNotFound        = errors.New("order not found")
	ErrSellerOrderBadStatus       = errors.New("order status not allowed")
	ErrSellerRejectReasonRequired = errors.New("reject reason is required")
)

const (
	sellerCancelBySeller = 2
	sellerOrderRole      = int8(2)
)

type SellerOrderService struct {
	txManager   *repository.TxManager
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
}

func NewSellerOrderService(
	txManager *repository.TxManager,
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
) *SellerOrderService {
	return &SellerOrderService{
		txManager:   txManager,
		orderRepo:   orderRepo,
		productRepo: productRepo,
	}
}

type SellerOrderListQuery struct {
	Status   *int
	Page     int
	PageSize int
}

type SellerOrderListItem struct {
	ID              uint64 `json:"id"`
	OrderNo         string `json:"order_no"`
	BuyerID         uint64 `json:"buyer_id"`
	Status          int    `json:"status"`
	TotalAmount     string `json:"total_amount"`
	FreightAmount   string `json:"freight_amount"`
	PayAmount       string `json:"pay_amount"`
	ItemCount       int64  `json:"item_count"`
	ReceiverName    string `json:"receiver_name"`
	ReceiverPhone   string `json:"receiver_phone"`
	ReceiverAddress string `json:"receiver_address"`
	CreatedAt       string `json:"created_at"`
}

type SellerOrderListData struct {
	List       []SellerOrderListItem `json:"list"`
	Pagination response.Pagination   `json:"pagination"`
}

func (s *SellerOrderService) List(ctx context.Context, sellerUserID int64, q SellerOrderListQuery) (*SellerOrderListData, error) {
	page := q.Page
	if page <= 0 {
		page = 1
	}
	pageSize := clampOrderPageSize(q.PageSize)
	sellerID := uint64(sellerUserID)

	list, total, err := s.orderRepo.ListSellerOrders(ctx, sellerID, q.Status, page, pageSize)
	if err != nil {
		return nil, err
	}
	ids := make([]uint64, 0, len(list))
	for _, o := range list {
		ids = append(ids, o.ID)
	}
	countMap, err := s.orderRepo.CountItemsByOrderIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make([]SellerOrderListItem, 0, len(list))
	for _, o := range list {
		out = append(out, SellerOrderListItem{
			ID:              o.ID,
			OrderNo:         o.OrderNo,
			BuyerID:         o.BuyerID,
			Status:          o.Status,
			TotalAmount:     fmt.Sprintf("%.2f", o.TotalAmount),
			FreightAmount:   fmt.Sprintf("%.2f", o.FreightAmount),
			PayAmount:       fmt.Sprintf("%.2f", o.PayAmount),
			ItemCount:       countMap[o.ID],
			ReceiverName:    o.ReceiverName,
			ReceiverPhone:   o.ReceiverPhone,
			ReceiverAddress: o.ReceiverAddress,
			CreatedAt:       o.CreatedAt.Format(time.RFC3339),
		})
	}
	p := response.BuildPagination(page, pageSize, int(total))
	return &SellerOrderListData{List: out, Pagination: p}, nil
}

type SellerOrderDetail struct {
	ID               uint64               `json:"id"`
	OrderNo          string               `json:"order_no"`
	ShopID           uint64               `json:"shop_id"`
	BuyerID          uint64               `json:"buyer_id"`
	Status           int                  `json:"status"`
	SettlementStatus int                  `json:"settlement_status"`
	TotalAmount      string               `json:"total_amount"`
	FreightAmount    string               `json:"freight_amount"`
	DiscountAmount   string               `json:"discount_amount"`
	PayAmount        string               `json:"pay_amount"`
	ReceiverName     string               `json:"receiver_name"`
	ReceiverPhone    string               `json:"receiver_phone"`
	ReceiverAddress  string               `json:"receiver_address"`
	DeliveryType     int                  `json:"delivery_type"`
	BuyerRemark      string               `json:"buyer_remark"`
	SellerRemark     string               `json:"seller_remark"`
	CancelReason     string               `json:"cancel_reason"`
	CreatedAt        string               `json:"created_at"`
	UpdatedAt        string               `json:"updated_at"`
	ConfirmedAt      *string              `json:"confirmed_at"`
	DeliveredAt      *string              `json:"delivered_at"`
	CompletedAt      *string              `json:"completed_at"`
	Items            []BuyerOrderItemView `json:"items"`
}

func (s *SellerOrderService) Detail(ctx context.Context, sellerUserID int64, orderID uint64) (*SellerOrderDetail, error) {
	o, err := s.orderRepo.FindByIDAndSellerID(ctx, orderID, uint64(sellerUserID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSellerOrderNotFound
		}
		return nil, err
	}
	items, err := s.orderRepo.ListItemsByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	itemViews := make([]BuyerOrderItemView, 0, len(items))
	for _, it := range items {
		itemViews = append(itemViews, BuyerOrderItemView{
			ProductID:    it.ProductID,
			SKUID:        it.SKUID,
			ProductName:  it.ProductName,
			ProductImage: it.ProductImage,
			Unit:         it.Unit,
			Price:        fmt.Sprintf("%.2f", it.Price),
			Quantity:     fmt.Sprintf("%.2f", it.Quantity),
			Subtotal:     fmt.Sprintf("%.2f", it.Subtotal),
		})
	}
	return &SellerOrderDetail{
		ID:               o.ID,
		OrderNo:          o.OrderNo,
		ShopID:           o.ShopID,
		BuyerID:          o.BuyerID,
		Status:           o.Status,
		SettlementStatus: o.SettlementStatus,
		TotalAmount:      fmt.Sprintf("%.2f", o.TotalAmount),
		FreightAmount:    fmt.Sprintf("%.2f", o.FreightAmount),
		DiscountAmount:   fmt.Sprintf("%.2f", o.DiscountAmount),
		PayAmount:        fmt.Sprintf("%.2f", o.PayAmount),
		ReceiverName:     o.ReceiverName,
		ReceiverPhone:    o.ReceiverPhone,
		ReceiverAddress:  o.ReceiverAddress,
		DeliveryType:     o.DeliveryType,
		BuyerRemark:      o.BuyerRemark,
		SellerRemark:     o.SellerRemark,
		CancelReason:     o.CancelReason,
		CreatedAt:        o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        o.UpdatedAt.Format(time.RFC3339),
		ConfirmedAt:      formatTimePtr(o.ConfirmedAt),
		DeliveredAt:      formatTimePtr(o.DeliveredAt),
		CompletedAt:      formatTimePtr(o.CompletedAt),
		Items:            itemViews,
	}, nil
}

func (s *SellerOrderService) Confirm(ctx context.Context, sellerUserID int64, orderID uint64) error {
	sellerID := uint64(sellerUserID)
	opID := sellerID
	role := sellerOrderRole
	now := time.Now()

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndSeller(ctx, tx, orderID, sellerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSellerOrderNotFound
			}
			return err
		}
		if o.Status != 0 {
			return ErrSellerOrderBadStatus
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status":       1,
			"confirmed_at": now,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   0,
			ToStatus:     1,
			OperatorID:   &opID,
			OperatorRole: &role,
			Remark:       "",
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

type SellerRejectInput struct {
	Reason string `json:"reason"`
}

func (s *SellerOrderService) Reject(ctx context.Context, sellerUserID int64, orderID uint64, input SellerRejectInput) error {
	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return ErrSellerRejectReasonRequired
	}
	if len(reason) > 255 {
		reason = reason[:255]
	}
	sellerID := uint64(sellerUserID)
	opID := sellerID
	role := sellerOrderRole
	cancelBy := sellerCancelBySeller

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndSeller(ctx, tx, orderID, sellerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSellerOrderNotFound
			}
			return err
		}
		if o.Status != 0 {
			return ErrSellerOrderBadStatus
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
			OperatorID:   &opID,
			OperatorRole: &role,
			Remark:       reason,
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

func (s *SellerOrderService) Deliver(ctx context.Context, sellerUserID int64, orderID uint64) error {
	sellerID := uint64(sellerUserID)
	opID := sellerID
	role := sellerOrderRole

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndSeller(ctx, tx, orderID, sellerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSellerOrderNotFound
			}
			return err
		}
		if o.Status != 1 {
			return ErrSellerOrderBadStatus
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status": 2,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   1,
			ToStatus:     2,
			OperatorID:   &opID,
			OperatorRole: &role,
			Remark:       "",
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

func (s *SellerOrderService) Arrived(ctx context.Context, sellerUserID int64, orderID uint64) error {
	sellerID := uint64(sellerUserID)
	opID := sellerID
	role := sellerOrderRole
	now := time.Now()

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndSeller(ctx, tx, orderID, sellerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSellerOrderNotFound
			}
			return err
		}
		if o.Status != 2 {
			return ErrSellerOrderBadStatus
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status":       3,
			"delivered_at": now,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   2,
			ToStatus:     3,
			OperatorID:   &opID,
			OperatorRole: &role,
			Remark:       "",
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

type SellerRemarkInput struct {
	SellerRemark string `json:"seller_remark"`
}

func (s *SellerOrderService) UpdateRemark(ctx context.Context, sellerUserID int64, orderID uint64, input SellerRemarkInput) error {
	remark := input.SellerRemark
	if len(remark) > 255 {
		remark = remark[:255]
	}
	sellerID := uint64(sellerUserID)

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		if _, err := s.orderRepo.LockOrderByIDAndSeller(ctx, tx, orderID, sellerID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSellerOrderNotFound
			}
			return err
		}
		return s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"seller_remark": remark,
		})
	})
}
