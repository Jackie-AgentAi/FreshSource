package buyer

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type OrderConfirmHandler struct {
	orderConfirmService *service.OrderConfirmService
}

type orderConfirmRequest struct {
	AddressID    uint64                     `json:"address_id"`
	DeliveryType int                        `json:"delivery_type"`
	CartItemIDs  []uint64                   `json:"cart_item_ids"`
	Items        []service.OrderConfirmItem `json:"items"`
	BuyerRemark  string                     `json:"buyer_remark"`
}

func NewOrderConfirmHandler(orderConfirmService *service.OrderConfirmService) *OrderConfirmHandler {
	return &OrderConfirmHandler{orderConfirmService: orderConfirmService}
}

// ConfirmOrder godoc
// @Summary Buyer order confirm preview
// @Description Preview split orders and freight without creating orders
// @Tags buyer-order
// @Accept json
// @Produce json
// @Param request body orderConfirmRequest true "confirm payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/orders/confirm [post]
func (h *OrderConfirmHandler) ConfirmOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}

	var req orderConfirmRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	resp, err := h.orderConfirmService.Confirm(c.Request.Context(), userID, service.OrderConfirmInput{
		AddressID:    req.AddressID,
		DeliveryType: req.DeliveryType,
		CartItemIDs:  req.CartItemIDs,
		Items:        req.Items,
		BuyerRemark:  req.BuyerRemark,
	})
	if err != nil {
		switch err {
		case service.ErrAddressNotFound, service.ErrCartInvalidInput, service.ErrCartStepInvalid:
			response.Fail(c, 10001, err.Error())
		case service.ErrProductNotFound:
			response.Fail(c, 30001, err.Error())
		case service.ErrProductStockNotEnough:
			response.Fail(c, 30002, err.Error())
		case service.ErrSellerShopNotFound:
			response.Fail(c, 50001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, resp)
}
