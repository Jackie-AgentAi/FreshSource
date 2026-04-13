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
