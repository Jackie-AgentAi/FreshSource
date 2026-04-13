package repository

import (
	"context"

	"gorm.io/gorm"

	"freshmart/internal/model"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) ListAll(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).
		Order("sort_order asc, id asc").
		Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) ListVisible(ctx context.Context) ([]model.Category, error) {
	var categories []model.Category
	err := r.db.WithContext(ctx).
		Where("status = ?", 1).
		Order("sort_order asc, id asc").
		Find(&categories).Error
	return categories, err
}

func (r *CategoryRepository) FindByID(ctx context.Context, id uint64) (*model.Category, error) {
	var category model.Category
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *CategoryRepository) Create(ctx context.Context, category *model.Category) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *CategoryRepository) Update(ctx context.Context, id uint64, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&model.Category{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *CategoryRepository) Delete(ctx context.Context, id uint64) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Category{}).Error
}

func (r *CategoryRepository) CountChildren(ctx context.Context, id uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Category{}).Where("parent_id = ?", id).Count(&count).Error
	return count, err
}

func (r *CategoryRepository) CountProducts(ctx context.Context, categoryID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("products").
		Where("category_id = ? AND deleted_at IS NULL", categoryID).
		Count(&count).Error
	return count, err
}
