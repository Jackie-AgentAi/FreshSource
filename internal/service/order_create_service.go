package service

import (
	"context"
	"errors"
	"sort"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"freshmart/internal/model"
	"freshmart/internal/pkg/orderno"
	"freshmart/internal/repository"
)

const orderLogFromCreated int8 = -1

const maxOrderNoAttempts = 16

// ErrOrderNoExhausted 订单号在多次重试后仍与 uk_order_no 冲突（极低概率）。
var ErrOrderNoExhausted = errors.New("order number collision after retries")

type OrderCreateService struct {
	txManager      *repository.TxManager
	cartRepo       *repository.CartRepository
	productRepo    *repository.ProductRepository
	shopRepo       *repository.ShopRepository
	addressRepo    *repository.AddressRepository
	configRepo     *repository.SystemConfigRepository
	orderRepo      *repository.OrderRepository
}

type OrderCreateInput struct {
	AddressID    uint64             `json:"address_id"`
	DeliveryType int                `json:"delivery_type"`
	CartItemIDs  []uint64           `json:"cart_item_ids"`
	Items        []OrderConfirmItem `json:"items"`
	BuyerRemark  string             `json:"buyer_remark"`
}

type OrderCreateResponse struct {
	OrderIDs []uint64 `json:"order_ids"`
}

func NewOrderCreateService(
	txManager *repository.TxManager,
	cartRepo *repository.CartRepository,
	productRepo *repository.ProductRepository,
	shopRepo *repository.ShopRepository,
	addressRepo *repository.AddressRepository,
	configRepo *repository.SystemConfigRepository,
	orderRepo *repository.OrderRepository,
) *OrderCreateService {
	return &OrderCreateService{
		txManager:   txManager,
		cartRepo:    cartRepo,
		productRepo: productRepo,
		shopRepo:    shopRepo,
		addressRepo: addressRepo,
		configRepo:  configRepo,
		orderRepo:   orderRepo,
	}
}

func (s *OrderCreateService) CreateOrders(
	ctx context.Context,
	buyerUserID int64,
	input OrderCreateInput,
) (*OrderCreateResponse, error) {
	if input.AddressID == 0 || (len(input.CartItemIDs) == 0 && len(input.Items) == 0) {
		return nil, ErrCartInvalidInput
	}
	address, err := s.addressRepo.FindByIDAndUserID(ctx, input.AddressID, uint64(buyerUserID))
	if err != nil {
		return nil, ErrAddressNotFound
	}

	deliveryType := input.DeliveryType
	if deliveryType == 0 {
		deliveryType = 1
	}

	merged, err := s.buildMergedLines(ctx, uint64(buyerUserID), input)
	if err != nil {
		return nil, err
	}
	if len(merged) == 0 {
		return nil, ErrCartInvalidInput
	}

	shopIDs := make([]uint64, 0, len(merged))
	for sid := range merged {
		shopIDs = append(shopIDs, sid)
	}
	sort.Slice(shopIDs, func(i, j int) bool { return shopIDs[i] < shopIDs[j] })

	baseFee, freeThreshold := s.loadDeliveryConfig(ctx)
	receiverAddr := strings.TrimSpace(address.Province + address.City + address.District + address.DetailAddress)
	remark := input.BuyerRemark
	if len(remark) > 255 {
		remark = remark[:255]
	}

	var orderIDs []uint64
	err = s.txManager.WithinTransaction(ctx, func(tx *gorm.DB) error {
		ids, errInner := s.createOrdersInTx(
			ctx, tx, uint64(buyerUserID), shopIDs, merged,
			address, receiverAddr, remark, deliveryType,
			baseFee, freeThreshold,
		)
		if errInner != nil {
			return errInner
		}
		orderIDs = ids

		if len(input.CartItemIDs) > 0 {
			if err := s.cartRepo.SoftDeleteBatchByIDsWithTx(ctx, tx, uint64(buyerUserID), input.CartItemIDs); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &OrderCreateResponse{OrderIDs: orderIDs}, nil
}

type mergedLine struct {
	ProductID uint64
	Quantity  float64
}

func (s *OrderCreateService) buildMergedLines(
	ctx context.Context,
	userID uint64,
	input OrderCreateInput,
) (map[uint64]map[uint64]mergedLine, error) {
	// shop_id -> product_id -> line（合并同店同品数量）
	out := make(map[uint64]map[uint64]mergedLine)

	add := func(shopID, productID uint64, qty float64) {
		if out[shopID] == nil {
			out[shopID] = make(map[uint64]mergedLine)
		}
		cur := out[shopID][productID]
		cur.ProductID = productID
		cur.Quantity += qty
		out[shopID][productID] = cur
	}

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
			p, ok := productMap[item.ProductID]
			if !ok {
				return nil, ErrProductNotFound
			}
			if err := validateCartQuantity(item.Quantity, p); err != nil {
				return nil, err
			}
			add(p.ShopID, p.ID, item.Quantity)
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
			p, ok := productMap[item.ProductID]
			if !ok {
				return nil, ErrProductNotFound
			}
			if err := validateCartQuantity(item.Quantity, p); err != nil {
				return nil, err
			}
			add(p.ShopID, p.ID, item.Quantity)
		}
	}
	return out, nil
}

func (s *OrderCreateService) loadProductMap(ctx context.Context, productIDs []uint64) (map[uint64]model.Product, error) {
	products, err := s.productRepo.FindByIDs(ctx, productIDs)
	if err != nil {
		return nil, err
	}
	m := make(map[uint64]model.Product, len(products))
	for _, p := range products {
		m[p.ID] = p
	}
	return m, nil
}

func (s *OrderCreateService) loadDeliveryConfig(ctx context.Context) (float64, float64) {
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

func (s *OrderCreateService) createOrdersInTx(
	ctx context.Context,
	tx *gorm.DB,
	buyerID uint64,
	shopIDs []uint64,
	merged map[uint64]map[uint64]mergedLine,
	address *model.UserAddress,
	receiverAddr string,
	buyerRemark string,
	deliveryType int,
	baseFee float64,
	freeThreshold float64,
) ([]uint64, error) {
	orderIDs := make([]uint64, 0, len(shopIDs))
	buyerIDPtr := buyerID
	roleBuyer := int8(1)

	for _, shopID := range shopIDs {
		shopRow, err := s.shopRepo.FindByIDForUpdate(ctx, tx, shopID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, ErrSellerShopNotFound
			}
			return nil, err
		}
		if shopRow.AuditStatus != 1 || shopRow.Status != 1 {
			return nil, ErrSellerShopNotFound
		}

		linesByProduct := merged[shopID]
		productIDs := make([]uint64, 0, len(linesByProduct))
		for pid := range linesByProduct {
			productIDs = append(productIDs, pid)
		}
		sort.Slice(productIDs, func(i, j int) bool { return productIDs[i] < productIDs[j] })

		type pricedLine struct {
			product model.Product
			qty     float64
		}
		priced := make([]pricedLine, 0, len(productIDs))
		totalAmount := 0.0

		for _, pid := range productIDs {
			line := linesByProduct[pid]
			product, err := s.productRepo.FindByIDAndShopIDForUpdate(ctx, tx, pid, shopID)
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					return nil, ErrProductNotFound
				}
				return nil, err
			}
			if err := validateCartQuantity(line.Quantity, *product); err != nil {
				return nil, err
			}
			ok, err := s.productRepo.DeductStockIfEnough(ctx, tx, pid, shopID, line.Quantity)
			if err != nil {
				return nil, err
			}
			if !ok {
				return nil, ErrProductStockNotEnough
			}
			subtotal := product.Price * line.Quantity
			totalAmount += subtotal
			priced = append(priced, pricedLine{product: *product, qty: line.Quantity})
		}

		freight := 0.0
		if totalAmount < freeThreshold {
			freight = baseFee
		}
		payAmount := totalAmount + freight

		order := model.Order{
			BuyerID:          buyerID,
			ShopID:           shopID,
			SellerID:         shopRow.UserID,
			TotalAmount:      totalAmount,
			FreightAmount:    freight,
			DiscountAmount:   0,
			PayAmount:        payAmount,
			ReceiverName:     address.ContactName,
			ReceiverPhone:    address.ContactPhone,
			ReceiverAddress:  receiverAddr,
			ReceiverLat:      address.Latitude,
			ReceiverLng:      address.Longitude,
			Status:           0,
			SettlementStatus: 0,
			DeliveryType:     deliveryType,
			BuyerRemark:      buyerRemark,
		}
		created := false
		for attempt := 0; attempt < maxOrderNoAttempts; attempt++ {
			on, err := orderno.Generate()
			if err != nil {
				return nil, err
			}
			order.OrderNo = on
			err = s.orderRepo.CreateOrderWithTx(ctx, tx, &order)
			if err == nil {
				created = true
				break
			}
			if !repository.IsMySQLDuplicateKey(err) {
				return nil, err
			}
		}
		if !created {
			return nil, ErrOrderNoExhausted
		}

		for _, pl := range priced {
			subtotal := pl.product.Price * pl.qty
			item := model.OrderItem{
				OrderID:      order.ID,
				ProductID:    pl.product.ID,
				SKUID:        nil,
				ProductName:  pl.product.Name,
				ProductImage: pl.product.CoverImage,
				Unit:         pl.product.Unit,
				Price:        pl.product.Price,
				Quantity:     pl.qty,
				Subtotal:     subtotal,
			}
			if err := s.orderRepo.CreateOrderItemWithTx(ctx, tx, &item); err != nil {
				return nil, err
			}
		}

		logRow := model.OrderLog{
			OrderID:      order.ID,
			FromStatus:   orderLogFromCreated,
			ToStatus:     0,
			OperatorID:   &buyerIDPtr,
			OperatorRole: &roleBuyer,
			Remark:       "",
		}
		if err := s.orderRepo.CreateOrderLogWithTx(ctx, tx, &logRow); err != nil {
			return nil, err
		}

		orderIDs = append(orderIDs, order.ID)
	}
	return orderIDs, nil
}
