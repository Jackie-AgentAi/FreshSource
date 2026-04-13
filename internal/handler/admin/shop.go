package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type ShopHandler struct {
	shopService *service.ShopService
}

func NewShopHandler(shopService *service.ShopService) *ShopHandler {
	return &ShopHandler{shopService: shopService}
}

// ListShops godoc
// @Summary Admin shop list
// @Tags admin-shop
// @Produce json
// @Param audit_status query int false "filter by audit_status"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /admin/shops [get]
func (h *ShopHandler) ListShops(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	var auditPtr *int
	if raw := c.Query("audit_status"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid audit_status")
			return
		}
		auditPtr = &v
	}
	data, err := h.shopService.AdminListShops(c.Request.Context(), auditPtr, page, pageSize)
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, data)
}

// GetShop godoc
// @Summary Admin shop detail
// @Tags admin-shop
// @Produce json
// @Param id path int true "shop id"
// @Router /admin/shops/{id} [get]
func (h *ShopHandler) GetShop(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid shop id")
		return
	}
	data, err := h.shopService.AdminGetShop(c.Request.Context(), id)
	if err != nil {
		handleAdminShopError(c, err)
		return
	}
	response.Success(c, data)
}

type auditShopRequest struct {
	AuditStatus int    `json:"audit_status"`
	AuditRemark string `json:"audit_remark"`
}

// AuditShop godoc
// @Summary Admin audit shop (audit_status 1=通过 2=拒绝)
// @Tags admin-shop
// @Accept json
// @Produce json
// @Param id path int true "shop id"
// @Router /admin/shops/{id}/audit [put]
func (h *ShopHandler) AuditShop(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid shop id")
		return
	}
	var req auditShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.shopService.AdminAuditShop(c.Request.Context(), id, service.AdminAuditShopInput{
		AuditStatus: req.AuditStatus,
		AuditRemark: req.AuditRemark,
	}); err != nil {
		handleAdminShopError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// CloseShop godoc
// @Summary Admin force close shop
// @Tags admin-shop
// @Produce json
// @Param id path int true "shop id"
// @Router /admin/shops/{id}/close [put]
func (h *ShopHandler) CloseShop(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid shop id")
		return
	}
	if err := h.shopService.AdminCloseShop(c.Request.Context(), id); err != nil {
		handleAdminShopError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func parseUintPath(raw string) (uint64, bool) {
	v, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || v == 0 {
		return 0, false
	}
	return v, true
}

func handleAdminShopError(c *gin.Context, err error) {
	switch err {
	case service.ErrShopNotFound:
		response.Fail(c, 10001, err.Error())
	case service.ErrShopInvalidAudit:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
