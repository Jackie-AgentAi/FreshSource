package admin

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type ProductHandler struct {
	productService *service.ProductService
}

func NewProductHandler(productService *service.ProductService) *ProductHandler {
	return &ProductHandler{productService: productService}
}

type auditProductRequest struct {
	AuditStatus int `json:"audit_status"`
}

type updateProductStatusRequest struct {
	Status int `json:"status"`
}

type updateProductRecommendRequest struct {
	IsRecommend int `json:"is_recommend"`
}

// ListProducts godoc
// @Summary Admin product list
// @Tags admin-product
// @Produce json
// @Param status query int false "status filter"
// @Param shop_id query int false "shop id filter"
// @Param keyword query string false "keyword"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /admin/products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	page, pageSize := parseAdminPagination(c)
	var statusPtr *int
	if raw := strings.TrimSpace(c.Query("status")); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid status")
			return
		}
		statusPtr = &v
	}
	var shopIDPtr *uint64
	if raw := strings.TrimSpace(c.Query("shop_id")); raw != "" {
		v, err := strconv.ParseUint(raw, 10, 64)
		if err != nil || v == 0 {
			response.Fail(c, 10001, "invalid shop_id")
			return
		}
		shopIDPtr = &v
	}
	keyword := strings.TrimSpace(c.Query("keyword"))
	list, total, err := h.productService.AdminList(c.Request.Context(), service.AdminProductListQuery{
		Status:   statusPtr,
		ShopID:   shopIDPtr,
		Keyword:  keyword,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, response.PaginatedData{
		List:       list,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	})
}

// AuditProduct godoc
// @Summary Admin audit product
// @Tags admin-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body auditProductRequest true "audit payload"
// @Router /admin/products/{id}/audit [put]
func (h *ProductHandler) AuditProduct(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid product id")
		return
	}
	var req auditProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.productService.AdminAudit(c.Request.Context(), id, req.AuditStatus); err != nil {
		handleAdminProductError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// UpdateProductStatus godoc
// @Summary Admin force update product status
// @Tags admin-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body updateProductStatusRequest true "status payload"
// @Router /admin/products/{id}/status [put]
func (h *ProductHandler) UpdateProductStatus(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid product id")
		return
	}
	var req updateProductStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.productService.AdminUpdateStatus(c.Request.Context(), id, req.Status); err != nil {
		handleAdminProductError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// UpdateProductRecommend godoc
// @Summary Admin update product recommend flag
// @Tags admin-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body updateProductRecommendRequest true "recommend payload"
// @Router /admin/products/{id}/recommend [put]
func (h *ProductHandler) UpdateProductRecommend(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid product id")
		return
	}
	var req updateProductRecommendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.productService.AdminUpdateRecommend(c.Request.Context(), id, req.IsRecommend); err != nil {
		handleAdminProductError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func parseAdminPagination(c *gin.Context) (int, int) {
	page := 1
	pageSize := 20
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page", "1"))); err == nil && parsed > 0 {
		page = parsed
	}
	if parsed, err := strconv.Atoi(strings.TrimSpace(c.DefaultQuery("page_size", "20"))); err == nil && parsed > 0 {
		pageSize = parsed
		if pageSize > 100 {
			pageSize = 100
		}
	}
	return page, pageSize
}

func handleAdminProductError(c *gin.Context, err error) {
	switch err {
	case service.ErrProductNotFound:
		response.Fail(c, 30001, err.Error())
	case service.ErrProductInvalidAudit, service.ErrProductInvalidRecommend, service.ErrProductNotAllowed:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
