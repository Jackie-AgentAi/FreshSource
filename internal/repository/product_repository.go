package repository

import (
	"context"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"freshmart/internal/model"
)

type ProductRepository struct {
	db *gorm.DB
}

type SellerDashboardProductStats struct {
	OnSaleCount       int64
	PendingAuditCount int64
	WarehouseCount    int64
	LowStockCount     int64
}

type BuyerProductQuery struct {
	CategoryID *uint64
	ShopID     *uint64
	Keyword    string
	MinPrice   *float64
	MaxPrice   *float64
	SortBy     string
	Page       int
	PageSize   int
}

type AdminProductQuery struct {
	Status   *int
	ShopID   *uint64
	Keyword  string
	Page     int
	PageSize int
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) Create(ctx context.Context, product *model.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *ProductRepository) FindByID(ctx context.Context, id uint64) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindByIDAndShopID(ctx context.Context, id, shopID uint64) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", id, shopID).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) Update(ctx context.Context, id, shopID uint64, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", id, shopID).
		Updates(updates).Error
}

func (r *ProductRepository) SoftDelete(ctx context.Context, id, shopID uint64) error {
	return r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", id, shopID).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *ProductRepository) ListForAdmin(
	ctx context.Context,
	queryInput AdminProductQuery,
) ([]model.Product, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("deleted_at IS NULL")
	if queryInput.Status != nil {
		query = query.Where("status = ?", *queryInput.Status)
	}
	if queryInput.ShopID != nil {
		query = query.Where("shop_id = ?", *queryInput.ShopID)
	}
	if keyword := strings.TrimSpace(queryInput.Keyword); keyword != "" {
		likePattern := "%" + keyword + "%"
		query = query.Where("(name LIKE ? OR subtitle LIKE ?)", likePattern, likePattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var products []model.Product
	err := query.
		Order("id DESC").
		Offset((queryInput.Page - 1) * queryInput.PageSize).
		Limit(queryInput.PageSize).
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}
	return products, total, nil
}

func (r *ProductRepository) ListByShop(
	ctx context.Context,
	shopID uint64,
	status *int,
	page int,
	pageSize int,
) ([]model.Product, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("shop_id = ? AND deleted_at IS NULL", shopID)
	if status != nil {
		query = query.Where("status = ?", *status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var products []model.Product
	err := query.
		Order("id desc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}
	return products, total, nil
}

func (r *ProductRepository) ListForBuyer(
	ctx context.Context,
	queryInput BuyerProductQuery,
) ([]model.Product, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("status = ? AND deleted_at IS NULL", 1).
		Where(`EXISTS (SELECT 1 FROM shops s WHERE s.id = products.shop_id AND s.deleted_at IS NULL AND s.audit_status = ? AND s.status = ?)`, 1, 1)

	if queryInput.CategoryID != nil {
		query = query.Where("category_id = ?", *queryInput.CategoryID)
	}
	if queryInput.ShopID != nil {
		query = query.Where("shop_id = ?", *queryInput.ShopID)
	}
	if keyword := strings.TrimSpace(queryInput.Keyword); keyword != "" {
		likePattern := "%" + keyword + "%"
		query = query.Where("(name LIKE ? OR subtitle LIKE ?)", likePattern, likePattern)
	}
	if queryInput.MinPrice != nil {
		query = query.Where("price >= ?", *queryInput.MinPrice)
	}
	if queryInput.MaxPrice != nil {
		query = query.Where("price <= ?", *queryInput.MaxPrice)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orderBy := "sort_order asc, id desc"
	switch queryInput.SortBy {
	case "price_asc":
		orderBy = "price asc, id desc"
	case "price_desc":
		orderBy = "price desc, id desc"
	case "sales_desc":
		orderBy = "sales desc, id desc"
	case "latest":
		orderBy = "created_at desc, id desc"
	}

	var products []model.Product
	err := query.
		Order(orderBy).
		Offset((queryInput.Page - 1) * queryInput.PageSize).
		Limit(queryInput.PageSize).
		Find(&products).Error
	if err != nil {
		return nil, 0, err
	}
	return products, total, nil
}

func (r *ProductRepository) FindVisibleByID(ctx context.Context, id uint64) (*model.Product, error) {
	var product model.Product
	err := r.db.WithContext(ctx).
		Where("id = ? AND status = ? AND deleted_at IS NULL", id, 1).
		Where(`EXISTS (SELECT 1 FROM shops s WHERE s.id = products.shop_id AND s.deleted_at IS NULL AND s.audit_status = ? AND s.status = ?)`, 1, 1).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) FindByIDs(ctx context.Context, ids []uint64) ([]model.Product, error) {
	if len(ids) == 0 {
		return []model.Product{}, nil
	}
	var products []model.Product
	err := r.db.WithContext(ctx).
		Where("id IN ? AND deleted_at IS NULL", ids).
		Find(&products).Error
	return products, err
}

func (r *ProductRepository) WithinTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx.WithContext(ctx))
	})
}

func (r *ProductRepository) FindByIDAndShopIDForUpdate(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	shopID uint64,
) (*model.Product, error) {
	var product model.Product
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", id, shopID).
		First(&product).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) UpdateWithTx(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	shopID uint64,
	updates map[string]interface{},
) error {
	return tx.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", id, shopID).
		Updates(updates).Error
}

func (r *ProductRepository) UpdateByID(
	ctx context.Context,
	productID uint64,
	updates map[string]interface{},
) error {
	return r.db.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND deleted_at IS NULL", productID).
		Updates(updates).Error
}

// DeductStockIfEnough 在事务内扣减库存；影响行数为 0 表示库存不足或行不存在。
func (r *ProductRepository) DeductStockIfEnough(
	ctx context.Context,
	tx *gorm.DB,
	productID uint64,
	shopID uint64,
	qty float64,
) (bool, error) {
	res := tx.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL AND stock >= ?", productID, shopID, qty).
		Update("stock", gorm.Expr("stock - ?", qty))
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected == 1, nil
}

// AddStockWithTx 取消/拒单等场景加回库存（MVP 无 SKU 扣减，仅 products.stock）。
func (r *ProductRepository) AddStockWithTx(
	ctx context.Context,
	tx *gorm.DB,
	productID uint64,
	shopID uint64,
	qty float64,
) error {
	return tx.WithContext(ctx).
		Model(&model.Product{}).
		Where("id = ? AND shop_id = ? AND deleted_at IS NULL", productID, shopID).
		Update("stock", gorm.Expr("stock + ?", qty)).Error
}

func (r *ProductRepository) AggregateSellerDashboardStats(
	ctx context.Context,
	shopID uint64,
) (*SellerDashboardProductStats, error) {
	type row struct {
		OnSaleCount       int64 `gorm:"column:on_sale_count"`
		PendingAuditCount int64 `gorm:"column:pending_audit_count"`
		WarehouseCount    int64 `gorm:"column:warehouse_count"`
		LowStockCount     int64 `gorm:"column:low_stock_count"`
	}
	var out row
	err := r.db.WithContext(ctx).
		Model(&model.Product{}).
		Select(`
			COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS on_sale_count,
			COALESCE(SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END), 0) AS pending_audit_count,
			COALESCE(SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END), 0) AS warehouse_count,
			COALESCE(SUM(CASE WHEN status = 1 AND stock <= 10 THEN 1 ELSE 0 END), 0) AS low_stock_count
		`).
		Where("shop_id = ? AND deleted_at IS NULL", shopID).
		Scan(&out).Error
	if err != nil {
		return nil, err
	}
	return &SellerDashboardProductStats{
		OnSaleCount:       out.OnSaleCount,
		PendingAuditCount: out.PendingAuditCount,
		WarehouseCount:    out.WarehouseCount,
		LowStockCount:     out.LowStockCount,
	}, nil
}

func (r *ProductRepository) ListSellerLowStockByShop(
	ctx context.Context,
	shopID uint64,
	stockThreshold int,
	limit int,
) ([]model.Product, error) {
	if limit <= 0 {
		limit = 5
	}
	var list []model.Product
	err := r.db.WithContext(ctx).
		Where("shop_id = ? AND status = ? AND stock <= ? AND deleted_at IS NULL", shopID, 1, stockThreshold).
		Order("stock ASC, id DESC").
		Limit(limit).
		Find(&list).Error
	return list, err
}
