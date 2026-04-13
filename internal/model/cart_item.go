package model

import "time"

type CartItem struct {
	ID        uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	UserID    uint64     `gorm:"column:user_id"`
	ShopID    uint64     `gorm:"column:shop_id"`
	ProductID uint64     `gorm:"column:product_id"`
	SKUID     *uint64    `gorm:"column:sku_id"`
	Quantity  float64    `gorm:"column:quantity"`
	Selected  int        `gorm:"column:selected"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
	DeletedAt *time.Time `gorm:"column:deleted_at"`
}

func (CartItem) TableName() string {
	return "cart_items"
}
