package buyer

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type OrderCreateHandler struct {
	orderCreateService *service.OrderCreateService
}

type orderCreateRequest struct {
	AddressID    uint64                     `json:"address_id"`
	DeliveryType int                        `json:"delivery_type"`
	CartItemIDs  []uint64                   `json:"cart_item_ids"`
	Items        []service.OrderConfirmItem `json:"items"`
	BuyerRemark  string                     `json:"buyer_remark"`
}

func NewOrderCreateHandler(orderCreateService *service.OrderCreateService) *OrderCreateHandler {
	return &OrderCreateHandler{orderCreateService: orderCreateService}
}

// CreateOrders godoc
// @Summary Buyer create orders
// @Description Create orders per shop in one transaction; deduct stock; write order_logs
// @Tags buyer-order
// @Accept json
// @Produce json
// @Param request body orderCreateRequest true "create payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/orders [post]
func (h *OrderCreateHandler) CreateOrders(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}

	var req orderCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	resp, err := h.orderCreateService.CreateOrders(c.Request.Context(), userID, service.OrderCreateInput{
		AddressID:    req.AddressID,
		DeliveryType: req.DeliveryType,
		CartItemIDs:  req.CartItemIDs,
		Items:        req.Items,
		BuyerRemark:  req.BuyerRemark,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrOrderNoExhausted):
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "order number conflict, please retry", Data: nil})
		case err == service.ErrAddressNotFound || err == service.ErrCartInvalidInput || err == service.ErrCartStepInvalid:
			response.Fail(c, 10001, err.Error())
		case err == service.ErrProductNotFound:
			response.Fail(c, 30001, err.Error())
		case err == service.ErrProductStockNotEnough:
			response.Fail(c, 30002, err.Error())
		case err == service.ErrSellerShopNotFound:
			response.Fail(c, 50001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, resp)
}
