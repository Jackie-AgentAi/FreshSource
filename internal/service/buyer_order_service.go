package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/pkg/response"
	"freshmart/internal/repository"
)

var (
	ErrBuyerOrderNotFound  = errors.New("order not found")
	ErrBuyerOrderBadStatus = errors.New("order status not allowed")
)

const (
	buyerCancelByBuyer = 1
	buyerOrderRole     = int8(1)
)

type BuyerOrderService struct {
	txManager   *repository.TxManager
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
	shopRepo    *repository.ShopRepository
	cartService *CartService
}

func NewBuyerOrderService(
	txManager *repository.TxManager,
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
	cartService *CartService,
) *BuyerOrderService {
	return &BuyerOrderService{
		txManager:   txManager,
		orderRepo:   orderRepo,
		productRepo: productRepo,
		shopRepo:    shopRepo,
		cartService: cartService,
	}
}

type BuyerOrderListQuery struct {
	Status   *int
	Page     int
	PageSize int
}

type BuyerOrderListItem struct {
	ID            uint64 `json:"id"`
	OrderNo       string `json:"order_no"`
	ShopID        uint64 `json:"shop_id"`
	ShopName      string `json:"shop_name"`
	Status        int    `json:"status"`
	TotalAmount   string `json:"total_amount"`
	FreightAmount string `json:"freight_amount"`
	PayAmount     string `json:"pay_amount"`
	ItemCount     int64  `json:"item_count"`
	CreatedAt     string `json:"created_at"`
}

type BuyerOrderListData struct {
	List       []BuyerOrderListItem `json:"list"`
	Pagination response.Pagination  `json:"pagination"`
}

func clampOrderPageSize(n int) int {
	if n <= 0 {
		return 20
	}
	if n > 100 {
		return 100
	}
	return n
}

func (s *BuyerOrderService) List(ctx context.Context, buyerUserID int64, q BuyerOrderListQuery) (*BuyerOrderListData, error) {
	page := q.Page
	if page <= 0 {
		page = 1
	}
	pageSize := clampOrderPageSize(q.PageSize)

	list, total, err := s.orderRepo.ListBuyerOrders(ctx, uint64(buyerUserID), q.Status, page, pageSize)
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
	out := make([]BuyerOrderListItem, 0, len(list))
	for _, o := range list {
		shopName, _ := s.shopRepo.FindShopNameByID(ctx, o.ShopID)
		out = append(out, BuyerOrderListItem{
			ID:            o.ID,
			OrderNo:       o.OrderNo,
			ShopID:        o.ShopID,
			ShopName:      shopName,
			Status:        o.Status,
			TotalAmount:   fmt.Sprintf("%.2f", o.TotalAmount),
			FreightAmount: fmt.Sprintf("%.2f", o.FreightAmount),
			PayAmount:     fmt.Sprintf("%.2f", o.PayAmount),
			ItemCount:     countMap[o.ID],
			CreatedAt:     o.CreatedAt.Format(time.RFC3339),
		})
	}
	p := response.BuildPagination(page, pageSize, int(total))
	return &BuyerOrderListData{List: out, Pagination: p}, nil
}

type BuyerOrderItemView struct {
	ProductID    uint64  `json:"product_id"`
	SKUID        *uint64 `json:"sku_id"`
	ProductName  string  `json:"product_name"`
	ProductImage string  `json:"product_image"`
	Unit         string  `json:"unit"`
	Price        string  `json:"price"`
	Quantity     string  `json:"quantity"`
	Subtotal     string  `json:"subtotal"`
}

type BuyerOrderDetail struct {
	ID                uint64               `json:"id"`
	OrderNo           string               `json:"order_no"`
	ShopID            uint64               `json:"shop_id"`
	ShopName          string               `json:"shop_name"`
	Status            int                  `json:"status"`
	SettlementStatus  int                  `json:"settlement_status"`
	TotalAmount       string               `json:"total_amount"`
	FreightAmount     string               `json:"freight_amount"`
	DiscountAmount    string               `json:"discount_amount"`
	PayAmount         string               `json:"pay_amount"`
	ReceiverName      string               `json:"receiver_name"`
	ReceiverPhone     string               `json:"receiver_phone"`
	ReceiverAddress   string               `json:"receiver_address"`
	DeliveryType      int                  `json:"delivery_type"`
	BuyerRemark       string               `json:"buyer_remark"`
	CancelReason      string               `json:"cancel_reason"`
	CreatedAt         string               `json:"created_at"`
	UpdatedAt         string               `json:"updated_at"`
	DeliveredAt       *string              `json:"delivered_at"`
	CompletedAt       *string              `json:"completed_at"`
	Items             []BuyerOrderItemView `json:"items"`
}

func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

func (s *BuyerOrderService) Detail(ctx context.Context, buyerUserID int64, orderID uint64) (*BuyerOrderDetail, error) {
	o, err := s.orderRepo.FindByIDAndBuyerID(ctx, orderID, uint64(buyerUserID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBuyerOrderNotFound
		}
		return nil, err
	}
	items, err := s.orderRepo.ListItemsByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	shopName, _ := s.shopRepo.FindShopNameByID(ctx, o.ShopID)
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
	return &BuyerOrderDetail{
		ID:               o.ID,
		OrderNo:          o.OrderNo,
		ShopID:           o.ShopID,
		ShopName:         shopName,
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
		CancelReason:     o.CancelReason,
		CreatedAt:        o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        o.UpdatedAt.Format(time.RFC3339),
		DeliveredAt:      formatTimePtr(o.DeliveredAt),
		CompletedAt:      formatTimePtr(o.CompletedAt),
		Items:            itemViews,
	}, nil
}

type BuyerCancelInput struct {
	CancelReason string `json:"cancel_reason"`
}

func (s *BuyerOrderService) Cancel(ctx context.Context, buyerUserID int64, orderID uint64, input BuyerCancelInput) error {
	reason := input.CancelReason
	if len(reason) > 255 {
		reason = reason[:255]
	}
	buyerID := uint64(buyerUserID)
	buyerPtr := buyerID
	role := buyerOrderRole
	cancelBy := buyerCancelByBuyer

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndBuyer(ctx, tx, orderID, buyerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrBuyerOrderNotFound
			}
			return err
		}
		if o.Status != 0 {
			return ErrBuyerOrderBadStatus
		}
		items, err := s.listOrderItemsWithTx(ctx, tx, orderID)
		if err != nil {
			return err
		}
		for _, it := range items {
			if err := s.productRepo.AddStockWithTx(ctx, tx, it.ProductID, o.ShopID, it.Quantity); err != nil {
				return err
			}
		}
		updates := map[string]interface{}{
			"status":        5,
			"cancel_reason": reason,
			"cancel_by":     cancelBy,
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, updates); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   0,
			ToStatus:     5,
			OperatorID:   &buyerPtr,
			OperatorRole: &role,
			Remark:       reason,
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

func (s *BuyerOrderService) listOrderItemsWithTx(ctx context.Context, tx *gorm.DB, orderID uint64) ([]model.OrderItem, error) {
	var items []model.OrderItem
	err := tx.WithContext(ctx).Where("order_id = ?", orderID).Order("id ASC").Find(&items).Error
	return items, err
}

func (s *BuyerOrderService) Receive(ctx context.Context, buyerUserID int64, orderID uint64) error {
	buyerID := uint64(buyerUserID)
	buyerPtr := buyerID
	role := buyerOrderRole
	now := time.Now()

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndBuyer(ctx, tx, orderID, buyerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrBuyerOrderNotFound
			}
			return err
		}
		if o.Status != 3 {
			return ErrBuyerOrderBadStatus
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status":        4,
			"completed_at":  now,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   3,
			ToStatus:     4,
			OperatorID:   &buyerPtr,
			OperatorRole: &role,
			Remark:       "",
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

func (s *BuyerOrderService) SoftDelete(ctx context.Context, buyerUserID int64, orderID uint64) error {
	buyerID := uint64(buyerUserID)
	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByIDAndBuyer(ctx, tx, orderID, buyerID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrBuyerOrderNotFound
			}
			return err
		}
		if o.Status != 4 && o.Status != 5 {
			return ErrBuyerOrderBadStatus
		}
		n, err := s.orderRepo.SoftDeleteByIDAndBuyerWithTx(ctx, tx, orderID, buyerID)
		if err != nil {
			return err
		}
		if n != 1 {
			return ErrBuyerOrderNotFound
		}
		return nil
	})
}

func (s *BuyerOrderService) Reorder(ctx context.Context, buyerUserID int64, orderID uint64) error {
	_, err := s.orderRepo.FindByIDAndBuyerID(ctx, orderID, uint64(buyerUserID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrBuyerOrderNotFound
		}
		return err
	}
	items, err := s.orderRepo.ListItemsByOrderID(ctx, orderID)
	if err != nil {
		return err
	}
	for _, it := range items {
		_, err := s.cartService.Add(ctx, buyerUserID, AddCartItemInput{
			ProductID: it.ProductID,
			SKUID:     it.SKUID,
			Quantity:  it.Quantity,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
