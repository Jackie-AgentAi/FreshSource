package buyer

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

// ListProducts godoc
// @Summary Buyer product list
// @Description List buyer-visible products with filters
// @Tags buyer-product
// @Produce json
// @Param category_id query int false "category id"
// @Param shop_id query int false "shop id"
// @Param keyword query string false "keyword"
// @Param sort_by query string false "price_asc/price_desc/sales_desc/latest"
// @Param min_price query number false "min price"
// @Param max_price query number false "max price"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Success 200 {object} response.Envelope
// @Router /buyer/products [get]
func (h *ProductHandler) ListProducts(c *gin.Context) {
	query, page, pageSize := buildBuyerProductQuery(c)
	items, total, err := h.productService.ListForBuyer(c.Request.Context(), query)
	if err != nil {
		abortBuyerProductSystemError(c)
		return
	}
	response.Success(c, response.PaginatedData{
		List:       items,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	})
}

// SearchProducts godoc
// @Summary Buyer product search
// @Description Search buyer-visible products by keyword
// @Tags buyer-product
// @Produce json
// @Param keyword query string true "keyword"
// @Param category_id query int false "category id"
// @Param shop_id query int false "shop id"
// @Param sort_by query string false "price_asc/price_desc/sales_desc/latest"
// @Param min_price query number false "min price"
// @Param max_price query number false "max price"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Success 200 {object} response.Envelope
// @Router /buyer/products/search [get]
func (h *ProductHandler) SearchProducts(c *gin.Context) {
	query, page, pageSize := buildBuyerProductQuery(c)
	if strings.TrimSpace(query.Keyword) == "" {
		response.Fail(c, 10001, "keyword is required")
		return
	}
	items, total, err := h.productService.SearchForBuyer(c.Request.Context(), query)
	if err != nil {
		abortBuyerProductSystemError(c)
		return
	}
	response.Success(c, response.PaginatedData{
		List:       items,
		Pagination: response.BuildPagination(page, pageSize, int(total)),
	})
}

// GetProductDetail godoc
// @Summary Buyer product detail
// @Description Get product detail and shop summary
// @Tags buyer-product
// @Produce json
// @Param id path int true "product id"
// @Success 200 {object} response.Envelope
// @Router /buyer/products/{id} [get]
func (h *ProductHandler) GetProductDetail(c *gin.Context) {
	id, ok := parseUintParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	detail, err := h.productService.GetDetailForBuyer(c.Request.Context(), id)
	if err != nil {
		if err == service.ErrProductNotFound {
			response.Fail(c, 30001, "product not found or off shelf")
			return
		}
		abortBuyerProductSystemError(c)
		return
	}
	response.Success(c, detail)
}

// GetShopHomepage godoc
// @Summary Buyer shop homepage
// @Description Get shop summary and product list
// @Tags buyer-product
// @Produce json
// @Param id path int true "shop id"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Success 200 {object} response.Envelope
// @Router /buyer/shops/{id} [get]
func (h *ProductHandler) GetShopHomepage(c *gin.Context) {
	shopID, ok := parseUintParam(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	page, pageSize := parsePagination(c)
	homepage, err := h.productService.GetShopHomepage(c.Request.Context(), shopID, page, pageSize)
	if err != nil {
		if err == service.ErrProductNotFound {
			response.Fail(c, 30001, "shop not found or unavailable")
			return
		}
		abortBuyerProductSystemError(c)
		return
	}
	response.Success(c, homepage)
}

func buildBuyerProductQuery(c *gin.Context) (service.BuyerProductQuery, int, int) {
	page, pageSize := parsePagination(c)
	query := service.BuyerProductQuery{
		Keyword:  strings.TrimSpace(c.Query("keyword")),
		SortBy:   strings.TrimSpace(c.Query("sort_by")),
		Page:     page,
		PageSize: pageSize,
	}
	if categoryID, ok := parseUintParam(c.Query("category_id")); ok {
		query.CategoryID = &categoryID
	}
	if shopID, ok := parseUintParam(c.Query("shop_id")); ok {
		query.ShopID = &shopID
	}
	if minPrice, ok := parseFloatParam(c.Query("min_price")); ok {
		query.MinPrice = &minPrice
	}
	if maxPrice, ok := parseFloatParam(c.Query("max_price")); ok {
		query.MaxPrice = &maxPrice
	}
	return query, page, pageSize
}

func parsePagination(c *gin.Context) (int, int) {
	page := 1
	pageSize := 20
	if parsed, ok := parseIntParam(c.Query("page")); ok && parsed > 0 {
		page = parsed
	}
	if parsed, ok := parseIntParam(c.Query("page_size")); ok && parsed > 0 {
		pageSize = parsed
		if pageSize > 100 {
			pageSize = 100
		}
	}
	return page, pageSize
}

func parseUintParam(raw string) (uint64, bool) {
	value, err := strconv.ParseUint(strings.TrimSpace(raw), 10, 64)
	if err != nil || value == 0 {
		return 0, false
	}
	return value, true
}

func parseIntParam(raw string) (int, bool) {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, false
	}
	return value, true
}

func parseFloatParam(raw string) (float64, bool) {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func abortBuyerProductSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
}
