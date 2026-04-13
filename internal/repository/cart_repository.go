package repository

import (
	"context"

	"gorm.io/gorm"

	"freshmart/internal/model"
)

type CartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{db: db}
}

func (r *CartRepository) ListByUserID(ctx context.Context, userID uint64) ([]model.CartItem, error) {
	var items []model.CartItem
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("shop_id asc, id desc").
		Find(&items).Error
	return items, err
}

func (r *CartRepository) CountByUserID(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Count(&count).Error
	return count, err
}

func (r *CartRepository) FindByUserProductSKU(
	ctx context.Context,
	userID uint64,
	productID uint64,
	skuID *uint64,
) (*model.CartItem, error) {
	var item model.CartItem
	query := r.db.WithContext(ctx).
		Where("user_id = ? AND product_id = ? AND deleted_at IS NULL", userID, productID)
	if skuID == nil {
		query = query.Where("sku_id IS NULL")
	} else {
		query = query.Where("sku_id = ?", *skuID)
	}
	err := query.First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *CartRepository) Create(ctx context.Context, item *model.CartItem) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *CartRepository) UpdateByIDAndUserID(
	ctx context.Context,
	id uint64,
	userID uint64,
	updates map[string]interface{},
) error {
	return r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		Updates(updates).Error
}

func (r *CartRepository) FindByIDAndUserID(ctx context.Context, id uint64, userID uint64) (*model.CartItem, error) {
	var item model.CartItem
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *CartRepository) SoftDeleteByIDAndUserID(ctx context.Context, id uint64, userID uint64) error {
	return r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *CartRepository) SoftDeleteBatchByIDs(ctx context.Context, userID uint64, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("user_id = ? AND id IN ? AND deleted_at IS NULL", userID, ids).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *CartRepository) SoftDeleteBatchByIDsWithTx(ctx context.Context, tx *gorm.DB, userID uint64, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return tx.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("user_id = ? AND id IN ? AND deleted_at IS NULL", userID, ids).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *CartRepository) SetSelectedForAll(ctx context.Context, userID uint64, selected int) error {
	return r.db.WithContext(ctx).
		Model(&model.CartItem{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Update("selected", selected).Error
}

func (r *CartRepository) ListByIDsAndUserID(ctx context.Context, userID uint64, ids []uint64) ([]model.CartItem, error) {
	if len(ids) == 0 {
		return []model.CartItem{}, nil
	}
	var items []model.CartItem
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND id IN ? AND deleted_at IS NULL", userID, ids).
		Find(&items).Error
	return items, err
}
