package service

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"freshmart/internal/model"
	"freshmart/internal/repository"
)

const (
	defaultDeliveryBaseFee       = 5.0
	defaultDeliveryFreeThreshold = 50.0
)

type OrderConfirmService struct {
	cartRepo    *repository.CartRepository
	productRepo *repository.ProductRepository
	shopRepo    *repository.ShopRepository
	addressRepo *repository.AddressRepository
	configRepo  *repository.SystemConfigRepository
}

type OrderConfirmInput struct {
	AddressID    uint64             `json:"address_id"`
	DeliveryType int                `json:"delivery_type"`
	CartItemIDs  []uint64           `json:"cart_item_ids"`
	Items        []OrderConfirmItem `json:"items"`
	BuyerRemark  string             `json:"buyer_remark"`
}

type OrderConfirmItem struct {
	ProductID uint64  `json:"product_id"`
	Quantity  float64 `json:"quantity"`
}

type OrderConfirmResponse struct {
	Address        model.UserAddress       `json:"address"`
	Groups         []OrderConfirmShopGroup `json:"groups"`
	TotalPayAmount string                  `json:"total_pay_amount"`
}

type OrderConfirmShopGroup struct {
	ShopID        uint64                 `json:"shop_id"`
	ShopName      string                 `json:"shop_name"`
	Items         []OrderConfirmLineItem `json:"items"`
	TotalAmount   string                 `json:"total_amount"`
	FreightAmount string                 `json:"freight_amount"`
	PayAmount     string                 `json:"pay_amount"`
}

type OrderConfirmLineItem struct {
	ProductID uint64 `json:"product_id"`
	Name      string `json:"name"`
	Price     string `json:"price"`
	Quantity  string `json:"quantity"`
	Subtotal  string `json:"subtotal"`
}

func NewOrderConfirmService(
	cartRepo *repository.CartRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
	addressRepo *repository.AddressRepository,
	configRepo *repository.SystemConfigRepository,
) *OrderConfirmService {
	return &OrderConfirmService{
		cartRepo:    cartRepo,
		productRepo: productRepo,
		shopRepo:    shopRepo,
		addressRepo: addressRepo,
		configRepo:  configRepo,
	}
}

func (s *OrderConfirmService) Confirm(
	ctx context.Context,
	userID int64,
	input OrderConfirmInput,
) (*OrderConfirmResponse, error) {
	if input.AddressID == 0 || (len(input.CartItemIDs) == 0 && len(input.Items) == 0) {
		return nil, ErrCartInvalidInput
	}
	address, err := s.addressRepo.FindByIDAndUserID(ctx, input.AddressID, uint64(userID))
	if err != nil {
		return nil, ErrAddressNotFound
	}

	shopGroups, err := s.buildGroups(ctx, uint64(userID), input)
	if err != nil {
		return nil, err
	}
	baseFee, freeThreshold := s.loadDeliveryConfig(ctx)
	totalPay := 0.0
	groups := make([]OrderConfirmShopGroup, 0, len(shopGroups))
	for shopID, lines := range shopGroups {
		shop, err := s.shopRepo.FindPublicByID(ctx, shopID)
		if err != nil {
			return nil, ErrSellerShopNotFound
		}
		totalAmount := 0.0
		items := make([]OrderConfirmLineItem, 0, len(lines))
		for _, line := range lines {
			subtotal := line.Price * line.Quantity
			totalAmount += subtotal
			items = append(items, OrderConfirmLineItem{
				ProductID: line.ProductID,
				Name:      line.Name,
				Price:     money(line.Price),
				Quantity:  qty(line.Quantity),
				Subtotal:  money(subtotal),
			})
		}
		freightAmount := 0.0
		if totalAmount < freeThreshold {
			freightAmount = baseFee
		}
		payAmount := totalAmount + freightAmount
		totalPay += payAmount
		groups = append(groups, OrderConfirmShopGroup{
			ShopID:        shop.ID,
			ShopName:      shop.ShopName,
			Items:         items,
			TotalAmount:   money(totalAmount),
			FreightAmount: money(freightAmount),
			PayAmount:     money(payAmount),
		})
	}

	return &OrderConfirmResponse{
		Address:        *address,
		Groups:         groups,
		TotalPayAmount: money(totalPay),
	}, nil
}

type confirmProductLine struct {
	ProductID uint64
	ShopID    uint64
	Name      string
	Price     float64
	Quantity  float64
}

func (s *OrderConfirmService) buildGroups(
	ctx context.Context,
	userID uint64,
	input OrderConfirmInput,
) (map[uint64][]confirmProductLine, error) {
	lines := make([]confirmProductLine, 0)
	if len(input.CartItemIDs) > 0 {
		cartItems, err := s.cartRepo.ListByIDsAndUserID(ctx, userID, input.CartItemIDs)
		if err != nil {
			return nil, err
		}
		if len(cartItems) != len(input.CartItemIDs) {
			return nil, ErrCartInvalidInput
		}
		productIDs := make([]uint64, 0, len(cartItems))
		for _, item := range cartItems {
			productIDs = append(productIDs, item.ProductID)
		}
		productMap, err := s.loadProductMap(ctx, productIDs)
		if err != nil {
			return nil, err
		}
		for _, item := range cartItems {
			product, ok := productMap[item.ProductID]
			if !ok {
				return nil, ErrProductNotFound
			}
			if err := validateCartQuantity(item.Quantity, product); err != nil {
				return nil, err
			}
			lines = append(lines, confirmProductLine{
				ProductID: product.ID,
				ShopID:    product.ShopID,
				Name:      product.Name,
				Price:     product.Price,
				Quantity:  item.Quantity,
			})
		}
	}
	if len(input.Items) > 0 {
		productIDs := make([]uint64, 0, len(input.Items))
		for _, item := range input.Items {
			productIDs = append(productIDs, item.ProductID)
		}
		productMap, err := s.loadProductMap(ctx, productIDs)
		if err != nil {
			return nil, err
		}
		for _, item := range input.Items {
			product, ok := productMap[item.ProductID]
			if !ok {
				return nil, ErrProductNotFound
			}
			if err := validateCartQuantity(item.Quantity, product); err != nil {
				return nil, err
			}
			lines = append(lines, confirmProductLine{
				ProductID: product.ID,
				ShopID:    product.ShopID,
				Name:      product.Name,
				Price:     product.Price,
				Quantity:  item.Quantity,
			})
		}
	}

	group := make(map[uint64][]confirmProductLine)
	for _, line := range lines {
		group[line.ShopID] = append(group[line.ShopID], line)
	}
	return group, nil
}

func (s *OrderConfirmService) loadProductMap(ctx context.Context, productIDs []uint64) (map[uint64]model.Product, error) {
	products, err := s.productRepo.FindByIDs(ctx, productIDs)
	if err != nil {
		return nil, err
	}
	result := make(map[uint64]model.Product, len(products))
	for _, product := range products {
		result[product.ID] = product
	}
	return result, nil
}

func (s *OrderConfirmService) loadDeliveryConfig(ctx context.Context) (float64, float64) {
	baseFee := defaultDeliveryBaseFee
	freeThreshold := defaultDeliveryFreeThreshold

	if raw, err := s.configRepo.GetValueByKey(ctx, "delivery_base_fee"); err == nil && strings.TrimSpace(raw) != "" {
		if parsed, parseErr := strconv.ParseFloat(raw, 64); parseErr == nil && parsed >= 0 {
			baseFee = parsed
		}
	}
	if raw, err := s.configRepo.GetValueByKey(ctx, "delivery_free_threshold"); err == nil && strings.TrimSpace(raw) != "" {
		if parsed, parseErr := strconv.ParseFloat(raw, 64); parseErr == nil && parsed >= 0 {
			freeThreshold = parsed
		}
	}
	return baseFee, freeThreshold
}

func money(value float64) string {
	return fmt.Sprintf("%.2f", value)
}

func qty(value float64) string {
	return fmt.Sprintf("%.2f", value)
}
