package model

import "time"

type Product struct {
	ID            uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	ShopID        uint64     `gorm:"column:shop_id"`
	CategoryID    uint64     `gorm:"column:category_id"`
	Name          string     `gorm:"column:name"`
	Subtitle      string     `gorm:"column:subtitle"`
	CoverImage    string     `gorm:"column:cover_image"`
	Images        string     `gorm:"column:images"`
	Description   string     `gorm:"column:description"`
	Price         float64    `gorm:"column:price"`
	OriginalPrice *float64   `gorm:"column:original_price"`
	Unit          string     `gorm:"column:unit"`
	MinBuy        float64    `gorm:"column:min_buy"`
	StepBuy       float64    `gorm:"column:step_buy"`
	Stock         int        `gorm:"column:stock"`
	Sales         uint64     `gorm:"column:sales"`
	Status        int        `gorm:"column:status"`
	IsRecommend   int        `gorm:"column:is_recommend"`
	OriginPlace   string     `gorm:"column:origin_place"`
	ShelfLife     string     `gorm:"column:shelf_life"`
	StorageMethod string     `gorm:"column:storage_method"`
	SortOrder     int        `gorm:"column:sort_order"`
	CreatedAt     time.Time  `gorm:"column:created_at"`
	UpdatedAt     time.Time  `gorm:"column:updated_at"`
	DeletedAt     *time.Time `gorm:"column:deleted_at"`
}

func (Product) TableName() string {
	return "products"
}
