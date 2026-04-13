package seller

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type OrderHandler struct {
	sellerOrderService *service.SellerOrderService
}

func NewOrderHandler(sellerOrderService *service.SellerOrderService) *OrderHandler {
	return &OrderHandler{sellerOrderService: sellerOrderService}
}

// ListOrders godoc
// @Summary Seller order list
// @Tags seller-order
// @Produce json
// @Param status query int false "order status"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /seller/orders [get]
func (h *OrderHandler) ListOrders(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	page, pageSize := parsePagination(c)
	var statusPtr *int
	if v, has := parseOptionalInt(c.Query("status")); has {
		statusPtr = &v
	}
	data, err := h.sellerOrderService.List(c.Request.Context(), userID, service.SellerOrderListQuery{
		Status:   statusPtr,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		abortSellerOrderSystemError(c)
		return
	}
	response.Success(c, data)
}

// GetOrder godoc
// @Summary Seller order detail
// @Tags seller-order
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id} [get]
func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	data, err := h.sellerOrderService.Detail(c.Request.Context(), userID, id)
	if err != nil {
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, data)
}

// ConfirmOrder godoc
// @Summary Seller confirm order (0 -> 1)
// @Tags seller-order
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id}/confirm [put]
func (h *OrderHandler) ConfirmOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.sellerOrderService.Confirm(c.Request.Context(), userID, id); err != nil {
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

type rejectBody struct {
	Reason string `json:"reason"`
}

// RejectOrder godoc
// @Summary Seller reject order (0 -> 5, restore stock)
// @Tags seller-order
// @Accept json
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id}/reject [put]
func (h *OrderHandler) RejectOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	var body rejectBody
	_ = c.ShouldBindJSON(&body)
	if err := h.sellerOrderService.Reject(c.Request.Context(), userID, id, service.SellerRejectInput{
		Reason: body.Reason,
	}); err != nil {
		if errors.Is(err, service.ErrSellerRejectReasonRequired) {
			response.Fail(c, 10001, err.Error())
			return
		}
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// DeliverOrder godoc
// @Summary Seller mark delivering (1 -> 2)
// @Tags seller-order
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id}/deliver [put]
func (h *OrderHandler) DeliverOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.sellerOrderService.Deliver(c.Request.Context(), userID, id); err != nil {
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// ArrivedOrder godoc
// @Summary Seller mark arrived (2 -> 3)
// @Tags seller-order
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id}/arrived [put]
func (h *OrderHandler) ArrivedOrder(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	if err := h.sellerOrderService.Arrived(c.Request.Context(), userID, id); err != nil {
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

type remarkBody struct {
	SellerRemark string `json:"seller_remark"`
}

// UpdateRemark godoc
// @Summary Update seller internal remark
// @Tags seller-order
// @Accept json
// @Produce json
// @Param id path int true "order id"
// @Router /seller/orders/{id}/remark [put]
func (h *OrderHandler) UpdateRemark(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	var body remarkBody
	_ = c.ShouldBindJSON(&body)
	if err := h.sellerOrderService.UpdateRemark(c.Request.Context(), userID, id, service.SellerRemarkInput{
		SellerRemark: body.SellerRemark,
	}); err != nil {
		handleSellerOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleSellerOrderError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrSellerOrderNotFound):
		response.Fail(c, 40001, err.Error())
	case errors.Is(err, service.ErrSellerOrderBadStatus):
		response.Fail(c, 40002, err.Error())
	default:
		abortSellerOrderSystemError(c)
	}
}

func abortSellerOrderSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
}
