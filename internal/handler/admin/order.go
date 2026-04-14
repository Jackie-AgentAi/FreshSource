package admin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type OrderHandler struct {
	adminOrderService *service.AdminOrderService
}

func NewOrderHandler(adminOrderService *service.AdminOrderService) *OrderHandler {
	return &OrderHandler{adminOrderService: adminOrderService}
}

type settlementBody struct {
	SettlementStatus int `json:"settlement_status"`
}

type adminOrderStatusBody struct {
	Status int    `json:"status"`
	Remark string `json:"remark"`
}

// ListOrders godoc
// @Summary Admin order list
// @Tags admin-order
// @Produce json
// @Param status query int false "order status"
// @Param shop_id query int false "shop id"
// @Param buyer_id query int false "buyer user id"
// @Param settlement_status query int false "settlement_status"
// @Param created_from query string false "RFC3339"
// @Param created_to query string false "RFC3339"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /admin/orders [get]
func (h *OrderHandler) ListOrders(c *gin.Context) {
	params, ok := parseAdminOrderListParams(c)
	if !ok {
		return
	}
	data, err := h.adminOrderService.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, data)
}

// ExportOrders godoc
// @Summary Admin order export (CSV)
// @Tags admin-order
// @Produce text/csv
// @Param status query int false "order status"
// @Param shop_id query int false "shop id"
// @Param buyer_id query int false "buyer user id"
// @Param settlement_status query int false "settlement_status"
// @Param created_from query string false "RFC3339"
// @Param created_to query string false "RFC3339"
// @Router /admin/orders/export [get]
func (h *OrderHandler) ExportOrders(c *gin.Context) {
	params, ok := parseAdminOrderListParams(c)
	if !ok {
		return
	}
	body, filename, err := h.adminOrderService.ExportOrdersCSV(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Data(http.StatusOK, "text/csv; charset=utf-8", body)
}

// GetOrder godoc
// @Summary Admin order detail
// @Tags admin-order
// @Produce json
// @Param id path int true "order id"
// @Router /admin/orders/{id} [get]
func (h *OrderHandler) GetOrder(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	data, err := h.adminOrderService.Detail(c.Request.Context(), id)
	if err != nil {
		handleAdminOrderError(c, err)
		return
	}
	response.Success(c, data)
}

// UpdateSettlement godoc
// @Summary Admin update order settlement_status only
// @Tags admin-order
// @Accept json
// @Produce json
// @Param id path int true "order id"
// @Param request body settlementBody true "settlement payload"
// @Router /admin/orders/{id}/settlement [put]
func (h *OrderHandler) UpdateSettlement(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	var req settlementBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.adminOrderService.UpdateSettlement(c.Request.Context(), id, req.SettlementStatus); err != nil {
		handleAdminOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// GetOrderLogs godoc
// @Summary Admin order status logs
// @Tags admin-order
// @Produce json
// @Param id path int true "order id"
// @Router /admin/orders/{id}/logs [get]
func (h *OrderHandler) GetOrderLogs(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	list, err := h.adminOrderService.ListOrderLogs(c.Request.Context(), id)
	if err != nil {
		handleAdminOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"list": list})
}

// UpdateOrderStatus godoc
// @Summary Admin return flow (4→6, 6→7, 6→4)
// @Tags admin-order
// @Accept json
// @Produce json
// @Param id path int true "order id"
// @Param request body adminOrderStatusBody true "target status + optional remark"
// @Router /admin/orders/{id}/status [put]
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid order id")
		return
	}
	var req adminOrderStatusBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.adminOrderService.UpdateReturnStatus(c.Request.Context(), userID, id, req.Status, req.Remark); err != nil {
		handleAdminOrderError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func parseAdminOrderListParams(c *gin.Context) (service.AdminOrderListParams, bool) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	var statusPtr *int
	if raw := strings.TrimSpace(c.Query("status")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid status")
			return service.AdminOrderListParams{}, false
		}
		statusPtr = &v
	}
	var shopIDPtr *uint64
	if raw := strings.TrimSpace(c.Query("shop_id")); raw != "" {
		v, err := strconv.ParseUint(raw, 10, 64)
		if err != nil || v == 0 {
			response.Fail(c, 10001, "invalid shop_id")
			return service.AdminOrderListParams{}, false
		}
		shopIDPtr = &v
	}
	var buyerIDPtr *uint64
	if raw := strings.TrimSpace(c.Query("buyer_id")); raw != "" {
		v, err := strconv.ParseUint(raw, 10, 64)
		if err != nil || v == 0 {
			response.Fail(c, 10001, "invalid buyer_id")
			return service.AdminOrderListParams{}, false
		}
		buyerIDPtr = &v
	}
	var settlementPtr *int
	if raw := strings.TrimSpace(c.Query("settlement_status")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid settlement_status")
			return service.AdminOrderListParams{}, false
		}
		settlementPtr = &v
	}
	var createdFrom *time.Time
	if raw := strings.TrimSpace(c.Query("created_from")); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			response.Fail(c, 10001, "invalid created_from")
			return service.AdminOrderListParams{}, false
		}
		createdFrom = &t
	}
	var createdTo *time.Time
	if raw := strings.TrimSpace(c.Query("created_to")); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			response.Fail(c, 10001, "invalid created_to")
			return service.AdminOrderListParams{}, false
		}
		createdTo = &t
	}
	return service.AdminOrderListParams{
		Status:           statusPtr,
		ShopID:           shopIDPtr,
		BuyerID:          buyerIDPtr,
		SettlementStatus: settlementPtr,
		CreatedFrom:      createdFrom,
		CreatedTo:        createdTo,
		Page:             page,
		PageSize:         pageSize,
	}, true
}

func handleAdminOrderError(c *gin.Context, err error) {
	switch err {
	case service.ErrAdminOrderNotFound:
		response.Fail(c, 40001, err.Error())
	case service.ErrAdminOrderBadStatus:
		response.Fail(c, 40002, err.Error())
	case service.ErrAdminSettlementInvalid:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
