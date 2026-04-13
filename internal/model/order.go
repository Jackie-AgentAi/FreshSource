package model

import "time"

type Order struct {
	ID                uint64     `gorm:"column:id;primaryKey;autoIncrement"`
	OrderNo           string     `gorm:"column:order_no"`
	BuyerID           uint64     `gorm:"column:buyer_id"`
	ShopID            uint64     `gorm:"column:shop_id"`
	SellerID          uint64     `gorm:"column:seller_id"`
	TotalAmount       float64    `gorm:"column:total_amount"`
	FreightAmount     float64    `gorm:"column:freight_amount"`
	DiscountAmount    float64    `gorm:"column:discount_amount"`
	PayAmount         float64    `gorm:"column:pay_amount"`
	ReceiverName      string     `gorm:"column:receiver_name"`
	ReceiverPhone     string     `gorm:"column:receiver_phone"`
	ReceiverAddress   string     `gorm:"column:receiver_address"`
	ReceiverLat       *float64   `gorm:"column:receiver_lat"`
	ReceiverLng       *float64   `gorm:"column:receiver_lng"`
	Status            int        `gorm:"column:status"`
	SettlementStatus  int        `gorm:"column:settlement_status"`
	CancelReason      string     `gorm:"column:cancel_reason"`
	CancelBy          *int       `gorm:"column:cancel_by"`
	DeliveryType      int        `gorm:"column:delivery_type"`
	DeliveryTime      string     `gorm:"column:delivery_time"`
	DeliveredAt       *time.Time `gorm:"column:delivered_at"`
	BuyerRemark       string     `gorm:"column:buyer_remark"`
	SellerRemark      string     `gorm:"column:seller_remark"`
	ConfirmedAt       *time.Time `gorm:"column:confirmed_at"`
	CompletedAt       *time.Time `gorm:"column:completed_at"`
	CreatedAt         time.Time  `gorm:"column:created_at"`
	UpdatedAt         time.Time  `gorm:"column:updated_at"`
	DeletedAt         *time.Time `gorm:"column:deleted_at"`
}

func (Order) TableName() string {
	return "orders"
}

type OrderItem struct {
	ID           uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	OrderID      uint64    `gorm:"column:order_id"`
	ProductID    uint64    `gorm:"column:product_id"`
	SKUID        *uint64   `gorm:"column:sku_id"`
	ProductName  string    `gorm:"column:product_name"`
	ProductImage string    `gorm:"column:product_image"`
	Unit         string    `gorm:"column:unit"`
	Price        float64   `gorm:"column:price"`
	Quantity     float64   `gorm:"column:quantity"`
	Subtotal     float64   `gorm:"column:subtotal"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (OrderItem) TableName() string {
	return "order_items"
}

type OrderLog struct {
	ID             uint64    `gorm:"column:id;primaryKey;autoIncrement"`
	OrderID        uint64    `gorm:"column:order_id"`
	FromStatus     int8      `gorm:"column:from_status"`
	ToStatus       int8      `gorm:"column:to_status"`
	OperatorID     *uint64   `gorm:"column:operator_id"`
	OperatorRole   *int8     `gorm:"column:operator_role"`
	Remark         string    `gorm:"column:remark"`
	CreatedAt      time.Time `gorm:"column:created_at"`
}

func (OrderLog) TableName() string {
	return "order_logs"
}
