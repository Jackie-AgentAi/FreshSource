package model

import "time"

type Admin struct {
	ID          uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	UserID      uint64    `gorm:"column:user_id"`
	RealName    string    `gorm:"column:real_name"`
	RoleLevel   int       `gorm:"column:role_level"`
	Permissions string    `gorm:"column:permissions"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (Admin) TableName() string {
	return "admins"
}
