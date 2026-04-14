package admin

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type BannerHandler struct {
	bannerService *service.BannerService
}

func NewBannerHandler(bannerService *service.BannerService) *BannerHandler {
	return &BannerHandler{bannerService: bannerService}
}

// ListBanners godoc
// @Summary Admin banner list
// @Tags admin-banner
// @Produce json
// @Param position query string false "position filter"
// @Param status query int false "status"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /admin/banners [get]
func (h *BannerHandler) ListBanners(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	var posPtr *string
	if raw := strings.TrimSpace(c.Query("position")); raw != "" {
		posPtr = &raw
	}
	var statusPtr *int
	if raw := strings.TrimSpace(c.Query("status")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid status")
			return
		}
		statusPtr = &v
	}
	data, err := h.bannerService.List(c.Request.Context(), service.BannerListQuery{
		Position: posPtr,
		Status:   statusPtr,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, data)
}

// CreateBanner godoc
// @Summary Admin create banner
// @Tags admin-banner
// @Accept json
// @Produce json
// @Param request body service.BannerWriteInput true "banner"
// @Router /admin/banners [post]
func (h *BannerHandler) CreateBanner(c *gin.Context) {
	var req service.BannerWriteInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	id, err := h.bannerService.Create(c.Request.Context(), req)
	if err != nil {
		handleBannerError(c, err)
		return
	}
	response.Success(c, gin.H{"id": id})
}

// UpdateBanner godoc
// @Summary Admin update banner
// @Tags admin-banner
// @Accept json
// @Produce json
// @Param id path int true "banner id"
// @Param request body service.BannerWriteInput true "banner"
// @Router /admin/banners/{id} [put]
func (h *BannerHandler) UpdateBanner(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid banner id")
		return
	}
	var req service.BannerWriteInput
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.bannerService.Update(c.Request.Context(), id, req); err != nil {
		handleBannerError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// DeleteBanner godoc
// @Summary Admin delete banner
// @Tags admin-banner
// @Produce json
// @Param id path int true "banner id"
// @Router /admin/banners/{id} [delete]
func (h *BannerHandler) DeleteBanner(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid banner id")
		return
	}
	if err := h.bannerService.Delete(c.Request.Context(), id); err != nil {
		handleBannerError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleBannerError(c *gin.Context, err error) {
	switch err {
	case service.ErrBannerNotFound:
		response.Fail(c, 10001, err.Error())
	case service.ErrBannerImageRequired, service.ErrBannerLinkType, service.ErrBannerStatus, service.ErrBannerInvalidTime:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
