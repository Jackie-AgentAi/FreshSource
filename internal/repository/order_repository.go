package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"freshmart/internal/model"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// AdminOrderListQuery 管理端订单列表筛选（不含分页语义外的字段）。
type AdminOrderListQuery struct {
	Status           *int
	ShopID           *uint64
	BuyerID          *uint64
	SettlementStatus *int
	CreatedFrom      *time.Time
	CreatedTo        *time.Time
	Page             int
	PageSize         int
}

func (r *OrderRepository) buildAdminOrderQuery(ctx context.Context, q AdminOrderListQuery) *gorm.DB {
	qb := r.db.WithContext(ctx).Model(&model.Order{}).Where("deleted_at IS NULL")
	if q.Status != nil {
		qb = qb.Where("status = ?", *q.Status)
	}
	if q.ShopID != nil {
		qb = qb.Where("shop_id = ?", *q.ShopID)
	}
	if q.BuyerID != nil {
		qb = qb.Where("buyer_id = ?", *q.BuyerID)
	}
	if q.SettlementStatus != nil {
		qb = qb.Where("settlement_status = ?", *q.SettlementStatus)
	}
	if q.CreatedFrom != nil {
		qb = qb.Where("created_at >= ?", *q.CreatedFrom)
	}
	if q.CreatedTo != nil {
		qb = qb.Where("created_at <= ?", *q.CreatedTo)
	}
	return qb
}

func (r *OrderRepository) ListForAdmin(
	ctx context.Context,
	q AdminOrderListQuery,
) ([]model.Order, int64, error) {
	qb := r.buildAdminOrderQuery(ctx, q)
	var total int64
	if err := qb.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	page := q.Page
	if page <= 0 {
		page = 1
	}
	ps := q.PageSize
	if ps <= 0 {
		ps = 20
	}
	if ps > 100 {
		ps = 100
	}
	var list []model.Order
	err := r.buildAdminOrderQuery(ctx, q).Order("id DESC").Offset((page - 1) * ps).Limit(ps).Find(&list).Error
	return list, total, err
}

// ListForAdminLimit 导出等场景：与 ListForAdmin 相同筛选条件，按 id 倒序最多返回 limit 条（上限 5000）。
func (r *OrderRepository) ListForAdminLimit(ctx context.Context, q AdminOrderListQuery, limit int) ([]model.Order, error) {
	if limit <= 0 {
		limit = 5000
	}
	if limit > 5000 {
		limit = 5000
	}
	var list []model.Order
	err := r.buildAdminOrderQuery(ctx, q).Order("id DESC").Limit(limit).Find(&list).Error
	return list, err
}

func (r *OrderRepository) FindByID(ctx context.Context, id uint64) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) UpdateSettlementStatusByID(ctx context.Context, id uint64, settlementStatus int) error {
	return r.db.WithContext(ctx).
		Model(&model.Order{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("settlement_status", settlementStatus).Error
}

func (r *OrderRepository) CreateOrderWithTx(ctx context.Context, tx *gorm.DB, order *model.Order) error {
	return tx.WithContext(ctx).Create(order).Error
}

func (r *OrderRepository) CreateOrderItemWithTx(ctx context.Context, tx *gorm.DB, item *model.OrderItem) error {
	return tx.WithContext(ctx).Create(item).Error
}

func (r *OrderRepository) CreateOrderLogWithTx(ctx context.Context, tx *gorm.DB, log *model.OrderLog) error {
	return tx.WithContext(ctx).Create(log).Error
}

func (r *OrderRepository) ListLogsByOrderID(ctx context.Context, orderID uint64) ([]model.OrderLog, error) {
	var logs []model.OrderLog
	err := r.db.WithContext(ctx).
		Where("order_id = ?", orderID).
		Order("id ASC").
		Find(&logs).Error
	return logs, err
}

func (r *OrderRepository) ListSellerOrders(
	ctx context.Context,
	sellerID uint64,
	status *int,
	page int,
	pageSize int,
) ([]model.Order, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Order{}).
		Where("seller_id = ? AND deleted_at IS NULL", sellerID)
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []model.Order
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *OrderRepository) ListBuyerOrders(
	ctx context.Context,
	buyerID uint64,
	status *int,
	page int,
	pageSize int,
) ([]model.Order, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Order{}).
		Where("buyer_id = ? AND deleted_at IS NULL", buyerID)
	if status != nil {
		q = q.Where("status = ?", *status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []model.Order
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *OrderRepository) FindByIDAndBuyerID(ctx context.Context, id uint64, buyerID uint64) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Where("id = ? AND buyer_id = ? AND deleted_at IS NULL", id, buyerID).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) FindByIDAndSellerID(ctx context.Context, id uint64, sellerID uint64) (*model.Order, error) {
	var o model.Order
	err := r.db.WithContext(ctx).
		Where("id = ? AND seller_id = ? AND deleted_at IS NULL", id, sellerID).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) ListItemsByOrderID(ctx context.Context, orderID uint64) ([]model.OrderItem, error) {
	var items []model.OrderItem
	err := r.db.WithContext(ctx).
		Where("order_id = ?", orderID).
		Order("id ASC").
		Find(&items).Error
	return items, err
}

func (r *OrderRepository) LockOrderByID(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
) (*model.Order, error) {
	var o model.Order
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// ListPendingOrderIDsForAutoCancel 待确认且创建时间不晚于 cutoff 的订单（含 cutoff 时刻，便于「满 N 分钟」验收）。
func (r *OrderRepository) ListPendingOrderIDsForAutoCancel(
	ctx context.Context,
	cutoff time.Time,
	limit int,
) ([]uint64, error) {
	if limit <= 0 {
		return nil, nil
	}
	var ids []uint64
	err := r.db.WithContext(ctx).Model(&model.Order{}).
		Select("id").
		Where("status = ? AND deleted_at IS NULL AND created_at <= ?", 0, cutoff).
		Order("id ASC").
		Limit(limit).
		Pluck("id", &ids).Error
	return ids, err
}

// ListArrivedOrderIDsForAutoComplete 已送达且送达时间不晚于 cutoff 的订单。
func (r *OrderRepository) ListArrivedOrderIDsForAutoComplete(
	ctx context.Context,
	cutoff time.Time,
	limit int,
) ([]uint64, error) {
	if limit <= 0 {
		return nil, nil
	}
	var ids []uint64
	err := r.db.WithContext(ctx).Model(&model.Order{}).
		Select("id").
		Where("status = ? AND deleted_at IS NULL AND delivered_at IS NOT NULL AND delivered_at <= ?", 3, cutoff).
		Order("id ASC").
		Limit(limit).
		Pluck("id", &ids).Error
	return ids, err
}

func (r *OrderRepository) LockOrderByIDAndBuyer(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	buyerID uint64,
) (*model.Order, error) {
	var o model.Order
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND buyer_id = ? AND deleted_at IS NULL", id, buyerID).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) LockOrderByIDAndSeller(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	sellerID uint64,
) (*model.Order, error) {
	var o model.Order
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND seller_id = ? AND deleted_at IS NULL", id, sellerID).
		First(&o).Error
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OrderRepository) UpdateFieldsWithTx(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	updates map[string]interface{},
) error {
	return tx.WithContext(ctx).
		Model(&model.Order{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error
}

func (r *OrderRepository) SoftDeleteByIDAndBuyerWithTx(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	buyerID uint64,
) (int64, error) {
	res := tx.WithContext(ctx).
		Model(&model.Order{}).
		Where("id = ? AND buyer_id = ? AND deleted_at IS NULL AND status IN (4, 5)", id, buyerID).
		Update("deleted_at", gorm.Expr("NOW()"))
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

type OrderItemCountRow struct {
	OrderID uint64 `gorm:"column:order_id"`
	C       int64  `gorm:"column:c"`
}

func (r *OrderRepository) CountItemsByOrderIDs(ctx context.Context, orderIDs []uint64) (map[uint64]int64, error) {
	if len(orderIDs) == 0 {
		return map[uint64]int64{}, nil
	}
	var rows []OrderItemCountRow
	err := r.db.WithContext(ctx).
		Model(&model.OrderItem{}).
		Select("order_id, COUNT(*) AS c").
		Where("order_id IN ?", orderIDs).
		Group("order_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint64]int64, len(rows))
	for _, row := range rows {
		out[row.OrderID] = row.C
	}
	return out, nil
}
