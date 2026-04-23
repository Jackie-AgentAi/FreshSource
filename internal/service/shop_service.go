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
	ErrShopAlreadyExists = errors.New("shop already exists")
	ErrShopNotFound      = errors.New("shop not found")
	ErrShopNameRequired  = errors.New("shop name is required")
	ErrShopInvalidAudit  = errors.New("invalid audit_status")
	ErrShopInvalidStatus = errors.New("invalid shop status")
)

const defaultShopRating = 5.0

type ShopService struct {
	shopRepo *repository.ShopRepository
}

func NewShopService(shopRepo *repository.ShopRepository) *ShopService {
	return &ShopService{shopRepo: shopRepo}
}

type ApplyShopInput struct {
	ShopName        string   `json:"shop_name"`
	Logo            string   `json:"logo"`
	Description     string   `json:"description"`
	ContactPhone    string   `json:"contact_phone"`
	Province        string   `json:"province"`
	City            string   `json:"city"`
	District        string   `json:"district"`
	Address         string   `json:"address"`
	BusinessLicense string   `json:"business_license"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
}

type ApplyShopResult struct {
	ShopID uint64 `json:"shop_id"`
}

func (s *ShopService) Apply(ctx context.Context, userID int64, in ApplyShopInput) (*ApplyShopResult, error) {
	uid := uint64(userID)
	_, err := s.shopRepo.FindOwnedByUserID(ctx, uid)
	if err == nil {
		return nil, ErrShopAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	shop := modelFromApplyInput(uid, in)
	if strings.TrimSpace(shop.ShopName) == "" {
		return nil, ErrShopNameRequired
	}
	if err := s.shopRepo.Create(ctx, &shop); err != nil {
		if repository.IsMySQLDuplicateKey(err) {
			return nil, ErrShopAlreadyExists
		}
		return nil, err
	}
	return &ApplyShopResult{ShopID: shop.ID}, nil
}

func modelFromApplyInput(uid uint64, in ApplyShopInput) model.Shop {
	return model.Shop{
		UserID:          uid,
		ShopName:        strings.TrimSpace(in.ShopName),
		Logo:            strings.TrimSpace(in.Logo),
		Description:     strings.TrimSpace(in.Description),
		ContactPhone:    strings.TrimSpace(in.ContactPhone),
		Province:        strings.TrimSpace(in.Province),
		City:            strings.TrimSpace(in.City),
		District:        strings.TrimSpace(in.District),
		Address:         strings.TrimSpace(in.Address),
		Latitude:        in.Latitude,
		Longitude:       in.Longitude,
		BusinessLicense: strings.TrimSpace(in.BusinessLicense),
		AuditStatus:     0,
		AuditRemark:     "",
		Rating:          defaultShopRating,
		TotalSales:      0,
		Status:          1,
	}
}

type SellerShopStatusView struct {
	ShopID          uint64 `json:"shop_id"`
	ShopName        string `json:"shop_name"`
	AuditStatus     int    `json:"audit_status"`
	AuditRemark     string `json:"audit_remark"`
	Status          int    `json:"status"`
	BusinessLicense string `json:"business_license"`
}

type SellerShopDetail struct {
	ShopID          uint64   `json:"shop_id"`
	ShopName        string   `json:"shop_name"`
	Logo            string   `json:"logo"`
	Description     string   `json:"description"`
	ContactPhone    string   `json:"contact_phone"`
	Province        string   `json:"province"`
	City            string   `json:"city"`
	District        string   `json:"district"`
	Address         string   `json:"address"`
	BusinessLicense string   `json:"business_license"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	AuditStatus     int      `json:"audit_status"`
	AuditRemark     string   `json:"audit_remark"`
	Status          int      `json:"status"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

func (s *ShopService) GetSellerAuditStatus(ctx context.Context, userID int64) (*SellerShopStatusView, error) {
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &SellerShopStatusView{
		ShopID:          shop.ID,
		ShopName:        shop.ShopName,
		AuditStatus:     shop.AuditStatus,
		AuditRemark:     shop.AuditRemark,
		Status:          shop.Status,
		BusinessLicense: shop.BusinessLicense,
	}, nil
}

func (s *ShopService) GetSellerShop(ctx context.Context, userID int64) (*SellerShopDetail, error) {
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &SellerShopDetail{
		ShopID:          shop.ID,
		ShopName:        shop.ShopName,
		Logo:            shop.Logo,
		Description:     shop.Description,
		ContactPhone:    shop.ContactPhone,
		Province:        shop.Province,
		City:            shop.City,
		District:        shop.District,
		Address:         shop.Address,
		BusinessLicense: shop.BusinessLicense,
		Latitude:        shop.Latitude,
		Longitude:       shop.Longitude,
		AuditStatus:     shop.AuditStatus,
		AuditRemark:     shop.AuditRemark,
		Status:          shop.Status,
		CreatedAt:       shop.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       shop.UpdatedAt.Format(time.RFC3339),
	}, nil
}

func (s *ShopService) UpdateSellerShop(ctx context.Context, userID int64, in ApplyShopInput) error {
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrShopNotFound
		}
		return err
	}
	name := strings.TrimSpace(in.ShopName)
	if name == "" {
		return ErrShopNameRequired
	}
	updates := map[string]interface{}{
		"shop_name":        name,
		"logo":             strings.TrimSpace(in.Logo),
		"description":      strings.TrimSpace(in.Description),
		"contact_phone":    strings.TrimSpace(in.ContactPhone),
		"province":         strings.TrimSpace(in.Province),
		"city":             strings.TrimSpace(in.City),
		"district":         strings.TrimSpace(in.District),
		"address":          strings.TrimSpace(in.Address),
		"business_license": strings.TrimSpace(in.BusinessLicense),
	}
	if in.Latitude != nil {
		updates["latitude"] = in.Latitude
	}
	if in.Longitude != nil {
		updates["longitude"] = in.Longitude
	}
	prev := shop.AuditStatus
	if prev == 1 || prev == 2 {
		updates["audit_status"] = 0
		updates["audit_remark"] = ""
	}
	return s.shopRepo.UpdateByID(ctx, shop.ID, updates)
}

func (s *ShopService) UpdateSellerShopStatus(ctx context.Context, userID int64, status int) error {
	if status != 0 && status != 1 {
		return ErrShopInvalidStatus
	}
	shop, err := s.shopRepo.FindOwnedByUserID(ctx, uint64(userID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrShopNotFound
		}
		return err
	}
	return s.shopRepo.UpdateByID(ctx, shop.ID, map[string]interface{}{
		"status": status,
	})
}

type AdminShopListItem struct {
	ID           uint64 `json:"id"`
	UserID       uint64 `json:"user_id"`
	ShopName     string `json:"shop_name"`
	Logo         string `json:"logo"`
	ContactPhone string `json:"contact_phone"`
	Province     string `json:"province"`
	City         string `json:"city"`
	District     string `json:"district"`
	Address      string `json:"address"`
	AuditStatus  int    `json:"audit_status"`
	AuditRemark  string `json:"audit_remark"`
	Status       int    `json:"status"`
	CreatedAt    string `json:"created_at"`
}

type AdminShopListData struct {
	List       []AdminShopListItem `json:"list"`
	Pagination response.Pagination `json:"pagination"`
}

func clampShopPageSize(n int) int {
	if n <= 0 {
		return 20
	}
	if n > 100 {
		return 100
	}
	return n
}

func (s *ShopService) AdminListShops(ctx context.Context, auditStatus *int, page, pageSize int) (*AdminShopListData, error) {
	if page <= 0 {
		page = 1
	}
	ps := clampShopPageSize(pageSize)
	list, total, err := s.shopRepo.ListForAdmin(ctx, auditStatus, page, ps)
	if err != nil {
		return nil, err
	}
	out := make([]AdminShopListItem, 0, len(list))
	for _, sh := range list {
		out = append(out, mapAdminShopListItem(sh))
	}
	return &AdminShopListData{
		List:       out,
		Pagination: response.BuildPagination(page, ps, int(total)),
	}, nil
}

func mapAdminShopListItem(sh model.Shop) AdminShopListItem {
	return AdminShopListItem{
		ID:           sh.ID,
		UserID:       sh.UserID,
		ShopName:     sh.ShopName,
		Logo:         sh.Logo,
		ContactPhone: sh.ContactPhone,
		Province:     sh.Province,
		City:         sh.City,
		District:     sh.District,
		Address:      sh.Address,
		AuditStatus:  sh.AuditStatus,
		AuditRemark:  sh.AuditRemark,
		Status:       sh.Status,
		CreatedAt:    sh.CreatedAt.Format(time.RFC3339),
	}
}

type AdminShopDetail struct {
	ID              uint64   `json:"id"`
	UserID          uint64   `json:"user_id"`
	ShopName        string   `json:"shop_name"`
	Logo            string   `json:"logo"`
	Description     string   `json:"description"`
	ContactPhone    string   `json:"contact_phone"`
	Province        string   `json:"province"`
	City            string   `json:"city"`
	District        string   `json:"district"`
	Address         string   `json:"address"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
	BusinessLicense string   `json:"business_license"`
	AuditStatus     int      `json:"audit_status"`
	AuditRemark     string   `json:"audit_remark"`
	Rating          float64  `json:"rating"`
	TotalSales      uint     `json:"total_sales"`
	Status          int      `json:"status"`
	CreatedAt       string   `json:"created_at"`
	UpdatedAt       string   `json:"updated_at"`
}

func (s *ShopService) AdminGetShop(ctx context.Context, shopID uint64) (*AdminShopDetail, error) {
	shop, err := s.shopRepo.FindByID(ctx, shopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrShopNotFound
		}
		return nil, err
	}
	return &AdminShopDetail{
		ID:              shop.ID,
		UserID:          shop.UserID,
		ShopName:        shop.ShopName,
		Logo:            shop.Logo,
		Description:     shop.Description,
		ContactPhone:    shop.ContactPhone,
		Province:        shop.Province,
		City:            shop.City,
		District:        shop.District,
		Address:         shop.Address,
		Latitude:        shop.Latitude,
		Longitude:       shop.Longitude,
		BusinessLicense: shop.BusinessLicense,
		AuditStatus:     shop.AuditStatus,
		AuditRemark:     shop.AuditRemark,
		Rating:          shop.Rating,
		TotalSales:      shop.TotalSales,
		Status:          shop.Status,
		CreatedAt:       shop.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       shop.UpdatedAt.Format(time.RFC3339),
	}, nil
}

type AdminAuditShopInput struct {
	AuditStatus int    `json:"audit_status"`
	AuditRemark string `json:"audit_remark"`
}

func (s *ShopService) AdminAuditShop(ctx context.Context, shopID uint64, in AdminAuditShopInput) error {
	st := in.AuditStatus
	if st != 1 && st != 2 {
		return ErrShopInvalidAudit
	}
	if _, err := s.shopRepo.FindByID(ctx, shopID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrShopNotFound
		}
		return err
	}
	remark := strings.TrimSpace(in.AuditRemark)
	if len(remark) > 255 {
		remark = remark[:255]
	}
	return s.shopRepo.UpdateByID(ctx, shopID, map[string]interface{}{
		"audit_status": st,
		"audit_remark": remark,
	})
}

func (s *ShopService) AdminCloseShop(ctx context.Context, shopID uint64) error {
	_, err := s.shopRepo.FindByID(ctx, shopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrShopNotFound
		}
		return err
	}
	return s.shopRepo.UpdateByID(ctx, shopID, map[string]interface{}{
		"status": 0,
	})
}
