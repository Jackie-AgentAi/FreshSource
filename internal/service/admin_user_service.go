package service

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/pkg/response"
	"freshmart/internal/repository"
)

var (
	ErrAdminUserNotFound    = errors.New("user not found")
	ErrAdminUserBadStatus   = errors.New("invalid user status")
	ErrAdminUserBadRole     = errors.New("invalid user role")
)

type AdminUserService struct {
	userRepo *repository.UserRepository
}

func NewAdminUserService(userRepo *repository.UserRepository) *AdminUserService {
	return &AdminUserService{userRepo: userRepo}
}

type AdminUserListQuery struct {
	Role     *int
	Status   *int
	Page     int
	PageSize int
}

type AdminUserListItem struct {
	ID          uint64  `json:"id"`
	Phone       string  `json:"phone"`
	Nickname    string  `json:"nickname"`
	Avatar      string  `json:"avatar"`
	Role        int     `json:"role"`
	Status      int     `json:"status"`
	LastLoginAt *string `json:"last_login_at"`
	CreatedAt   string  `json:"created_at"`
}

type AdminUserListData struct {
	List       []AdminUserListItem `json:"list"`
	Pagination response.Pagination `json:"pagination"`
}

func clampUserPageSize(n int) int {
	if n <= 0 {
		return 20
	}
	if n > 100 {
		return 100
	}
	return n
}

func formatTimePtrRFC3339(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(time.RFC3339)
	return &s
}

func (s *AdminUserService) List(ctx context.Context, q AdminUserListQuery) (*AdminUserListData, error) {
	page := q.Page
	if page <= 0 {
		page = 1
	}
	pageSize := clampUserPageSize(q.PageSize)
	if q.Role != nil && (*q.Role < 1 || *q.Role > 3) {
		return nil, ErrAdminUserBadRole
	}
	if q.Status != nil && (*q.Status != 0 && *q.Status != 1) {
		return nil, ErrAdminUserBadStatus
	}
	users, total, err := s.userRepo.ListForAdmin(ctx, q.Role, q.Status, page, pageSize)
	if err != nil {
		return nil, err
	}
	out := make([]AdminUserListItem, 0, len(users))
	for _, u := range users {
		out = append(out, AdminUserListItem{
			ID:          u.ID,
			Phone:       u.Phone,
			Nickname:    u.Nickname,
			Avatar:      u.Avatar,
			Role:        u.Role,
			Status:      u.Status,
			LastLoginAt: formatTimePtrRFC3339(u.LastLoginAt),
			CreatedAt:   u.CreatedAt.Format(time.RFC3339),
		})
	}
	return &AdminUserListData{
		List:       out,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	}, nil
}

func (s *AdminUserService) UpdateStatus(ctx context.Context, userID uint64, status int) error {
	if userID == 0 {
		return ErrAdminUserNotFound
	}
	if status != 0 && status != 1 {
		return ErrAdminUserBadStatus
	}
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAdminUserNotFound
		}
		return err
	}
	if user.Role == 3 && status == 0 {
		return ErrAdminUserBadStatus
	}
	return s.userRepo.UpdateStatusByID(ctx, userID, status)
}
