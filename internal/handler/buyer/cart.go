package buyer

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type CartHandler struct {
	cartService *service.CartService
}

type addCartItemRequest struct {
	ProductID uint64  `json:"product_id"`
	SKUID     *uint64 `json:"sku_id"`
	Quantity  float64 `json:"quantity"`
}

type updateQuantityRequest struct {
	Quantity float64 `json:"quantity"`
}

type deleteBatchRequest struct {
	IDs []uint64 `json:"ids"`
}

type selectAllRequest struct {
	Selected int `json:"selected"`
}

func NewCartHandler(cartService *service.CartService) *CartHandler {
	return &CartHandler{cartService: cartService}
}

// ListCart godoc
// @Summary Buyer cart list
// @Description Get cart grouped by shop_id
// @Tags buyer-cart
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /buyer/cart [get]
func (h *CartHandler) ListCart(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	groups, err := h.cartService.List(c.Request.Context(), userID)
	if err != nil {
		abortCartSystemError(c)
		return
	}
	response.Success(c, groups)
}

// AddToCart godoc
// @Summary Add to cart
// @Description Add product to cart, existing item accumulates quantity
// @Tags buyer-cart
// @Accept json
// @Produce json
// @Param request body addCartItemRequest true "add cart payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/cart [post]
func (h *CartHandler) AddToCart(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req addCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	item, err := h.cartService.Add(c.Request.Context(), userID, service.AddCartItemInput{
		ProductID: req.ProductID,
		SKUID:     req.SKUID,
		Quantity:  req.Quantity,
	})
	if err != nil {
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, item)
}

// UpdateCartQuantity godoc
// @Summary Update cart quantity
// @Description Update quantity of cart item
// @Tags buyer-cart
// @Accept json
// @Produce json
// @Param id path int true "cart id"
// @Param request body updateQuantityRequest true "quantity payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/cart/{id} [put]
func (h *CartHandler) UpdateCartQuantity(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseCartID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	var req updateQuantityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.cartService.UpdateQuantity(c.Request.Context(), userID, id, req.Quantity); err != nil {
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// DeleteCartItem godoc
// @Summary Delete cart item
// @Description Soft delete one cart item
// @Tags buyer-cart
// @Produce json
// @Param id path int true "cart id"
// @Success 200 {object} response.Envelope
// @Router /buyer/cart/{id} [delete]
func (h *CartHandler) DeleteCartItem(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseCartID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.cartService.Delete(c.Request.Context(), userID, id); err != nil {
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

// DeleteCartBatch godoc
// @Summary Delete cart items in batch
// @Description Soft delete cart items by ids
// @Tags buyer-cart
// @Accept json
// @Produce json
// @Param request body deleteBatchRequest true "batch ids payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/cart/batch [delete]
func (h *CartHandler) DeleteCartBatch(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req deleteBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.cartService.DeleteBatch(c.Request.Context(), userID, req.IDs); err != nil {
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

// SelectAllCart godoc
// @Summary Select or unselect all cart items
// @Description Set selected for all cart items
// @Tags buyer-cart
// @Accept json
// @Produce json
// @Param request body selectAllRequest true "select all payload"
// @Success 200 {object} response.Envelope
// @Router /buyer/cart/select-all [put]
func (h *CartHandler) SelectAllCart(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	var req selectAllRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.cartService.SetSelectAll(c.Request.Context(), userID, req.Selected); err != nil {
		handleCartServiceError(c, err)
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// ClearInvalidCart godoc
// @Summary Clear invalid cart items
// @Description Remove cart items that are unavailable or out of stock
// @Tags buyer-cart
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /buyer/cart/invalid [delete]
func (h *CartHandler) ClearInvalidCart(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	deletedCount, err := h.cartService.ClearInvalid(c.Request.Context(), userID)
	if err != nil {
		abortCartSystemError(c)
		return
	}
	response.Success(c, gin.H{"deleted_count": deletedCount})
}

func handleCartServiceError(c *gin.Context, err error) {
	switch err {
	case service.ErrCartInvalidInput:
		response.Fail(c, 10001, err.Error())
	case service.ErrCartItemNotFound:
		response.Fail(c, 10001, err.Error())
	case service.ErrProductNotFound:
		response.Fail(c, 30001, "product not found or off shelf")
	case service.ErrProductStockNotEnough:
		response.Fail(c, 30002, err.Error())
	case service.ErrCartStepInvalid:
		response.Fail(c, 10001, err.Error())
	case service.ErrCartItemLimit:
		response.Fail(c, 20005, err.Error())
	case service.ErrSellerShopNotFound:
		response.Fail(c, 50001, "shop not approved or closed")
	default:
		abortCartSystemError(c)
	}
}

func abortCartSystemError(c *gin.Context) {
	c.JSON(http.StatusOK, response.Envelope{
		Code:    10000,
		Message: "system error",
		Data:    nil,
	})
}

func parseCartID(raw string) (uint64, bool) {
	id, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || id == 0 {
		return 0, false
	}
	return id, true
}
