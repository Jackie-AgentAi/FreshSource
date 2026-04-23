package repository

import (
	"context"
	"strings"

	"gorm.io/gorm"

	"freshmart/internal/model"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) ListByUser(
	ctx context.Context,
	userID uint64,
	notificationType string,
	page int,
	pageSize int,
) ([]model.Notification, int64, error) {
	query := r.db.WithContext(ctx).
		Model(&model.Notification{}).
		Where("user_id = ?", userID)
	if tp := strings.TrimSpace(notificationType); tp != "" {
		query = query.Where("type = ?", tp)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var list []model.Notification
	err := query.Order("created_at DESC, id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&list).Error
	return list, total, err
}

func (r *NotificationRepository) CountUnreadByUser(ctx context.Context, userID uint64) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&model.Notification{}).
		Where("user_id = ? AND is_read = 0", userID).
		Count(&count).Error
	return count, err
}

func (r *NotificationRepository) FindLatestByUser(ctx context.Context, userID uint64) (*model.Notification, error) {
	var item model.Notification
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC, id DESC").
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *NotificationRepository) MarkReadByIDAndUser(ctx context.Context, id uint64, userID uint64) (int64, error) {
	res := r.db.WithContext(ctx).
		Model(&model.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", 1)
	if res.Error != nil {
		return 0, res.Error
	}
	return res.RowsAffected, nil
}

func (r *NotificationRepository) MarkAllReadByUser(ctx context.Context, userID uint64) error {
	return r.db.WithContext(ctx).
		Model(&model.Notification{}).
		Where("user_id = ? AND is_read = 0", userID).
		Update("is_read", 1).Error
}

func (r *NotificationRepository) ListGeneratedByUser(ctx context.Context, userID uint64) ([]model.Notification, error) {
	var list []model.Notification
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND biz_type LIKE ?", userID, "seller_%").
		Order("created_at DESC, id DESC").
		Find(&list).Error
	return list, err
}

func (r *NotificationRepository) Create(ctx context.Context, item *model.Notification) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *NotificationRepository) UpdateByID(ctx context.Context, id uint64, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&model.Notification{}).
		Where("id = ?", id).
		Updates(updates).Error
}

func (r *NotificationRepository) DeleteByIDs(ctx context.Context, ids []uint64) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Delete(&model.Notification{}).Error
}
