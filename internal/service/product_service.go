package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

const (
	productStatusOffShelf = 0
	productStatusOnShelf  = 1
	productStatusPending  = 2
)

var (
	ErrProductNotFound         = errors.New("product not found")
	ErrProductCoverRequired    = errors.New("product cover image is required")
	ErrProductImagesTooMany    = errors.New("product images exceed max count 9")
	ErrProductNameRequired     = errors.New("product name is required")
	ErrProductNotAllowed       = errors.New("product operation not allowed")
	ErrSellerShopNotFound      = errors.New("seller shop not found")
	ErrProductStockNotEnough   = errors.New("stock not enough")
	ErrBatchPriceEmpty         = errors.New("batch price payload is empty")
	ErrProductInvalidAudit     = errors.New("invalid product audit_status")
	ErrProductInvalidRecommend = errors.New("invalid is_recommend")
	ErrProductImageRefInvalid  = errors.New("invalid image url: use http(s) or a path starting with / (e.g. /uploads/...)")
	ErrProductImportEmpty       = errors.New("import csv is empty")
	ErrProductImportTooLarge    = errors.New("import csv exceeds max size")
	ErrProductImportTooManyRows = errors.New("import exceeds max 500 data rows")
	ErrProductImportBadHeader   = errors.New("import csv header does not match template")
)

type ProductService struct {
	productRepo  *repository.ProductRepository
	categoryRepo *repository.CategoryRepository
	shopRepo     *repository.ShopRepository
}

type SaveProductInput struct {
	CategoryID    uint64   `json:"category_id"`
	Name          string   `json:"name"`
	Subtitle      string   `json:"subtitle"`
	CoverImage    string   `json:"cover_image"`
	Images        []string `json:"images"`
	Description   string   `json:"description"`
	Price         float64  `json:"price"`
	OriginalPrice *float64 `json:"original_price"`
	Unit          string   `json:"unit"`
	MinBuy        float64  `json:"min_buy"`
	StepBuy       float64  `json:"step_buy"`
	Stock         int      `json:"stock"`
	OriginPlace   string   `json:"origin_place"`
	ShelfLife     string   `json:"shelf_life"`
	StorageMethod string   `json:"storage_method"`
	SortOrder     int      `json:"sort_order"`
}

type BatchPriceInput struct {
	ID    uint64  `json:"id"`
	Price float64 `json:"price"`
}

type ProductListItem struct {
	ID            uint64   `json:"id"`
	ShopID        uint64   `json:"shop_id"`
	CategoryID    uint64   `json:"category_id"`
	Name          string   `json:"name"`
	Subtitle      string   `json:"subtitle"`
	CoverImage    string   `json:"cover_image"`
	Images        []string `json:"images"`
	Description   string   `json:"description"`
	Price         float64  `json:"price"`
	OriginalPrice *float64 `json:"original_price"`
	Unit          string   `json:"unit"`
	MinBuy        float64  `json:"min_buy"`
	StepBuy       float64  `json:"step_buy"`
	Stock         int      `json:"stock"`
	Status        int      `json:"status"`
	IsRecommend   int      `json:"is_recommend"`
	OriginPlace   string   `json:"origin_place"`
	ShelfLife     string   `json:"shelf_life"`
	StorageMethod string   `json:"storage_method"`
	SortOrder     int      `json:"sort_order"`
}

type BuyerProductQuery struct {
	CategoryID *uint64
	ShopID     *uint64
	Keyword    string
	SortBy     string
	MinPrice   *float64
	MaxPrice   *float64
	Page       int
	PageSize   int
}

type AdminProductListQuery struct {
	Status   *int
	ShopID   *uint64
	Keyword  string
	Page     int
	PageSize int
}

type AdminProductListItem struct {
	ID            uint64   `json:"id"`
	ShopID        uint64   `json:"shop_id"`
	CategoryID    uint64   `json:"category_id"`
	Name          string   `json:"name"`
	Subtitle      string   `json:"subtitle"`
	CoverImage    string   `json:"cover_image"`
	Images        []string `json:"images"`
	Description   string   `json:"description"`
	Price         float64  `json:"price"`
	OriginalPrice *float64 `json:"original_price"`
	Unit          string   `json:"unit"`
	MinBuy        float64  `json:"min_buy"`
	StepBuy       float64  `json:"step_buy"`
	Stock         int      `json:"stock"`
	Sales         uint64   `json:"sales"`
	Status        int      `json:"status"`
	IsRecommend   int      `json:"is_recommend"`
	OriginPlace   string   `json:"origin_place"`
	ShelfLife     string   `json:"shelf_life"`
	StorageMethod string   `json:"storage_method"`
	SortOrder     int      `json:"sort_order"`
}

type BuyerProductItem struct {
	ID            uint64      `json:"id"`
	ShopID        uint64      `json:"shop_id"`
	CategoryID    uint64      `json:"category_id"`
	Name          string      `json:"name"`
	Subtitle      string      `json:"subtitle"`
	CoverImage    string      `json:"cover_image"`
	Price         float64     `json:"price"`
	OriginalPrice *float64    `json:"original_price"`
	Unit          string      `json:"unit"`
	MinBuy        float64     `json:"min_buy"`
	StepBuy       float64     `json:"step_buy"`
	Stock         int         `json:"stock"`
	Status        int         `json:"status"`
	IsInvalid     bool        `json:"is_invalid"`
	CanBuy        bool        `json:"can_buy"`
	Shop          BuyerShopVO `json:"shop"`
}

type BuyerProductDetail struct {
	ID            uint64      `json:"id"`
	ShopID        uint64      `json:"shop_id"`
	CategoryID    uint64      `json:"category_id"`
	Name          string      `json:"name"`
	Subtitle      string      `json:"subtitle"`
	CoverImage    string      `json:"cover_image"`
	Images        []string    `json:"images"`
	Description   string      `json:"description"`
	Price         float64     `json:"price"`
	OriginalPrice *float64    `json:"original_price"`
	Unit          string      `json:"unit"`
	MinBuy        float64     `json:"min_buy"`
	StepBuy       float64     `json:"step_buy"`
	Stock         int         `json:"stock"`
	Status        int         `json:"status"`
	IsInvalid     bool        `json:"is_invalid"`
	CanBuy        bool        `json:"can_buy"`
	OriginPlace   string      `json:"origin_place"`
	ShelfLife     string      `json:"shelf_life"`
	StorageMethod string      `json:"storage_method"`
	Shop          BuyerShopVO `json:"shop"`
}

type BuyerShopVO struct {
	ID           uint64  `json:"id"`
	ShopName     string  `json:"shop_name"`
	Logo         string  `json:"logo"`
	Description  string  `json:"description"`
	ContactPhone string  `json:"contact_phone"`
	Province     string  `json:"province"`
	City         string  `json:"city"`
	District     string  `json:"district"`
	Address      string  `json:"address"`
	Rating       float64 `json:"rating"`
	TotalSales   uint64  `json:"total_sales"`
}

type BuyerShopHomepage struct {
	Shop       BuyerShopVO        `json:"shop"`
	Products   []BuyerProductItem `json:"products"`
	Pagination Pagination         `json:"pagination"`
}

type Pagination struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total"`
}

func NewProductService(
	productRepo *repository.ProductRepository,
	categoryRepo *repository.CategoryRepository,
	shopRepo *repository.ShopRepository,
) *ProductService {
	return &ProductService{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
		shopRepo:     shopRepo,
	}
}

func (s *ProductService) ListBySeller(
	ctx context.Context,
	sellerUserID int64,
	status *int,
	page int,
	pageSize int,
) ([]ProductListItem, int64, error) {
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return nil, 0, err
	}
	if shopID == 0 {
		return nil, 0, ErrSellerShopNotFound
	}
	products, total, err := s.productRepo.ListByShop(ctx, shopID, status, page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	result := make([]ProductListItem, 0, len(products))
	for _, p := range products {
		result = append(result, mapProductListItem(p))
	}
	return result, total, nil
}

func (s *ProductService) AdminList(
	ctx context.Context,
	query AdminProductListQuery,
) ([]AdminProductListItem, int64, error) {
	page := query.Page
	if page <= 0 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	products, total, err := s.productRepo.ListForAdmin(ctx, repository.AdminProductQuery{
		Status:   query.Status,
		ShopID:   query.ShopID,
		Keyword:  query.Keyword,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]AdminProductListItem, 0, len(products))
	for _, p := range products {
		images := make([]string, 0)
		_ = json.Unmarshal([]byte(p.Images), &images)
		out = append(out, AdminProductListItem{
			ID:            p.ID,
			ShopID:        p.ShopID,
			CategoryID:    p.CategoryID,
			Name:          p.Name,
			Subtitle:      p.Subtitle,
			CoverImage:    p.CoverImage,
			Images:        images,
			Description:   p.Description,
			Price:         p.Price,
			OriginalPrice: p.OriginalPrice,
			Unit:          p.Unit,
			MinBuy:        p.MinBuy,
			StepBuy:       p.StepBuy,
			Stock:         p.Stock,
			Sales:         p.Sales,
			Status:        p.Status,
			IsRecommend:   p.IsRecommend,
			OriginPlace:   p.OriginPlace,
			ShelfLife:     p.ShelfLife,
			StorageMethod: p.StorageMethod,
			SortOrder:     p.SortOrder,
		})
	}
	return out, total, nil
}

func (s *ProductService) AdminAudit(ctx context.Context, productID uint64, auditStatus int) error {
	if productID == 0 {
		return ErrProductNotFound
	}
	if auditStatus != 1 && auditStatus != 2 {
		return ErrProductInvalidAudit
	}
	product, err := s.productRepo.FindByID(ctx, productID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	if product.Status != productStatusPending {
		return ErrProductNotAllowed
	}
	nextStatus := productStatusOffShelf
	if auditStatus == 1 && product.Stock > 0 {
		nextStatus = productStatusOnShelf
	}
	return s.productRepo.UpdateByID(ctx, productID, map[string]interface{}{
		"status": nextStatus,
	})
}

func (s *ProductService) AdminUpdateStatus(ctx context.Context, productID uint64, status int) error {
	if status != productStatusOffShelf && status != productStatusOnShelf {
		return ErrProductNotAllowed
	}
	product, err := s.productRepo.FindByID(ctx, productID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	if status == productStatusOnShelf && product.Stock <= 0 {
		return ErrProductNotAllowed
	}
	return s.productRepo.UpdateByID(ctx, productID, map[string]interface{}{
		"status": status,
	})
}

func (s *ProductService) AdminUpdateRecommend(ctx context.Context, productID uint64, isRecommend int) error {
	if isRecommend != 0 && isRecommend != 1 {
		return ErrProductInvalidRecommend
	}
	if _, err := s.productRepo.FindByID(ctx, productID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	return s.productRepo.UpdateByID(ctx, productID, map[string]interface{}{
		"is_recommend": isRecommend,
	})
}

func (s *ProductService) ListForBuyer(
	ctx context.Context,
	query BuyerProductQuery,
) ([]BuyerProductItem, int64, error) {
	products, total, err := s.productRepo.ListForBuyer(ctx, repository.BuyerProductQuery{
		CategoryID: query.CategoryID,
		ShopID:     query.ShopID,
		Keyword:    query.Keyword,
		SortBy:     query.SortBy,
		MinPrice:   query.MinPrice,
		MaxPrice:   query.MaxPrice,
		Page:       query.Page,
		PageSize:   query.PageSize,
	})
	if err != nil {
		return nil, 0, err
	}
	shopMap, err := s.loadShopMap(ctx, products)
	if err != nil {
		return nil, 0, err
	}

	items := make([]BuyerProductItem, 0, len(products))
	for _, product := range products {
		shop, ok := shopMap[product.ShopID]
		if !ok {
			continue
		}
		items = append(items, mapBuyerProductItem(product, shop))
	}
	return items, total, nil
}

func (s *ProductService) SearchForBuyer(
	ctx context.Context,
	query BuyerProductQuery,
) ([]BuyerProductItem, int64, error) {
	return s.ListForBuyer(ctx, query)
}

func (s *ProductService) GetDetailForBuyer(ctx context.Context, productID uint64) (*BuyerProductDetail, error) {
	product, err := s.productRepo.FindVisibleByID(ctx, productID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	shop, err := s.shopRepo.FindPublicByID(ctx, product.ShopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return mapBuyerProductDetail(*product, *shop), nil
}

func (s *ProductService) GetShopHomepage(
	ctx context.Context,
	shopID uint64,
	page int,
	pageSize int,
) (*BuyerShopHomepage, error) {
	shop, err := s.shopRepo.FindPublicByID(ctx, shopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	products, total, err := s.productRepo.ListForBuyer(ctx, repository.BuyerProductQuery{
		ShopID:   &shopID,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}
	items := make([]BuyerProductItem, 0, len(products))
	for _, product := range products {
		items = append(items, mapBuyerProductItem(product, *shop))
	}
	return &BuyerShopHomepage{
		Shop:       mapBuyerShopVO(*shop),
		Products:   items,
		Pagination: Pagination{Page: page, PageSize: pageSize, Total: int(total)},
	}, nil
}

func (s *ProductService) BatchUpdatePrice(
	ctx context.Context,
	sellerUserID int64,
	inputs []BatchPriceInput,
) error {
	if len(inputs) == 0 {
		return ErrBatchPriceEmpty
	}
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return err
	}
	if shopID == 0 {
		return ErrSellerShopNotFound
	}

	return s.productRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		for _, input := range inputs {
			if input.ID == 0 || input.Price <= 0 {
				return ErrProductNotAllowed
			}
			product, err := s.productRepo.FindByIDAndShopIDForUpdate(ctx, tx, input.ID, shopID)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrProductNotFound
				}
				return err
			}
			if err := s.productRepo.UpdateWithTx(ctx, tx, product.ID, shopID, map[string]interface{}{
				"price":      input.Price,
				"updated_at": gorm.Expr("NOW()"),
			}); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *ProductService) AdjustStock(
	ctx context.Context,
	sellerUserID int64,
	productID uint64,
	stockDelta int,
) error {
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return err
	}
	if shopID == 0 {
		return ErrSellerShopNotFound
	}

	return s.productRepo.WithinTransaction(ctx, func(tx *gorm.DB) error {
		product, err := s.productRepo.FindByIDAndShopIDForUpdate(ctx, tx, productID, shopID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrProductNotFound
			}
			return err
		}

		nextStock := product.Stock + stockDelta
		if nextStock < 0 {
			return ErrProductStockNotEnough
		}

		updates := map[string]interface{}{
			"stock":      nextStock,
			"updated_at": gorm.Expr("NOW()"),
		}
		if nextStock == 0 && product.Status == productStatusOnShelf {
			updates["status"] = productStatusOffShelf
		}
		return s.productRepo.UpdateWithTx(ctx, tx, product.ID, shopID, updates)
	})
}

func (s *ProductService) Create(ctx context.Context, sellerUserID int64, input SaveProductInput) (*model.Product, error) {
	if err := validateProductInput(input); err != nil {
		return nil, err
	}
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return nil, err
	}
	if shopID == 0 {
		return nil, ErrSellerShopNotFound
	}
	if _, err := s.categoryRepo.FindByID(ctx, input.CategoryID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotAllowed
		}
		return nil, err
	}

	imagesJSON, err := marshalImages(input.Images)
	if err != nil {
		return nil, err
	}
	product := &model.Product{
		ShopID:        shopID,
		CategoryID:    input.CategoryID,
		Name:          strings.TrimSpace(input.Name),
		Subtitle:      strings.TrimSpace(input.Subtitle),
		CoverImage:    strings.TrimSpace(input.CoverImage),
		Images:        imagesJSON,
		Description:   strings.TrimSpace(input.Description),
		Price:         input.Price,
		OriginalPrice: input.OriginalPrice,
		Unit:          normalizeUnit(input.Unit),
		MinBuy:        normalizeMinBuy(input.MinBuy),
		StepBuy:       normalizeStepBuy(input.StepBuy),
		Stock:         normalizeStock(input.Stock),
		Status:        productStatusPending,
		OriginPlace:   strings.TrimSpace(input.OriginPlace),
		ShelfLife:     strings.TrimSpace(input.ShelfLife),
		StorageMethod: strings.TrimSpace(input.StorageMethod),
		SortOrder:     input.SortOrder,
	}
	if err := s.productRepo.Create(ctx, product); err != nil {
		return nil, err
	}
	return product, nil
}

func (s *ProductService) Update(ctx context.Context, sellerUserID int64, productID uint64, input SaveProductInput) error {
	if err := validateProductInput(input); err != nil {
		return err
	}
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return err
	}
	if shopID == 0 {
		return ErrSellerShopNotFound
	}
	product, err := s.productRepo.FindByIDAndShopID(ctx, productID, shopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}

	if _, err := s.categoryRepo.FindByID(ctx, input.CategoryID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotAllowed
		}
		return err
	}

	imagesJSON, err := marshalImages(input.Images)
	if err != nil {
		return err
	}

	nextStatus := product.Status
	if product.Status == productStatusOnShelf {
		nextStatus = productStatusPending
	}
	return s.productRepo.Update(ctx, product.ID, shopID, map[string]interface{}{
		"category_id":    input.CategoryID,
		"name":           strings.TrimSpace(input.Name),
		"subtitle":       strings.TrimSpace(input.Subtitle),
		"cover_image":    strings.TrimSpace(input.CoverImage),
		"images":         imagesJSON,
		"description":    strings.TrimSpace(input.Description),
		"price":          input.Price,
		"original_price": input.OriginalPrice,
		"unit":           normalizeUnit(input.Unit),
		"min_buy":        normalizeMinBuy(input.MinBuy),
		"step_buy":       normalizeStepBuy(input.StepBuy),
		"stock":          normalizeStock(input.Stock),
		"status":         nextStatus,
		"origin_place":   strings.TrimSpace(input.OriginPlace),
		"shelf_life":     strings.TrimSpace(input.ShelfLife),
		"storage_method": strings.TrimSpace(input.StorageMethod),
		"sort_order":     input.SortOrder,
		"updated_at":     gorm.Expr("NOW()"),
	})
}

func (s *ProductService) UpdateStatus(
	ctx context.Context,
	sellerUserID int64,
	productID uint64,
	status int,
) error {
	if status != productStatusOffShelf && status != productStatusOnShelf {
		return ErrProductNotAllowed
	}
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return err
	}
	if shopID == 0 {
		return ErrSellerShopNotFound
	}
	product, err := s.productRepo.FindByIDAndShopID(ctx, productID, shopID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	if product.Status == productStatusPending && status == productStatusOnShelf {
		return ErrProductNotAllowed
	}
	if product.Stock <= 0 && status == productStatusOnShelf {
		return ErrProductNotAllowed
	}
	return s.productRepo.Update(ctx, product.ID, shopID, map[string]interface{}{
		"status": status,
	})
}

func (s *ProductService) Delete(ctx context.Context, sellerUserID int64, productID uint64) error {
	shopID, err := s.shopRepo.FindIDByOwnerUserID(ctx, sellerUserID)
	if err != nil {
		return err
	}
	if shopID == 0 {
		return ErrSellerShopNotFound
	}
	if _, err := s.productRepo.FindByIDAndShopID(ctx, productID, shopID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	return s.productRepo.SoftDelete(ctx, productID, shopID)
}

func validateProductInput(input SaveProductInput) error {
	if strings.TrimSpace(input.Name) == "" {
		return ErrProductNameRequired
	}
	if strings.TrimSpace(input.CoverImage) == "" {
		return ErrProductCoverRequired
	}
	if err := validateProductImageRef(input.CoverImage); err != nil {
		return err
	}
	if len(input.Images) > 9 {
		return ErrProductImagesTooMany
	}
	for _, img := range input.Images {
		if strings.TrimSpace(img) == "" {
			return ErrProductImageRefInvalid
		}
		if err := validateProductImageRef(img); err != nil {
			return err
		}
	}
	return nil
}

// validateProductImageRef 允许：本地上传返回的以 / 开头的路径（如 /uploads/xxx），或公网 http(s)（含 OSS/CDN 外链）。
func validateProductImageRef(raw string) error {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ErrProductImageRefInvalid
	}
	if len(s) > 500 {
		return ErrProductImageRefInvalid
	}
	ls := strings.ToLower(s)
	if strings.HasPrefix(ls, "https://") || strings.HasPrefix(ls, "http://") {
		return nil
	}
	if strings.HasPrefix(s, "/") && !strings.HasPrefix(s, "//") {
		return nil
	}
	return ErrProductImageRefInvalid
}

func marshalImages(images []string) (string, error) {
	if len(images) == 0 {
		return "[]", nil
	}
	for i := range images {
		images[i] = strings.TrimSpace(images[i])
	}
	b, err := json.Marshal(images)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func mapProductListItem(p model.Product) ProductListItem {
	images := make([]string, 0)
	_ = json.Unmarshal([]byte(p.Images), &images)
	return ProductListItem{
		ID:            p.ID,
		ShopID:        p.ShopID,
		CategoryID:    p.CategoryID,
		Name:          p.Name,
		Subtitle:      p.Subtitle,
		CoverImage:    p.CoverImage,
		Images:        images,
		Description:   p.Description,
		Price:         p.Price,
		OriginalPrice: p.OriginalPrice,
		Unit:          p.Unit,
		MinBuy:        p.MinBuy,
		StepBuy:       p.StepBuy,
		Stock:         p.Stock,
		Status:        p.Status,
		IsRecommend:   p.IsRecommend,
		OriginPlace:   p.OriginPlace,
		ShelfLife:     p.ShelfLife,
		StorageMethod: p.StorageMethod,
		SortOrder:     p.SortOrder,
	}
}

func mapBuyerProductItem(p model.Product, shop repository.ShopPublic) BuyerProductItem {
	isInvalid := p.Stock <= 0
	return BuyerProductItem{
		ID:            p.ID,
		ShopID:        p.ShopID,
		CategoryID:    p.CategoryID,
		Name:          p.Name,
		Subtitle:      p.Subtitle,
		CoverImage:    p.CoverImage,
		Price:         p.Price,
		OriginalPrice: p.OriginalPrice,
		Unit:          p.Unit,
		MinBuy:        p.MinBuy,
		StepBuy:       p.StepBuy,
		Stock:         p.Stock,
		Status:        p.Status,
		IsInvalid:     isInvalid,
		CanBuy:        !isInvalid,
		Shop:          mapBuyerShopVO(shop),
	}
}

func mapBuyerProductDetail(p model.Product, shop repository.ShopPublic) *BuyerProductDetail {
	images := make([]string, 0)
	_ = json.Unmarshal([]byte(p.Images), &images)
	isInvalid := p.Stock <= 0
	return &BuyerProductDetail{
		ID:            p.ID,
		ShopID:        p.ShopID,
		CategoryID:    p.CategoryID,
		Name:          p.Name,
		Subtitle:      p.Subtitle,
		CoverImage:    p.CoverImage,
		Images:        images,
		Description:   p.Description,
		Price:         p.Price,
		OriginalPrice: p.OriginalPrice,
		Unit:          p.Unit,
		MinBuy:        p.MinBuy,
		StepBuy:       p.StepBuy,
		Stock:         p.Stock,
		Status:        p.Status,
		IsInvalid:     isInvalid,
		CanBuy:        !isInvalid,
		OriginPlace:   p.OriginPlace,
		ShelfLife:     p.ShelfLife,
		StorageMethod: p.StorageMethod,
		Shop:          mapBuyerShopVO(shop),
	}
}

func mapBuyerShopVO(shop repository.ShopPublic) BuyerShopVO {
	return BuyerShopVO{
		ID:           shop.ID,
		ShopName:     shop.ShopName,
		Logo:         shop.Logo,
		Description:  shop.Description,
		ContactPhone: shop.ContactPhone,
		Province:     shop.Province,
		City:         shop.City,
		District:     shop.District,
		Address:      shop.Address,
		Rating:       shop.Rating,
		TotalSales:   shop.TotalSales,
	}
}

func (s *ProductService) loadShopMap(
	ctx context.Context,
	products []model.Product,
) (map[uint64]repository.ShopPublic, error) {
	ids := make([]uint64, 0, len(products))
	seen := make(map[uint64]struct{})
	for _, product := range products {
		if _, exists := seen[product.ShopID]; exists {
			continue
		}
		seen[product.ShopID] = struct{}{}
		ids = append(ids, product.ShopID)
	}
	shops, err := s.shopRepo.ListPublicByIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	result := make(map[uint64]repository.ShopPublic, len(shops))
	for _, shop := range shops {
		result[shop.ID] = shop
	}
	return result, nil
}

func normalizeUnit(unit string) string {
	trimmed := strings.TrimSpace(unit)
	if trimmed == "" {
		return "斤"
	}
	return trimmed
}

func normalizeMinBuy(minBuy float64) float64 {
	if minBuy <= 0 {
		return 1
	}
	return minBuy
}

func normalizeStepBuy(stepBuy float64) float64 {
	if stepBuy <= 0 {
		return 0.5
	}
	return stepBuy
}

func normalizeStock(stock int) int {
	if stock < 0 {
		return 0
	}
	return stock
}
