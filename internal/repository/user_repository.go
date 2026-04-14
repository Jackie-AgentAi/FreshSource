package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"freshmart/internal/model"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, tx *gorm.DB, user *model.User) error {
	dbToUse := r.db.WithContext(ctx)
	if tx != nil {
		dbToUse = tx.WithContext(ctx)
	}
	return dbToUse.Create(user).Error
}

func (r *UserRepository) FindByPhone(ctx context.Context, phone string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("phone = ?", phone).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	_, err := r.FindByPhone(ctx, phone)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return false, err
}

func (r *UserRepository) FindByID(ctx context.Context, id uint64) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ListForAdmin(
	ctx context.Context,
	role *int,
	status *int,
	page int,
	pageSize int,
) ([]model.User, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("deleted_at IS NULL")
	if role != nil {
		query = query.Where("role = ?", *role)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []model.User
	offset := (page - 1) * pageSize
	if err := query.
		Order("id DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&list).Error; err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

func (r *UserRepository) UpdateStatusByID(ctx context.Context, id uint64, status int) error {
	return r.db.WithContext(ctx).
		Model(&model.User{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("status", status).Error
}
