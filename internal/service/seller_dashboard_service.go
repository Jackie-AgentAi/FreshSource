package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/repository"
)

type SellerDashboardService struct {
	orderRepo           *repository.OrderRepository
	productRepo         *repository.ProductRepository
	shopRepo            *repository.ShopRepository
	notificationService *SellerNotificationService
}

func NewSellerDashboardService(
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
	notificationService *SellerNotificationService,
) *SellerDashboardService {
	return &SellerDashboardService{
		orderRepo:           orderRepo,
		productRepo:         productRepo,
		shopRepo:            shopRepo,
		notificationService: notificationService,
	}
}

type SellerDashboardSummary struct {
	Revenue           string `json:"revenue"`
	OrderCount        int64  `json:"order_count"`
	AverageOrderValue string `json:"average_order_value"`
	RevenueGrowthRate string `json:"revenue_growth_rate"`
	OrderGrowthRate   string `json:"order_growth_rate"`
}

type SellerDashboardFulfillment struct {
	PendingOrders    int64 `json:"pending_orders"`
	DeliveringOrders int64 `json:"delivering_orders"`
	ArrivedOrders    int64 `json:"arrived_orders"`
	CompletedOrders  int64 `json:"completed_orders"`
	CancelledOrders  int64 `json:"cancelled_orders"`
	TotalOrders      int64 `json:"total_orders"`
}

type SellerDashboardProduct struct {
	OnSaleCount       int64 `json:"on_sale_count"`
	PendingAuditCount int64 `json:"pending_audit_count"`
	WarehouseCount    int64 `json:"warehouse_count"`
	LowStockCount     int64 `json:"low_stock_count"`
}

type SellerDashboardInventoryAlert struct {
	ProductID uint64 `json:"product_id"`
	Name      string `json:"name"`
	Price     string `json:"price"`
	Unit      string `json:"unit"`
	Stock     int    `json:"stock"`
}

type SellerDashboardData struct {
	Range           string                          `json:"range"`
	Summary         SellerDashboardSummary          `json:"summary"`
	Fulfillment     SellerDashboardFulfillment      `json:"fulfillment"`
	Product         SellerDashboardProduct          `json:"product"`
	InventoryAlerts []SellerDashboardInventoryAlert `json:"inventory_alerts"`
	MessageOverview SellerNotificationOverview      `json:"message_overview"`
}

func (s *SellerDashboardService) Get(ctx context.Context, userID int64, rangeKey string) (*SellerDashboardData, error) {
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSellerShopNotFound
		}
		return nil, err
	}

	now := time.Now()
	currentStart, previousStart, previousEnd, normalizedRange := dashboardRangeBounds(now, rangeKey)

	currentSummary, err := s.orderRepo.AggregateSellerRangeSummary(ctx, uint64(userID), currentStart, now)
	if err != nil {
		return nil, err
	}
	previousSummary, err := s.orderRepo.AggregateSellerRangeSummary(ctx, uint64(userID), previousStart, previousEnd)
	if err != nil {
		return nil, err
	}
	fulfillment, err := s.orderRepo.AggregateSellerFulfillment(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	productStats, err := s.productRepo.AggregateSellerDashboardStats(ctx, shop.ID)
	if err != nil {
		return nil, err
	}
	lowStockProducts, err := s.productRepo.ListSellerLowStockByShop(ctx, shop.ID, 10, 5)
	if err != nil {
		return nil, err
	}
	notificationOverview, err := s.notificationService.GetOverview(ctx, userID)
	if err != nil {
		return nil, err
	}

	averageOrderValue := 0.0
	if currentSummary.OrderCount > 0 {
		averageOrderValue = currentSummary.Revenue / float64(currentSummary.OrderCount)
	}

	alerts := make([]SellerDashboardInventoryAlert, 0, len(lowStockProducts))
	for _, item := range lowStockProducts {
		alerts = append(alerts, SellerDashboardInventoryAlert{
			ProductID: item.ID,
			Name:      item.Name,
			Price:     formatMoney(item.Price),
			Unit:      item.Unit,
			Stock:     item.Stock,
		})
	}

	return &SellerDashboardData{
		Range: normalizedRange,
		Summary: SellerDashboardSummary{
			Revenue:           formatMoney(currentSummary.Revenue),
			OrderCount:        currentSummary.OrderCount,
			AverageOrderValue: formatMoney(averageOrderValue),
			RevenueGrowthRate: formatRate(currentSummary.Revenue, previousSummary.Revenue),
			OrderGrowthRate:   formatRate(float64(currentSummary.OrderCount), float64(previousSummary.OrderCount)),
		},
		Fulfillment: SellerDashboardFulfillment{
			PendingOrders:    fulfillment.PendingOrders,
			DeliveringOrders: fulfillment.DeliveringOrders,
			ArrivedOrders:    fulfillment.ArrivedOrders,
			CompletedOrders:  fulfillment.CompletedOrders,
			CancelledOrders:  fulfillment.CancelledOrders,
			TotalOrders:      fulfillment.TotalOrders,
		},
		Product: SellerDashboardProduct{
			OnSaleCount:       productStats.OnSaleCount,
			PendingAuditCount: productStats.PendingAuditCount,
			WarehouseCount:    productStats.WarehouseCount,
			LowStockCount:     productStats.LowStockCount,
		},
		InventoryAlerts: alerts,
		MessageOverview: *notificationOverview,
	}, nil
}

func dashboardRangeBounds(now time.Time, rangeKey string) (time.Time, time.Time, time.Time, string) {
	switch rangeKey {
	case "week":
		currentStart := now.AddDate(0, 0, -7)
		previousEnd := currentStart
		previousStart := previousEnd.AddDate(0, 0, -7)
		return currentStart, previousStart, previousEnd, "week"
	case "month":
		currentStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		previousEnd := currentStart
		previousStart := currentStart.AddDate(0, -1, 0)
		return currentStart, previousStart, previousEnd, "month"
	default:
		currentStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		previousEnd := currentStart
		previousStart := previousEnd.Add(-24 * time.Hour)
		return currentStart, previousStart, previousEnd, "day"
	}
}

func formatMoney(value float64) string {
	return fmt.Sprintf("%.2f", value)
}

func formatRate(current float64, previous float64) string {
	if previous <= 0 {
		return "0.00"
	}
	return fmt.Sprintf("%.2f", ((current-previous)/previous)*100)
}
