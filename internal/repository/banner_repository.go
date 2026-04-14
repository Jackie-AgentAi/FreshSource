package repository

import (
	"context"

	"gorm.io/gorm"

	"freshmart/internal/model"
)

type BannerRepository struct {
	db *gorm.DB
}

func NewBannerRepository(db *gorm.DB) *BannerRepository {
	return &BannerRepository{db: db}
}

type BannerListQuery struct {
	Position *string
	Status   *int
	Page     int
	PageSize int
}

func (r *BannerRepository) Create(ctx context.Context, b *model.Banner) error {
	return r.db.WithContext(ctx).Create(b).Error
}

func (r *BannerRepository) FindByID(ctx context.Context, id uint64) (*model.Banner, error) {
	var b model.Banner
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&b).Error
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *BannerRepository) Update(ctx context.Context, id uint64, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&model.Banner{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *BannerRepository) Delete(ctx context.Context, id uint64) (int64, error) {
	res := r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Banner{})
	return res.RowsAffected, res.Error
}

func (r *BannerRepository) buildListQuery(ctx context.Context, q BannerListQuery) *gorm.DB {
	dbq := r.db.WithContext(ctx).Model(&model.Banner{})
	if q.Position != nil && *q.Position != "" {
		dbq = dbq.Where("position = ?", *q.Position)
	}
	if q.Status != nil {
		dbq = dbq.Where("status = ?", *q.Status)
	}
	return dbq
}

func (r *BannerRepository) List(ctx context.Context, q BannerListQuery) ([]model.Banner, int64, error) {
	dbq := r.buildListQuery(ctx, q)
	var total int64
	if err := dbq.Count(&total).Error; err != nil {
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
	var list []model.Banner
	err := r.buildListQuery(ctx, q).
		Order("sort_order ASC, id DESC").
		Offset((page - 1) * ps).
		Limit(ps).
		Find(&list).Error
	return list, total, err
}
