package seller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

// GetCategories godoc
// @Summary Seller category tree
// @Description Get visible two-level category tree for product publishing
// @Tags seller-category
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /seller/categories [get]
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	tree, err := h.categoryService.GetBuyerTree(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{
			Code:    10000,
			Message: "system error",
			Data:    nil,
		})
		return
	}
	response.Success(c, tree)
}
