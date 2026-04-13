package seller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type ProductHandler struct {
	productService *service.ProductService
}

type saveProductRequest struct {
	CategoryID    uint64   `json:"category_id"`
	Name          string   `json:"name"`
	Subtitle      string   `json:"subtitle"`
	CoverImage    string   `json:"cover_image"`
	Images        []string `json:"images"`
	Description   string   `json:"description"`
	Price         float64  `json:"price"`
	OriginalPrice *float64 `json:"original_price"`
	Unit          string   `json:"unit"`
	MinBuy        float64  `json:"min_buy"`
	StepBuy       float64  `json:"step_buy"`
	Stock         int      `json:"stock"`
	OriginPlace   string   `json:"origin_place"`
	ShelfLife     string   `json:"shelf_life"`
	StorageMethod string   `json:"storage_method"`
	SortOrder     int      `json:"sort_order"`
}

type updateStatusRequest struct {
	Status int `json:"status"`
}

type batchPriceItem struct {
	ID    uint64  `json:"id"`
	Price float64 `json:"price"`
}

type adjustStockRequest struct {
	Stock int `json:"stock"`
}

func NewProductHandler(productService *service.ProductService) *ProductHandler {
	return &ProductHandler{productService: productService}
}

// ListProducts godoc
// @Summary Seller product list
// @Description Query product list by seller shop
// @Tags seller-product
// @Produce json
// @Param page query int false "page"
// @Param page_size query int false "page_size"
// @Param status query int false "status"
// @Success 200 {object} response.Envelope
// @Router /seller/products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	page, pageSize := parsePagination(c)
	status, hasStatus := parseOptionalInt(c.Query("status"))

	var statusPtr *int
	if hasStatus {
		statusPtr = &status
	}

	list, total, err := h.productService.ListBySeller(c.Request.Context(), userID, statusPtr, page, pageSize)
	if err != nil {
		handleProductServiceError(c, err)
		return
	}

	response.Success(c, response.PaginatedData{
		List:       list,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	})
}

// CreateProduct godoc
// @Summary Create product
// @Description Create seller product with default pending status
// @Tags seller-product
// @Accept json
// @Produce json
// @Param request body saveProductRequest true "product payload"
// @Success 200 {object} response.Envelope
// @Router /seller/products [post]
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req saveProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	product, err := h.productService.Create(c.Request.Context(), userID, toSaveInput(req))
	if err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, product)
}

// UpdateProduct godoc
// @Summary Update product
// @Description Update seller product fields
// @Tags seller-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body saveProductRequest true "product payload"
// @Success 200 {object} response.Envelope
// @Router /seller/products/{id} [put]
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	var req saveProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	err := h.productService.Update(c.Request.Context(), userID, id, toSaveInput(req))
	if err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// UpdateProductStatus godoc
// @Summary Update product status
// @Description Update seller product shelf status
// @Tags seller-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body updateStatusRequest true "status payload"
// @Success 200 {object} response.Envelope
// @Router /seller/products/{id}/status [put]
func (h *ProductHandler) UpdateProductStatus(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	var req updateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	if err := h.productService.UpdateStatus(c.Request.Context(), userID, id, req.Status); err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// DeleteProduct godoc
// @Summary Delete product
// @Description Soft delete seller product
// @Tags seller-product
// @Produce json
// @Param id path int true "product id"
// @Success 200 {object} response.Envelope
// @Router /seller/products/{id} [delete]
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.productService.Delete(c.Request.Context(), userID, id); err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

// BatchUpdatePrice godoc
// @Summary Batch update product price
// @Description Batch update prices for seller products
// @Tags seller-product
// @Accept json
// @Produce json
// @Param request body []batchPriceItem true "batch price payload"
// @Success 200 {object} response.Envelope
// @Router /seller/products/batch-price [put]
func (h *ProductHandler) BatchUpdatePrice(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req []batchPriceItem
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	inputs := make([]service.BatchPriceInput, 0, len(req))
	for _, item := range req {
		inputs = append(inputs, service.BatchPriceInput{
			ID:    item.ID,
			Price: item.Price,
		})
	}
	if err := h.productService.BatchUpdatePrice(c.Request.Context(), userID, inputs); err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// AdjustStock godoc
// @Summary Adjust product stock
// @Description Adjust stock by delta, negative means deduction
// @Tags seller-product
// @Accept json
// @Produce json
// @Param id path int true "product id"
// @Param request body adjustStockRequest true "stock delta payload"
// @Success 200 {object} response.Envelope
// @Router /seller/products/{id}/stock [put]
func (h *ProductHandler) AdjustStock(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	var req adjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.productService.AdjustStock(c.Request.Context(), userID, id, req.Stock); err != nil {
		handleProductServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

func toSaveInput(req saveProductRequest) service.SaveProductInput {
	return service.SaveProductInput{
		CategoryID:    req.CategoryID,
		Name:          req.Name,
		Subtitle:      req.Subtitle,
		CoverImage:    req.CoverImage,
		Images:        req.Images,
		Description:   req.Description,
		Price:         req.Price,
		OriginalPrice: req.OriginalPrice,
		Unit:          req.Unit,
		MinBuy:        req.MinBuy,
		StepBuy:       req.StepBuy,
		Stock:         req.Stock,
		OriginPlace:   req.OriginPlace,
		ShelfLife:     req.ShelfLife,
		StorageMethod: req.StorageMethod,
		SortOrder:     req.SortOrder,
	}
}

func handleProductServiceError(c *gin.Context, err error) {
	switch err {
	case service.ErrProductCoverRequired,
		service.ErrProductImagesTooMany,
		service.ErrProductNameRequired:
		response.Fail(c, 10001, err.Error())
	case service.ErrProductNotFound,
		service.ErrProductNotAllowed:
		response.Fail(c, 30001, err.Error())
	case service.ErrProductStockNotEnough:
		response.Fail(c, 30002, err.Error())
	case service.ErrSellerShopNotFound:
		response.Fail(c, 50001, err.Error())
	case service.ErrBatchPriceEmpty:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{
			Code:    10000,
			Message: "system error",
			Data:    nil,
		})
	}
}

func parseID(raw string) (uint64, bool) {
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, false
	}
	return id, true
}

func parsePagination(c *gin.Context) (int, int) {
	page := 1
	pageSize := 20
	if parsed, ok := parseOptionalInt(c.Query("page")); ok && parsed > 0 {
		page = parsed
	}
	if parsed, ok := parseOptionalInt(c.Query("page_size")); ok && parsed > 0 {
		pageSize = parsed
		if pageSize > 100 {
			pageSize = 100
		}
	}
	return page, pageSize
}

func parseOptionalInt(raw string) (int, bool) {
	if raw == "" {
		return 0, false
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, false
	}
	return value, true
}
