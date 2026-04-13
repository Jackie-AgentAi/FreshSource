package repository

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"freshmart/internal/model"
)

type AddressRepository struct {
	db *gorm.DB
}

func NewAddressRepository(db *gorm.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

func (r *AddressRepository) ListByUserID(ctx context.Context, userID uint64) ([]model.UserAddress, error) {
	var addresses []model.UserAddress
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("is_default desc, id desc").
		Find(&addresses).Error
	return addresses, err
}

func (r *AddressRepository) CountByUserID(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.UserAddress{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Count(&count).Error
	return count, err
}

func (r *AddressRepository) Create(ctx context.Context, tx *gorm.DB, address *model.UserAddress) error {
	db := r.db.WithContext(ctx)
	if tx != nil {
		db = tx.WithContext(ctx)
	}
	return db.Create(address).Error
}

func (r *AddressRepository) FindByIDAndUserID(ctx context.Context, id uint64, userID uint64) (*model.UserAddress, error) {
	var address model.UserAddress
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		First(&address).Error
	if err != nil {
		return nil, err
	}
	return &address, nil
}

func (r *AddressRepository) FindByIDAndUserIDForUpdate(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	userID uint64,
) (*model.UserAddress, error) {
	var address model.UserAddress
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		First(&address).Error
	if err != nil {
		return nil, err
	}
	return &address, nil
}

func (r *AddressRepository) ClearDefaultByUserID(ctx context.Context, tx *gorm.DB, userID uint64) error {
	db := r.db.WithContext(ctx)
	if tx != nil {
		db = tx.WithContext(ctx)
	}
	return db.Model(&model.UserAddress{}).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Update("is_default", 0).Error
}

func (r *AddressRepository) UpdateByIDAndUserID(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	userID uint64,
	updates map[string]interface{},
) error {
	db := r.db.WithContext(ctx)
	if tx != nil {
		db = tx.WithContext(ctx)
	}
	return db.Model(&model.UserAddress{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		Updates(updates).Error
}

func (r *AddressRepository) SoftDeleteByIDAndUserID(
	ctx context.Context,
	tx *gorm.DB,
	id uint64,
	userID uint64,
) error {
	db := r.db.WithContext(ctx)
	if tx != nil {
		db = tx.WithContext(ctx)
	}
	return db.Model(&model.UserAddress{}).
		Where("id = ? AND user_id = ? AND deleted_at IS NULL", id, userID).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

func (r *AddressRepository) FindLatestByUserID(ctx context.Context, tx *gorm.DB, userID uint64) (*model.UserAddress, error) {
	db := r.db.WithContext(ctx)
	if tx != nil {
		db = tx.WithContext(ctx)
	}
	var address model.UserAddress
	err := db.Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("id desc").
		First(&address).Error
	if err != nil {
		return nil, err
	}
	return &address, nil
}

func (r *AddressRepository) WithinTransaction(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return fn(tx.WithContext(ctx))
	})
}
