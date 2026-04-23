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

const (
	sellerNotificationTypeOrder   = "order"
	sellerNotificationTypeProduct = "product"
	sellerNotificationTypeSystem  = "system"
)

var ErrSellerNotificationNotFound = errors.New("notification not found")

type SellerNotificationService struct {
	notificationRepo *repository.NotificationRepository
	orderRepo        *repository.OrderRepository
	productRepo      *repository.ProductRepository
	shopRepo         *repository.ShopRepository
}

func NewSellerNotificationService(
	notificationRepo *repository.NotificationRepository,
	orderRepo *repository.OrderRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
) *SellerNotificationService {
	return &SellerNotificationService{
		notificationRepo: notificationRepo,
		orderRepo:        orderRepo,
		productRepo:      productRepo,
		shopRepo:         shopRepo,
	}
}

type SellerNotificationListQuery struct {
	Type     string
	Page     int
	PageSize int
}

type SellerNotificationItem struct {
	ID        uint64  `json:"id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Content   string  `json:"content"`
	BizType   string  `json:"biz_type"`
	BizID     *uint64 `json:"biz_id"`
	IsRead    int     `json:"is_read"`
	CreatedAt string  `json:"created_at"`
}

type SellerNotificationListData struct {
	List       []SellerNotificationItem `json:"list"`
	Pagination response.Pagination      `json:"pagination"`
}

type SellerNotificationUnreadCount struct {
	Count int64 `json:"count"`
}

type SellerNotificationOverview struct {
	UnreadCount int64  `json:"unread_count"`
	LatestTitle string `json:"latest_title"`
}

type generatedSellerNotification struct {
	Type    string
	Title   string
	Content string
	BizType string
	BizID   *uint64
}

func (s *SellerNotificationService) List(
	ctx context.Context,
	userID int64,
	query SellerNotificationListQuery,
) (*SellerNotificationListData, error) {
	if err := s.Sync(ctx, userID); err != nil {
		return nil, err
	}

	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	list, total, err := s.notificationRepo.ListByUser(ctx, uint64(userID), query.Type, page, pageSize)
	if err != nil {
		return nil, err
	}

	items := make([]SellerNotificationItem, 0, len(list))
	for _, item := range list {
		items = append(items, mapSellerNotificationItem(item))
	}

	return &SellerNotificationListData{
		List:       items,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	}, nil
}

func (s *SellerNotificationService) Sync(ctx context.Context, userID int64) error {
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSellerShopNotFound
		}
		return err
	}

	fulfillment, err := s.orderRepo.AggregateSellerFulfillment(ctx, uint64(userID))
	if err != nil {
		return err
	}
	productStats, err := s.productRepo.AggregateSellerDashboardStats(ctx, shop.ID)
	if err != nil {
		return err
	}
	lowStockProducts, err := s.productRepo.ListSellerLowStockByShop(ctx, shop.ID, 10, 5)
	if err != nil {
		return err
	}

	expected := make(map[string]generatedSellerNotification)
	if fulfillment.PendingOrders > 0 {
		shopID := shop.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeOrder,
			Title:   "有待确认订单需要处理",
			Content: fmt.Sprintf("当前有 %d 笔待确认订单，请尽快处理避免超时取消。", fulfillment.PendingOrders),
			BizType: "seller_pending_orders",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	if fulfillment.ArrivedOrders > 0 {
		shopID := shop.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeOrder,
			Title:   "有订单已送达待完成",
			Content: fmt.Sprintf("当前有 %d 笔订单已送达，建议跟进买家确认收货。", fulfillment.ArrivedOrders),
			BizType: "seller_arrived_orders",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	if productStats.PendingAuditCount > 0 {
		shopID := shop.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeProduct,
			Title:   "商品审核中",
			Content: fmt.Sprintf("当前有 %d 件商品处于审核中，审核通过后会自动进入在售列表。", productStats.PendingAuditCount),
			BizType: "seller_pending_products",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	for _, product := range lowStockProducts {
		productID := product.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeProduct,
			Title:   "低库存提醒",
			Content: fmt.Sprintf("商品「%s」库存仅剩 %d%s，建议尽快补货或调整售价。", product.Name, product.Stock, product.Unit),
			BizType: "seller_low_stock",
			BizID:   &productID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	if shop.AuditStatus == 0 {
		shopID := shop.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeSystem,
			Title:   "店铺资料审核中",
			Content: "店铺资料正在审核，审核通过后即可稳定展示给买家。",
			BizType: "seller_shop_audit_pending",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	if shop.AuditStatus == 2 {
		shopID := shop.ID
		content := "店铺审核未通过，请前往店铺设置修正后重新提交。"
		if shop.AuditRemark != "" {
			content = fmt.Sprintf("店铺审核未通过：%s", shop.AuditRemark)
		}
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeSystem,
			Title:   "店铺审核未通过",
			Content: content,
			BizType: "seller_shop_audit_rejected",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}
	if shop.Status == 0 {
		shopID := shop.ID
		item := generatedSellerNotification{
			Type:    sellerNotificationTypeSystem,
			Title:   "店铺当前已关店",
			Content: "当前处于关店状态，买家暂时无法下单，可在店铺设置中重新开启营业。",
			BizType: "seller_shop_closed",
			BizID:   &shopID,
		}
		expected[s.notificationKey(item.BizType, item.BizID)] = item
	}

	existing, err := s.notificationRepo.ListGeneratedByUser(ctx, uint64(userID))
	if err != nil {
		return err
	}
	existingMap := make(map[string]model.Notification, len(existing))
	for _, item := range existing {
		existingMap[s.notificationKey(item.BizType, item.BizID)] = item
	}

	now := time.Now()
	for key, item := range expected {
		if current, ok := existingMap[key]; ok {
			if current.Type == item.Type && current.Title == item.Title && current.Content == item.Content {
				delete(existingMap, key)
				continue
			}
			if err := s.notificationRepo.UpdateByID(ctx, current.ID, map[string]interface{}{
				"type":       item.Type,
				"title":      item.Title,
				"content":    item.Content,
				"is_read":    0,
				"created_at": now,
			}); err != nil {
				return err
			}
			delete(existingMap, key)
			continue
		}
		row := model.Notification{
			UserID:    uint64(userID),
			Type:      item.Type,
			Title:     item.Title,
			Content:   item.Content,
			BizType:   item.BizType,
			BizID:     item.BizID,
			IsRead:    0,
			CreatedAt: now,
		}
		if err := s.notificationRepo.Create(ctx, &row); err != nil {
			return err
		}
	}

	staleIDs := make([]uint64, 0, len(existingMap))
	for _, item := range existingMap {
		staleIDs = append(staleIDs, item.ID)
	}
	return s.notificationRepo.DeleteByIDs(ctx, staleIDs)
}

func (s *SellerNotificationService) GetOverview(ctx context.Context, userID int64) (*SellerNotificationOverview, error) {
	if err := s.Sync(ctx, userID); err != nil {
		return nil, err
	}
	unreadCount, err := s.notificationRepo.CountUnreadByUser(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	latest, err := s.notificationRepo.FindLatestByUser(ctx, uint64(userID))
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	overview := &SellerNotificationOverview{
		UnreadCount: unreadCount,
	}
	if latest != nil {
		overview.LatestTitle = latest.Title
	}
	return overview, nil
}

func (s *SellerNotificationService) UnreadCount(ctx context.Context, userID int64) (*SellerNotificationUnreadCount, error) {
	overview, err := s.GetOverview(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &SellerNotificationUnreadCount{Count: overview.UnreadCount}, nil
}

func (s *SellerNotificationService) MarkRead(ctx context.Context, userID int64, notificationID uint64) error {
	rows, err := s.notificationRepo.MarkReadByIDAndUser(ctx, notificationID, uint64(userID))
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrSellerNotificationNotFound
	}
	return nil
}

func (s *SellerNotificationService) MarkAllRead(ctx context.Context, userID int64) error {
	return s.notificationRepo.MarkAllReadByUser(ctx, uint64(userID))
}

func (s *SellerNotificationService) notificationKey(bizType string, bizID *uint64) string {
	if bizID == nil {
		return bizType
	}
	return fmt.Sprintf("%s:%d", bizType, *bizID)
}

func mapSellerNotificationItem(item model.Notification) SellerNotificationItem {
	return SellerNotificationItem{
		ID:        item.ID,
		Type:      item.Type,
		Title:     item.Title,
		Content:   item.Content,
		BizType:   item.BizType,
		BizID:     item.BizID,
		IsRead:    item.IsRead,
		CreatedAt: item.CreatedAt.Format(time.RFC3339),
	}
}
