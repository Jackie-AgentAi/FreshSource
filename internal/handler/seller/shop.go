package seller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type ShopHandler struct {
	shopService *service.ShopService
}

func NewShopHandler(shopService *service.ShopService) *ShopHandler {
	return &ShopHandler{shopService: shopService}
}

type applyShopRequest struct {
	ShopName        string   `json:"shop_name"`
	Logo            string   `json:"logo"`
	Description     string   `json:"description"`
	ContactPhone    string   `json:"contact_phone"`
	Province        string   `json:"province"`
	City            string   `json:"city"`
	District        string   `json:"district"`
	Address         string   `json:"address"`
	BusinessLicense string   `json:"business_license"`
	Latitude        *float64 `json:"latitude"`
	Longitude       *float64 `json:"longitude"`
}

func mapApplyShopInput(req applyShopRequest) service.ApplyShopInput {
	return service.ApplyShopInput{
		ShopName:        req.ShopName,
		Logo:            req.Logo,
		Description:     req.Description,
		ContactPhone:    req.ContactPhone,
		Province:        req.Province,
		City:            req.City,
		District:        req.District,
		Address:         req.Address,
		BusinessLicense: req.BusinessLicense,
		Latitude:        req.Latitude,
		Longitude:       req.Longitude,
	}
}

// ApplyShop godoc
// @Summary Seller apply for shop (first time)
// @Tags seller-shop
// @Accept json
// @Produce json
// @Router /seller/shop/apply [post]
func (h *ShopHandler) ApplyShop(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req applyShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	data, err := h.shopService.Apply(c.Request.Context(), userID, mapApplyShopInput(req))
	if err != nil {
		handleShopServiceError(c, err)
		return
	}
	response.Success(c, data)
}

// GetAuditStatus godoc
// @Summary Seller shop audit status
// @Tags seller-shop
// @Produce json
// @Router /seller/shop/audit-status [get]
func (h *ShopHandler) GetAuditStatus(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	data, err := h.shopService.GetSellerAuditStatus(c.Request.Context(), userID)
	if err != nil {
		handleShopServiceError(c, err)
		return
	}
	response.Success(c, data)
}

// UpdateShop godoc
// @Summary Update seller shop info (re-audit when was approved/rejected)
// @Tags seller-shop
// @Accept json
// @Produce json
// @Router /seller/shop [put]
func (h *ShopHandler) UpdateShop(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req applyShopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.shopService.UpdateSellerShop(c.Request.Context(), userID, mapApplyShopInput(req)); err != nil {
		handleShopServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

type shopStatusRequest struct {
	Status int `json:"status"`
}

// UpdateShopStatus godoc
// @Summary Seller shop open/close (0=关店 1=营业)
// @Tags seller-shop
// @Accept json
// @Produce json
// @Router /seller/shop/status [put]
func (h *ShopHandler) UpdateShopStatus(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req shopStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.shopService.UpdateSellerShopStatus(c.Request.Context(), userID, req.Status); err != nil {
		handleShopServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleShopServiceError(c *gin.Context, err error) {
	switch err {
	case service.ErrShopAlreadyExists:
		response.Fail(c, 10001, err.Error())
	case service.ErrShopNotFound:
		response.Fail(c, 10001, err.Error())
	case service.ErrShopNameRequired:
		response.Fail(c, 10001, err.Error())
	case service.ErrShopInvalidStatus:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
