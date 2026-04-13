package model

import "time"

type Shop struct {
	ID              uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	UserID          uint64     `gorm:"column:user_id"`
	ShopName        string     `gorm:"column:shop_name"`
	Logo            string     `gorm:"column:logo"`
	Description     string     `gorm:"column:description"`
	ContactPhone    string     `gorm:"column:contact_phone"`
	Province        string     `gorm:"column:province"`
	City            string     `gorm:"column:city"`
	District        string     `gorm:"column:district"`
	Address         string     `gorm:"column:address"`
	Latitude        *float64   `gorm:"column:latitude"`
	Longitude       *float64   `gorm:"column:longitude"`
	BusinessLicense string     `gorm:"column:business_license"`
	AuditStatus     int        `gorm:"column:audit_status"`
	AuditRemark     string     `gorm:"column:audit_remark"`
	Rating          float64    `gorm:"column:rating"`
	TotalSales      uint       `gorm:"column:total_sales"`
	Status          int        `gorm:"column:status"`
	CreatedAt       time.Time  `gorm:"column:created_at"`
	UpdatedAt       time.Time  `gorm:"column:updated_at"`
	DeletedAt       *time.Time `gorm:"column:deleted_at"`
}

func (Shop) TableName() string {
	return "shops"
}
