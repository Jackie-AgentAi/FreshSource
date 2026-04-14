package model

import "time"

// Banner 对应表 banners（无软删字段）。
type Banner struct {
	ID        uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	Title     string     `gorm:"column:title"`
	ImageURL  string     `gorm:"column:image_url"`
	LinkType  int        `gorm:"column:link_type"`
	LinkValue string     `gorm:"column:link_value"`
	Position  string     `gorm:"column:position"`
	SortOrder int        `gorm:"column:sort_order"`
	Status    int        `gorm:"column:status"`
	StartTime *time.Time `gorm:"column:start_time"`
	EndTime   *time.Time `gorm:"column:end_time"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
}

func (Banner) TableName() string {
	return "banners"
}
