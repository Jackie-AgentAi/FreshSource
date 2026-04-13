package model

import "time"

type User struct {
	ID           uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	Phone        string     `gorm:"column:phone"`
	PasswordHash string     `gorm:"column:password_hash"`
	Nickname     string     `gorm:"column:nickname"`
	Avatar       string     `gorm:"column:avatar"`
	Role         int        `gorm:"column:role"`
	Status       int        `gorm:"column:status"`
	LastLoginAt  *time.Time `gorm:"column:last_login_at"`
	CreatedAt    time.Time  `gorm:"column:created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
	DeletedAt    *time.Time `gorm:"column:deleted_at"`
}

func (User) TableName() string {
	return "users"
}
