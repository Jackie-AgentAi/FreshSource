package model

import "time"

type UserAddress struct {
	ID            uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	UserID        uint64     `gorm:"column:user_id"`
	ContactName   string     `gorm:"column:contact_name"`
	ContactPhone  string     `gorm:"column:contact_phone"`
	Province      string     `gorm:"column:province"`
	City          string     `gorm:"column:city"`
	District      string     `gorm:"column:district"`
	DetailAddress string     `gorm:"column:detail_address"`
	Latitude      *float64   `gorm:"column:latitude"`
	Longitude     *float64   `gorm:"column:longitude"`
	IsDefault     int        `gorm:"column:is_default"`
	Tag           string     `gorm:"column:tag"`
	CreatedAt     time.Time  `gorm:"column:created_at"`
	UpdatedAt     time.Time  `gorm:"column:updated_at"`
	DeletedAt     *time.Time `gorm:"column:deleted_at"`
}

func (UserAddress) TableName() string {
	return "user_addresses"
}
