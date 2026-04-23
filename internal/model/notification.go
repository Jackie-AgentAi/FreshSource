package model

import "time"

type Notification struct {
	ID        uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	UserID    uint64    `gorm:"column:user_id"`
	Type      string    `gorm:"column:type"`
	Title     string    `gorm:"column:title"`
	Content   string    `gorm:"column:content"`
	BizType   string    `gorm:"column:biz_type"`
	BizID     *uint64   `gorm:"column:biz_id"`
	IsRead    int       `gorm:"column:is_read"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}
