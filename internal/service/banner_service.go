package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/pkg/response"
	"freshmart/internal/repository"
)

var (
	ErrBannerNotFound      = errors.New("banner not found")
	ErrBannerImageRequired = errors.New("image_url is required")
	ErrBannerLinkType      = errors.New("invalid link_type")
	ErrBannerStatus        = errors.New("invalid status")
	ErrBannerInvalidTime   = errors.New("invalid start_time or end_time")
)

type BannerService struct {
	bannerRepo *repository.BannerRepository
}

func NewBannerService(bannerRepo *repository.BannerRepository) *BannerService {
	return &BannerService{bannerRepo: bannerRepo}
}

type BannerWriteInput struct {
	Title     string  `json:"title"`
	ImageURL  string  `json:"image_url"`
	LinkType  int     `json:"link_type"`
	LinkValue string  `json:"link_value"`
	Position  string  `json:"position"`
	SortOrder int     `json:"sort_order"`
	Status    int     `json:"status"`
	StartTime *string `json:"start_time"`
	EndTime   *string `json:"end_time"`
}

type BannerView struct {
	ID        uint64  `json:"id"`
	Title     string  `json:"title"`
	ImageURL  string  `json:"image_url"`
	LinkType  int     `json:"link_type"`
	LinkValue string  `json:"link_value"`
	Position  string  `json:"position"`
	SortOrder int     `json:"sort_order"`
	Status    int     `json:"status"`
	StartTime *string `json:"start_time"`
	EndTime   *string `json:"end_time"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type BannerListQuery struct {
	Position *string
	Status   *int
	Page     int
	PageSize int
}

type BannerListData struct {
	List       []BannerView        `json:"list"`
	Pagination response.Pagination `json:"pagination"`
}

func (s *BannerService) List(ctx context.Context, q BannerListQuery) (*BannerListData, error) {
	page := q.Page
	if page <= 0 {
		page = 1
	}
	pageSize := q.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	list, total, err := s.bannerRepo.List(ctx, repository.BannerListQuery{
		Position: q.Position,
		Status:   q.Status,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}
	out := make([]BannerView, 0, len(list))
	for _, b := range list {
		out = append(out, mapBannerToView(b))
	}
	pg := response.BuildPagination(page, pageSize, int(total))
	return &BannerListData{List: out, Pagination: pg}, nil
}

func (s *BannerService) Create(ctx context.Context, in BannerWriteInput) (uint64, error) {
	if err := validateBannerInput(in); err != nil {
		return 0, err
	}
	start, end, err := parseBannerTimes(in.StartTime, in.EndTime)
	if err != nil {
		return 0, err
	}
	pos := strings.TrimSpace(in.Position)
	if pos == "" {
		pos = "home"
	}
	b := &model.Banner{
		Title:     strings.TrimSpace(in.Title),
		ImageURL:  strings.TrimSpace(in.ImageURL),
		LinkType:  in.LinkType,
		LinkValue: strings.TrimSpace(in.LinkValue),
		Position:  pos,
		SortOrder: in.SortOrder,
		Status:    in.Status,
		StartTime: start,
		EndTime:   end,
	}
	if err := s.bannerRepo.Create(ctx, b); err != nil {
		return 0, err
	}
	return b.ID, nil
}

func (s *BannerService) Update(ctx context.Context, id uint64, in BannerWriteInput) error {
	if id == 0 {
		return ErrBannerNotFound
	}
	if err := validateBannerInput(in); err != nil {
		return err
	}
	start, end, err := parseBannerTimes(in.StartTime, in.EndTime)
	if err != nil {
		return err
	}
	if _, err := s.bannerRepo.FindByID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrBannerNotFound
		}
		return err
	}
	pos := strings.TrimSpace(in.Position)
	if pos == "" {
		pos = "home"
	}
	updates := map[string]interface{}{
		"title":      strings.TrimSpace(in.Title),
		"image_url":  strings.TrimSpace(in.ImageURL),
		"link_type":  in.LinkType,
		"link_value": strings.TrimSpace(in.LinkValue),
		"position":   pos,
		"sort_order": in.SortOrder,
		"status":     in.Status,
		"start_time": start,
		"end_time":   end,
	}
	return s.bannerRepo.Update(ctx, id, updates)
}

func (s *BannerService) Delete(ctx context.Context, id uint64) error {
	if id == 0 {
		return ErrBannerNotFound
	}
	n, err := s.bannerRepo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrBannerNotFound
	}
	return nil
}

func validateBannerInput(in BannerWriteInput) error {
	if strings.TrimSpace(in.ImageURL) == "" {
		return ErrBannerImageRequired
	}
	if in.LinkType < 0 || in.LinkType > 3 {
		return ErrBannerLinkType
	}
	if in.Status != 0 && in.Status != 1 {
		return ErrBannerStatus
	}
	return nil
}

func parseBannerTimes(startStr, endStr *string) (*time.Time, *time.Time, error) {
	var startPtr *time.Time
	if startStr != nil && strings.TrimSpace(*startStr) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(*startStr))
		if err != nil {
			return nil, nil, ErrBannerInvalidTime
		}
		startPtr = &t
	}
	var endPtr *time.Time
	if endStr != nil && strings.TrimSpace(*endStr) != "" {
		t, err := time.Parse(time.RFC3339, strings.TrimSpace(*endStr))
		if err != nil {
			return nil, nil, ErrBannerInvalidTime
		}
		endPtr = &t
	}
	return startPtr, endPtr, nil
}

func mapBannerToView(b model.Banner) BannerView {
	return BannerView{
		ID:        b.ID,
		Title:     b.Title,
		ImageURL:  b.ImageURL,
		LinkType:  b.LinkType,
		LinkValue: b.LinkValue,
		Position:  b.Position,
		SortOrder: b.SortOrder,
		Status:    b.Status,
		StartTime: formatTimePtr(b.StartTime),
		EndTime:   formatTimePtr(b.EndTime),
		CreatedAt: b.CreatedAt.Format(time.RFC3339),
		UpdatedAt: b.UpdatedAt.Format(time.RFC3339),
	}
}
