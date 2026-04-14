package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/pkg/response"
	"freshmart/internal/repository"
)

const adminOrderExportMaxRows = 5000

const adminOrderOperatorRole int8 = 3

var (
	ErrAdminOrderNotFound     = errors.New("order not found")
	ErrAdminSettlementInvalid = errors.New("invalid settlement_status")
	ErrAdminOrderBadStatus    = errors.New("order status not allowed")
)

type AdminOrderService struct {
	txManager   *repository.TxManager
	orderRepo   *repository.OrderRepository
	shopRepo    *repository.ShopRepository
	productRepo *repository.ProductRepository
}

func NewAdminOrderService(
	txManager *repository.TxManager,
	orderRepo *repository.OrderRepository,
	shopRepo *repository.ShopRepository,
	productRepo *repository.ProductRepository,
) *AdminOrderService {
	return &AdminOrderService{
		txManager:   txManager,
		orderRepo:   orderRepo,
		shopRepo:    shopRepo,
		productRepo: productRepo,
	}
}

type AdminOrderListParams struct {
	Status           *int
	ShopID           *uint64
	BuyerID          *uint64
	SettlementStatus *int
	CreatedFrom      *time.Time
	CreatedTo        *time.Time
	Page             int
	PageSize         int
}

type AdminOrderListItem struct {
	ID               uint64 `json:"id"`
	OrderNo          string `json:"order_no"`
	ShopID           uint64 `json:"shop_id"`
	ShopName         string `json:"shop_name"`
	BuyerID          uint64 `json:"buyer_id"`
	Status           int    `json:"status"`
	SettlementStatus int    `json:"settlement_status"`
	TotalAmount      string `json:"total_amount"`
	FreightAmount    string `json:"freight_amount"`
	PayAmount        string `json:"pay_amount"`
	ItemCount        int64  `json:"item_count"`
	ReceiverName     string `json:"receiver_name"`
	ReceiverPhone    string `json:"receiver_phone"`
	CreatedAt        string `json:"created_at"`
}

type AdminOrderListData struct {
	List       []AdminOrderListItem `json:"list"`
	Pagination response.Pagination  `json:"pagination"`
}

type AdminOrderDetail struct {
	ID               uint64               `json:"id"`
	OrderNo          string               `json:"order_no"`
	ShopID           uint64               `json:"shop_id"`
	ShopName         string               `json:"shop_name"`
	SellerID         uint64               `json:"seller_id"`
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
	CancelBy         *int                 `json:"cancel_by"`
	CreatedAt        string               `json:"created_at"`
	UpdatedAt        string               `json:"updated_at"`
	ConfirmedAt      *string              `json:"confirmed_at"`
	DeliveredAt      *string              `json:"delivered_at"`
	CompletedAt      *string              `json:"completed_at"`
	Items            []BuyerOrderItemView `json:"items"`
}

func (s *AdminOrderService) toRepoQuery(p AdminOrderListParams) repository.AdminOrderListQuery {
	return repository.AdminOrderListQuery{
		Status:           p.Status,
		ShopID:           p.ShopID,
		BuyerID:          p.BuyerID,
		SettlementStatus: p.SettlementStatus,
		CreatedFrom:      p.CreatedFrom,
		CreatedTo:        p.CreatedTo,
		Page:             p.Page,
		PageSize:         p.PageSize,
	}
}

func (s *AdminOrderService) List(ctx context.Context, p AdminOrderListParams) (*AdminOrderListData, error) {
	page := p.Page
	if page <= 0 {
		page = 1
	}
	pageSize := clampOrderPageSize(p.PageSize)
	repoQ := s.toRepoQuery(p)
	repoQ.Page = page
	repoQ.PageSize = pageSize

	list, total, err := s.orderRepo.ListForAdmin(ctx, repoQ)
	if err != nil {
		return nil, err
	}
	shopIDs := make([]uint64, 0, len(list))
	seen := map[uint64]struct{}{}
	for _, o := range list {
		if _, ok := seen[o.ShopID]; !ok {
			seen[o.ShopID] = struct{}{}
			shopIDs = append(shopIDs, o.ShopID)
		}
	}
	shopNames, err := s.shopRepo.FindShopNamesByIDs(ctx, shopIDs)
	if err != nil {
		return nil, err
	}
	orderIDs := make([]uint64, 0, len(list))
	for _, o := range list {
		orderIDs = append(orderIDs, o.ID)
	}
	countMap, err := s.orderRepo.CountItemsByOrderIDs(ctx, orderIDs)
	if err != nil {
		return nil, err
	}
	out := make([]AdminOrderListItem, 0, len(list))
	for _, o := range list {
		sn := shopNames[o.ShopID]
		out = append(out, AdminOrderListItem{
			ID:               o.ID,
			OrderNo:          o.OrderNo,
			ShopID:           o.ShopID,
			ShopName:         sn,
			BuyerID:          o.BuyerID,
			Status:           o.Status,
			SettlementStatus: o.SettlementStatus,
			TotalAmount:      fmt.Sprintf("%.2f", o.TotalAmount),
			FreightAmount:    fmt.Sprintf("%.2f", o.FreightAmount),
			PayAmount:        fmt.Sprintf("%.2f", o.PayAmount),
			ItemCount:        countMap[o.ID],
			ReceiverName:     o.ReceiverName,
			ReceiverPhone:    o.ReceiverPhone,
			CreatedAt:        o.CreatedAt.Format(time.RFC3339),
		})
	}
	pg := response.BuildPagination(page, pageSize, int(total))
	return &AdminOrderListData{List: out, Pagination: pg}, nil
}

func (s *AdminOrderService) Detail(ctx context.Context, orderID uint64) (*AdminOrderDetail, error) {
	o, err := s.orderRepo.FindByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminOrderNotFound
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
	return &AdminOrderDetail{
		ID:               o.ID,
		OrderNo:          o.OrderNo,
		ShopID:           o.ShopID,
		ShopName:         shopName,
		SellerID:         o.SellerID,
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
		CancelBy:         o.CancelBy,
		CreatedAt:        o.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        o.UpdatedAt.Format(time.RFC3339),
		ConfirmedAt:      formatTimePtr(o.ConfirmedAt),
		DeliveredAt:      formatTimePtr(o.DeliveredAt),
		CompletedAt:      formatTimePtr(o.CompletedAt),
		Items:            itemViews,
	}, nil
}

// UpdateSettlement 仅更新 settlement_status，不修改 orders.status，不写 order_logs。
func (s *AdminOrderService) UpdateSettlement(ctx context.Context, orderID uint64, settlementStatus int) error {
	if settlementStatus != 0 && settlementStatus != 1 {
		return ErrAdminSettlementInvalid
	}
	if _, err := s.orderRepo.FindByID(ctx, orderID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAdminOrderNotFound
		}
		return err
	}
	return s.orderRepo.UpdateSettlementStatusByID(ctx, orderID, settlementStatus)
}

// UpdateReturnStatus 管理端退货流转：仅允许 4→6、6→7（加回库存）、6→4；写 order_logs，operator_role=3。
func (s *AdminOrderService) UpdateReturnStatus(ctx context.Context, operatorUserID int64, orderID uint64, targetStatus int, remark string) error {
	remark = strings.TrimSpace(remark)
	if len(remark) > 255 {
		remark = remark[:255]
	}
	opID := uint64(operatorUserID)
	role := adminOrderOperatorRole

	return s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		o, err := s.orderRepo.LockOrderByID(ctx, tx, orderID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAdminOrderNotFound
			}
			return err
		}
		from := o.Status
		var to int
		switch {
		case from == 4 && targetStatus == 6:
			to = 6
		case from == 6 && targetStatus == 7:
			to = 7
		case from == 6 && targetStatus == 4:
			to = 4
		default:
			return ErrAdminOrderBadStatus
		}
		if to == 7 {
			var items []model.OrderItem
			if err := tx.WithContext(ctx).Where("order_id = ?", orderID).Order("id ASC").Find(&items).Error; err != nil {
				return err
			}
			for _, it := range items {
				if err := s.productRepo.AddStockWithTx(ctx, tx, it.ProductID, o.ShopID, it.Quantity); err != nil {
					return err
				}
			}
		}
		if err := s.orderRepo.UpdateFieldsWithTx(ctx, tx, orderID, map[string]interface{}{
			"status": to,
		}); err != nil {
			return err
		}
		logRow := model.OrderLog{
			OrderID:      orderID,
			FromStatus:   int8(from),
			ToStatus:     int8(to),
			OperatorID:   &opID,
			OperatorRole: &role,
			Remark:       remark,
		}
		return s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow)
	})
}

// AdminOrderLogView 管理端订单日志（snake_case JSON）。
type AdminOrderLogView struct {
	ID           uint64  `json:"id"`
	OrderID      uint64  `json:"order_id"`
	FromStatus   int8    `json:"from_status"`
	ToStatus     int8    `json:"to_status"`
	OperatorID   *uint64 `json:"operator_id"`
	OperatorRole *int8   `json:"operator_role"`
	Remark       string  `json:"remark"`
	CreatedAt    string  `json:"created_at"`
}

// ListOrderLogs 返回订单状态流转日志（按 id 升序）。
func (s *AdminOrderService) ListOrderLogs(ctx context.Context, orderID uint64) ([]AdminOrderLogView, error) {
	if _, err := s.orderRepo.FindByID(ctx, orderID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAdminOrderNotFound
		}
		return nil, err
	}
	logs, err := s.orderRepo.ListLogsByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	out := make([]AdminOrderLogView, 0, len(logs))
	for _, lg := range logs {
		out = append(out, AdminOrderLogView{
			ID:           lg.ID,
			OrderID:      lg.OrderID,
			FromStatus:   lg.FromStatus,
			ToStatus:     lg.ToStatus,
			OperatorID:   lg.OperatorID,
			OperatorRole: lg.OperatorRole,
			Remark:       lg.Remark,
			CreatedAt:    lg.CreatedAt.Format(time.RFC3339),
		})
	}
	return out, nil
}

// ExportOrdersCSV 与列表相同筛选条件，最多导出 adminOrderExportMaxRows 条，UTF-8 BOM + CSV。
func (s *AdminOrderService) ExportOrdersCSV(ctx context.Context, p AdminOrderListParams) ([]byte, string, error) {
	repoQ := s.toRepoQuery(p)
	list, err := s.orderRepo.ListForAdminLimit(ctx, repoQ, adminOrderExportMaxRows)
	if err != nil {
		return nil, "", err
	}
	shopIDs := make([]uint64, 0, len(list))
	seen := map[uint64]struct{}{}
	for _, o := range list {
		if _, ok := seen[o.ShopID]; !ok {
			seen[o.ShopID] = struct{}{}
			shopIDs = append(shopIDs, o.ShopID)
		}
	}
	shopNames, err := s.shopRepo.FindShopNamesByIDs(ctx, shopIDs)
	if err != nil {
		return nil, "", err
	}
	var buf bytes.Buffer
	_, _ = buf.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(&buf)
	header := []string{
		"order_id", "order_no", "shop_id", "shop_name", "buyer_id", "seller_id", "status", "settlement_status",
		"total_amount", "freight_amount", "discount_amount", "pay_amount",
		"receiver_name", "receiver_phone", "receiver_address",
		"created_at",
	}
	if err := w.Write(header); err != nil {
		return nil, "", err
	}
	for _, o := range list {
		sn := shopNames[o.ShopID]
		row := []string{
			strconv.FormatUint(o.ID, 10),
			o.OrderNo,
			strconv.FormatUint(o.ShopID, 10),
			sn,
			strconv.FormatUint(o.BuyerID, 10),
			strconv.FormatUint(o.SellerID, 10),
			strconv.Itoa(o.Status),
			strconv.Itoa(o.SettlementStatus),
			fmt.Sprintf("%.2f", o.TotalAmount),
			fmt.Sprintf("%.2f", o.FreightAmount),
			fmt.Sprintf("%.2f", o.DiscountAmount),
			fmt.Sprintf("%.2f", o.PayAmount),
			o.ReceiverName,
			o.ReceiverPhone,
			o.ReceiverAddress,
			o.CreatedAt.Format(time.RFC3339),
		}
		if err := w.Write(row); err != nil {
			return nil, "", err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return nil, "", err
	}
	filename := fmt.Sprintf("orders_export_%s.csv", time.Now().UTC().Format("20060102150405"))
	return buf.Bytes(), filename, nil
}
