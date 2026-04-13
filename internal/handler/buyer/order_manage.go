package buyer

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type BuyerOrderHandler struct {
	buyerOrderService *service.BuyerOrderService
}

func NewBuyerOrderHandler(buyerOrderService *service.BuyerOrderService) *BuyerOrderHandler {
	return &BuyerOrderHandler{buyerOrderService: buyerOrderService}
}

// ListOrders godoc
// @Summary Buyer order list
// @Tags buyer-order
// @Produce json
// @Param status query int false "order status filter"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /buyer/orders [get]
func (h *BuyerOrderHandler) ListOrders(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var statusPtr *int
	if s := c.Query("status"); s != "" {
		v, err := strconv.Atoi(s)
		if err != nil {
			response.Fail(c, 10001, "invalid status")
			return
		}
		statusPtr = &v
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	data, err := h.buyerOrderService.List(c.Request.Context(), userID, service.BuyerOrderListQuery{
		Status:   statusPtr,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		abortBuyerOrderSystemError(c)
		return
	}
	response.Success(c, data)
}

// GetOrder godoc
// @Summary Buyer order detail
// @Tags buyer-order
// @Produce json
// @Param id path int true "order id"
// @Router /buyer/orders/{id} [get]
func (h *BuyerOrderHandler) GetOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseOrderIDParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	data, err := h.buyerOrderService.Detail(c.Request.Context(), userID, id)
	if err != nil {
		handleBuyerOrderError(c, err)
		return
	}
	response.Success(c, data)
}

type buyerCancelBody struct {
	CancelReason string `json:"cancel_reason"`
}

// CancelOrder godoc
// @Summary Buyer cancel order (status 0 only)
// @Tags buyer-order
// @Accept json
// @Produce json
// @Param id path int true "order id"
// @Router /buyer/orders/{id}/cancel [put]
func (h *BuyerOrderHandler) CancelOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseOrderIDParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	var body buyerCancelBody
	_ = c.ShouldBindJSON(&body)
	if err := h.buyerOrderService.Cancel(c.Request.Context(), userID, id, service.BuyerCancelInput{
		CancelReason: body.CancelReason,
	}); err != nil {
		handleBuyerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// ReceiveOrder godoc
// @Summary Buyer confirm receive (status 3 -> 4)
// @Tags buyer-order
// @Produce json
// @Param id path int true "order id"
// @Router /buyer/orders/{id}/receive [put]
func (h *BuyerOrderHandler) ReceiveOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseOrderIDParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.buyerOrderService.Receive(c.Request.Context(), userID, id); err != nil {
		handleBuyerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// Reorder godoc
// @Summary Add order line items to cart again
// @Tags buyer-order
// @Produce json
// @Param id path int true "order id"
// @Router /buyer/orders/{id}/reorder [post]
func (h *BuyerOrderHandler) Reorder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseOrderIDParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.buyerOrderService.Reorder(c.Request.Context(), userID, id); err != nil {
		if errors.Is(err, service.ErrBuyerOrderNotFound) {
			response.Fail(c, 40001, err.Error())
			return
		}
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// DeleteOrder godoc
// @Summary Soft delete order (status 4 or 5 only)
// @Tags buyer-order
// @Produce json
// @Param id path int true "order id"
// @Router /buyer/orders/{id} [delete]
func (h *BuyerOrderHandler) DeleteOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseOrderIDParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.buyerOrderService.SoftDelete(c.Request.Context(), userID, id); err != nil {
		handleBuyerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleBuyerOrderError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrBuyerOrderNotFound):
		response.Fail(c, 40001, err.Error())
	case errors.Is(err, service.ErrBuyerOrderBadStatus):
		response.Fail(c, 40002, err.Error())
	default:
		abortBuyerOrderSystemError(c)
	}
}

func abortBuyerOrderSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
}

func parseOrderIDParam(raw string) (uint64, bool) {
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, false
	}
	return id, true
}
