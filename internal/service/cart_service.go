package service

import (
	"context"
	"errors"
	"math"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

const maxCartItemCount = 100

var (
	ErrCartItemNotFound = errors.New("cart item not found")
	ErrCartItemLimit    = errors.New("cart item count exceeds limit 100")
	ErrCartInvalidInput = errors.New("invalid cart params")
	ErrCartStepInvalid  = errors.New("quantity does not match step rule")
)

type CartService struct {
	cartRepo    *repository.CartRepository
	productRepo *repository.ProductRepository
	shopRepo    *repository.ShopRepository
}

type AddCartItemInput struct {
	ProductID uint64  `json:"product_id"`
	SKUID     *uint64 `json:"sku_id"`
	Quantity  float64 `json:"quantity"`
}

type CartItemView struct {
	ID        uint64      `json:"id"`
	ProductID uint64      `json:"product_id"`
	SKUID     *uint64     `json:"sku_id"`
	Quantity  float64     `json:"quantity"`
	Selected  int         `json:"selected"`
	IsInvalid bool        `json:"is_invalid"`
	Product   ProductLite `json:"product"`
}

type ProductLite struct {
	ID         uint64  `json:"id"`
	Name       string  `json:"name"`
	CoverImage string  `json:"cover_image"`
	Price      float64 `json:"price"`
	Unit       string  `json:"unit"`
	Stock      int     `json:"stock"`
	Status     int     `json:"status"`
}

type CartShopGroup struct {
	ShopID uint64         `json:"shop_id"`
	Shop   BuyerShopVO    `json:"shop"`
	Items  []CartItemView `json:"items"`
}

func NewCartService(
	cartRepo *repository.CartRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
) *CartService {
	return &CartService{
		cartRepo:    cartRepo,
		productRepo: productRepo,
		shopRepo:    shopRepo,
	}
}

func (s *CartService) List(ctx context.Context, userID int64) ([]CartShopGroup, error) {
	items, err := s.cartRepo.ListByUserID(ctx, uint64(userID))
	if err != nil {
		return nil, err
	}
	productsMap, shopsMap, err := s.loadCartRefMaps(ctx, items)
	if err != nil {
		return nil, err
	}

	groupMap := make(map[uint64][]CartItemView)
	for _, item := range items {
		product, hasProduct := productsMap[item.ProductID]
		isInvalid := true
		productLite := ProductLite{}
		if hasProduct {
			productLite = ProductLite{
				ID:         product.ID,
				Name:       product.Name,
				CoverImage: product.CoverImage,
				Price:      product.Price,
				Unit:       product.Unit,
				Stock:      product.Stock,
				Status:     product.Status,
			}
			isInvalid = product.Status != 1 || product.Stock <= 0
		}
		groupMap[item.ShopID] = append(groupMap[item.ShopID], CartItemView{
			ID:        item.ID,
			ProductID: item.ProductID,
			SKUID:     item.SKUID,
			Quantity:  item.Quantity,
			Selected:  item.Selected,
			IsInvalid: isInvalid,
			Product:   productLite,
		})
	}

	result := make([]CartShopGroup, 0, len(groupMap))
	for shopID, groupItems := range groupMap {
		shopVO := BuyerShopVO{ID: shopID}
		if shop, ok := shopsMap[shopID]; ok {
			shopVO = mapBuyerShopVO(shop)
		}
		result = append(result, CartShopGroup{
			ShopID: shopID,
			Shop:   shopVO,
			Items:  groupItems,
		})
	}
	return result, nil
}

func (s *CartService) Add(ctx context.Context, userID int64, input AddCartItemInput) (*model.CartItem, error) {
	if input.ProductID == 0 || input.Quantity <= 0 {
		return nil, ErrCartInvalidInput
	}
	product, err := s.productRepo.FindByID(ctx, input.ProductID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	if err := validateCartQuantity(input.Quantity, *product); err != nil {
		return nil, err
	}
	if _, err := s.shopRepo.FindPublicByID(ctx, product.ShopID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSellerShopNotFound
		}
		return nil, err
	}
	userIDUint := uint64(userID)
	exists, err := s.cartRepo.FindByUserProductSKU(ctx, userIDUint, input.ProductID, input.SKUID)
	if err == nil {
		nextQuantity := exists.Quantity + input.Quantity
		if err := validateCartQuantity(nextQuantity, *product); err != nil {
			return nil, err
		}
		err = s.cartRepo.UpdateByIDAndUserID(ctx, exists.ID, userIDUint, map[string]interface{}{
			"quantity": nextQuantity,
		})
		if err != nil {
			return nil, err
		}
		exists.Quantity = nextQuantity
		return exists, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	count, err := s.cartRepo.CountByUserID(ctx, userIDUint)
	if err != nil {
		return nil, err
	}
	if count >= maxCartItemCount {
		return nil, ErrCartItemLimit
	}

	item := &model.CartItem{
		UserID:    userIDUint,
		ShopID:    product.ShopID,
		ProductID: input.ProductID,
		SKUID:     input.SKUID,
		Quantity:  input.Quantity,
		Selected:  1,
	}
	if err := s.cartRepo.Create(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (s *CartService) UpdateQuantity(ctx context.Context, userID int64, cartID uint64, quantity float64) error {
	if cartID == 0 || quantity <= 0 {
		return ErrCartInvalidInput
	}
	userIDUint := uint64(userID)
	item, err := s.cartRepo.FindByIDAndUserID(ctx, cartID, userIDUint)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCartItemNotFound
		}
		return err
	}
	product, err := s.productRepo.FindByID(ctx, item.ProductID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return err
	}
	if err := validateCartQuantity(quantity, *product); err != nil {
		return err
	}
	return s.cartRepo.UpdateByIDAndUserID(ctx, cartID, userIDUint, map[string]interface{}{
		"quantity": quantity,
	})
}

func (s *CartService) Delete(ctx context.Context, userID int64, cartID uint64) error {
	if cartID == 0 {
		return ErrCartInvalidInput
	}
	userIDUint := uint64(userID)
	if _, err := s.cartRepo.FindByIDAndUserID(ctx, cartID, userIDUint); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCartItemNotFound
		}
		return err
	}
	return s.cartRepo.SoftDeleteByIDAndUserID(ctx, cartID, userIDUint)
}

func (s *CartService) DeleteBatch(ctx context.Context, userID int64, ids []uint64) error {
	if len(ids) == 0 {
		return ErrCartInvalidInput
	}
	return s.cartRepo.SoftDeleteBatchByIDs(ctx, uint64(userID), ids)
}

func (s *CartService) SetSelectAll(ctx context.Context, userID int64, selected int) error {
	if selected != 0 && selected != 1 {
		return ErrCartInvalidInput
	}
	return s.cartRepo.SetSelectedForAll(ctx, uint64(userID), selected)
}

func (s *CartService) ClearInvalid(ctx context.Context, userID int64) (int, error) {
	items, err := s.cartRepo.ListByUserID(ctx, uint64(userID))
	if err != nil {
		return 0, err
	}
	productsMap, _, err := s.loadCartRefMaps(ctx, items)
	if err != nil {
		return 0, err
	}
	invalidIDs := make([]uint64, 0)
	for _, item := range items {
		product, ok := productsMap[item.ProductID]
		if !ok || product.Status != 1 || product.Stock <= 0 {
			invalidIDs = append(invalidIDs, item.ID)
		}
	}
	if err := s.cartRepo.SoftDeleteBatchByIDs(ctx, uint64(userID), invalidIDs); err != nil {
		return 0, err
	}
	return len(invalidIDs), nil
}

func (s *CartService) loadCartRefMaps(
	ctx context.Context,
	items []model.CartItem,
) (map[uint64]model.Product, map[uint64]repository.ShopPublic, error) {
	productIDs := make([]uint64, 0, len(items))
	shopIDs := make([]uint64, 0, len(items))
	seenProduct := make(map[uint64]struct{})
	seenShop := make(map[uint64]struct{})
	for _, item := range items {
		if _, ok := seenProduct[item.ProductID]; !ok {
			seenProduct[item.ProductID] = struct{}{}
			productIDs = append(productIDs, item.ProductID)
		}
		if _, ok := seenShop[item.ShopID]; !ok {
			seenShop[item.ShopID] = struct{}{}
			shopIDs = append(shopIDs, item.ShopID)
		}
	}

	products, err := s.productRepo.FindByIDs(ctx, productIDs)
	if err != nil {
		return nil, nil, err
	}
	shops, err := s.shopRepo.ListPublicByIDs(ctx, shopIDs)
	if err != nil {
		return nil, nil, err
	}
	productsMap := make(map[uint64]model.Product, len(products))
	for _, product := range products {
		productsMap[product.ID] = product
	}
	shopsMap := make(map[uint64]repository.ShopPublic, len(shops))
	for _, shop := range shops {
		shopsMap[shop.ID] = shop
	}
	return productsMap, shopsMap, nil
}

func validateCartQuantity(quantity float64, product model.Product) error {
	if product.Status != 1 || product.Stock <= 0 {
		return ErrProductNotFound
	}
	if quantity > float64(product.Stock) {
		return ErrProductStockNotEnough
	}
	minBuy := product.MinBuy
	if minBuy <= 0 {
		minBuy = 1
	}
	if quantity < minBuy {
		return ErrCartInvalidInput
	}
	stepBuy := product.StepBuy
	if stepBuy <= 0 {
		return nil
	}
	steps := (quantity - minBuy) / stepBuy
	if steps < -1e-9 {
		return ErrCartStepInvalid
	}
	if math.Abs(steps-math.Round(steps)) > 1e-6 {
		return ErrCartStepInvalid
	}
	return nil
}
