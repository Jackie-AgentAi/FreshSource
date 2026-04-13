package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type CategoryHandler struct {
	categoryService *service.CategoryService
}

type saveCategoryRequest struct {
	ParentID  uint64 `json:"parent_id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	SortOrder int    `json:"sort_order"`
	Status    int    `json:"status"`
}

func NewCategoryHandler(categoryService *service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categoryService: categoryService}
}

// GetCategories godoc
// @Summary Admin category tree
// @Description Get full category tree for admin
// @Tags admin-category
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /admin/categories [get]
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	tree, err := h.categoryService.GetAdminTree(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, tree)
}

// CreateCategory godoc
// @Summary Create category
// @Description Create category from admin
// @Tags admin-category
// @Accept json
// @Produce json
// @Param request body saveCategoryRequest true "category payload"
// @Success 200 {object} response.Envelope
// @Router /admin/categories [post]
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req saveCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	category, err := h.categoryService.Create(c.Request.Context(), service.SaveCategoryInput{
		ParentID:  req.ParentID,
		Name:      req.Name,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
		Status:    req.Status,
	})
	if err != nil {
		switch err {
		case service.ErrCategoryNameRequired, service.ErrCategoryParentNotFound:
			response.Fail(c, 10001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, category)
}

// UpdateCategory godoc
// @Summary Update category
// @Description Update category from admin
// @Tags admin-category
// @Accept json
// @Produce json
// @Param id path int true "category id"
// @Param request body saveCategoryRequest true "category payload"
// @Success 200 {object} response.Envelope
// @Router /admin/categories/{id} [put]
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, ok := parseCategoryID(c)
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	var req saveCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	err := h.categoryService.Update(c.Request.Context(), id, service.SaveCategoryInput{
		ParentID:  req.ParentID,
		Name:      req.Name,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
		Status:    req.Status,
	})
	if err != nil {
		switch err {
		case service.ErrCategoryNameRequired, service.ErrCategoryParentNotFound, service.ErrCategoryNotFound:
			response.Fail(c, 10001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, gin.H{"updated": true})
}

// DeleteCategory godoc
// @Summary Delete category
// @Description Delete category from admin, blocked when category has children or products
// @Tags admin-category
// @Produce json
// @Param id path int true "category id"
// @Success 200 {object} response.Envelope
// @Router /admin/categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, ok := parseCategoryID(c)
	if !ok {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	err := h.categoryService.Delete(c.Request.Context(), id)
	if err != nil {
		switch err {
		case service.ErrCategoryNotFound:
			response.Fail(c, 10001, err.Error())
		case service.ErrCategoryDeleteBlocked:
			response.Fail(c, 10001, "category has children or product references")
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, gin.H{"deleted": true})
}

func parseCategoryID(c *gin.Context) (uint64, bool) {
	rawID := c.Param("id")
	id, err := strconv.ParseUint(rawID, 10, 64)
	if err != nil || id == 0 {
		return 0, false
	}
	return id, true
}
