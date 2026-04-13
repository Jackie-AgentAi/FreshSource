package model

import "time"

type Category struct {
	ID        uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	ParentID  uint64    `gorm:"column:parent_id"`
	Name      string    `gorm:"column:name"`
	Icon      string    `gorm:"column:icon"`
	SortOrder int       `gorm:"column:sort_order"`
	Status    int       `gorm:"column:status"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (Category) TableName() string {
	return "categories"
}
