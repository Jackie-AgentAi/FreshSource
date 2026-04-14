package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"freshmart/internal/model"
)

type ShopRepository struct {
	db *gorm.DB
}

func NewShopRepository(db *gorm.DB) *ShopRepository {
	return &ShopRepository{db: db}
}

func (r *ShopRepository) FindOwnedByUserID(ctx context.Context, userID uint64) (*model.Shop, error) {
	var s model.Shop
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND deleted_at IS NULL", userID).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ShopRepository) FindIDByOwnerUserID(ctx context.Context, userID int64) (uint64, error) {
	s, err := r.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}
	return s.ID, nil
}

func (r *ShopRepository) Create(ctx context.Context, shop *model.Shop) error {
	return r.db.WithContext(ctx).Create(shop).Error
}

func (r *ShopRepository) FindByID(ctx context.Context, id uint64) (*model.Shop, error) {
	var s model.Shop
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ShopRepository) ListForAdmin(
	ctx context.Context,
	auditStatus *int,
	page int,
	pageSize int,
) ([]model.Shop, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.Shop{}).Where("deleted_at IS NULL")
	if auditStatus != nil {
		q = q.Where("audit_status = ?", *auditStatus)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []model.Shop
	err := q.Order("id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&list).Error
	return list, total, err
}

func (r *ShopRepository) UpdateByID(ctx context.Context, id uint64, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&model.Shop{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(updates).Error
}

type ShopPublic struct {
	ID           uint64  `gorm:"column:id"`
	ShopName     string  `gorm:"column:shop_name"`
	Logo         string  `gorm:"column:logo"`
	Description  string  `gorm:"column:description"`
	ContactPhone string  `gorm:"column:contact_phone"`
	Province     string  `gorm:"column:province"`
	City         string  `gorm:"column:city"`
	District     string  `gorm:"column:district"`
	Address      string  `gorm:"column:address"`
	Rating       float64 `gorm:"column:rating"`
	TotalSales   uint64  `gorm:"column:total_sales"`
}

// FindShopNameByID 买家订单展示用：不校验 audit/status，仅排除已删店铺。
func (r *ShopRepository) FindShopNameByID(ctx context.Context, id uint64) (string, error) {
	type row struct {
		ShopName string `gorm:"column:shop_name"`
	}
	var x row
	err := r.db.WithContext(ctx).
		Table("shops").
		Select("shop_name").
		Where("id = ? AND deleted_at IS NULL", id).
		Take(&x).Error
	if err != nil {
		return "", err
	}
	return x.ShopName, nil
}

// FindShopNamesByIDs 管理端订单列表等：仅排除已删店铺，不按审核/营业状态过滤。
func (r *ShopRepository) FindShopNamesByIDs(ctx context.Context, ids []uint64) (map[uint64]string, error) {
	if len(ids) == 0 {
		return map[uint64]string{}, nil
	}
	type row struct {
		ID       uint64 `gorm:"column:id"`
		ShopName string `gorm:"column:shop_name"`
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("shops").
		Select("id, shop_name").
		Where("id IN ? AND deleted_at IS NULL", ids).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[uint64]string, len(rows))
	for _, rrow := range rows {
		out[rrow.ID] = rrow.ShopName
	}
	return out, nil
}

func (r *ShopRepository) FindPublicByID(ctx context.Context, id uint64) (*ShopPublic, error) {
	var shop ShopPublic
	err := r.db.WithContext(ctx).
		Table("shops").
		Select("id, shop_name, logo, description, contact_phone, province, city, district, address, rating, total_sales").
		Where("id = ? AND audit_status = 1 AND status = 1 AND deleted_at IS NULL", id).
		First(&shop).Error
	if err != nil {
		return nil, err
	}
	return &shop, nil
}

// ShopForOrder 下单事务内锁定店铺行后解析出的字段。
type ShopForOrder struct {
	ID          uint64 `gorm:"column:id"`
	UserID      uint64 `gorm:"column:user_id"`
	ShopName    string `gorm:"column:shop_name"`
	AuditStatus int    `gorm:"column:audit_status"`
	Status      int    `gorm:"column:status"`
}

func (r *ShopRepository) FindByIDForUpdate(ctx context.Context, tx *gorm.DB, id uint64) (*ShopForOrder, error) {
	var row ShopForOrder
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Table("shops").
		Select("id, user_id, shop_name, audit_status, status").
		Where("id = ? AND deleted_at IS NULL", id).
		First(&row).Error
	if err != nil {
		return nil, err
	}
	return &row, nil
}

func (r *ShopRepository) ListPublicByIDs(ctx context.Context, ids []uint64) ([]ShopPublic, error) {
	if len(ids) == 0 {
		return []ShopPublic{}, nil
	}
	var shops []ShopPublic
	err := r.db.WithContext(ctx).
		Table("shops").
		Select("id, shop_name, logo, description, contact_phone, province, city, district, address, rating, total_sales").
		Where("id IN ? AND audit_status = 1 AND status = 1 AND deleted_at IS NULL", ids).
		Find(&shops).Error
	if err != nil {
		return nil, err
	}
	return shops, nil
}
