package admin

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type UserHandler struct {
	adminUserService *service.AdminUserService
}

func NewUserHandler(adminUserService *service.AdminUserService) *UserHandler {
	return &UserHandler{adminUserService: adminUserService}
}

type updateUserStatusBody struct {
	Status int `json:"status"`
}

// ListUsers godoc
// @Summary Admin user list
// @Tags admin-user
// @Produce json
// @Param role query int false "role filter"
// @Param status query int false "status filter"
// @Param page query int false "page"
// @Param page_size query int false "page size"
// @Router /admin/users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	var rolePtr *int
	if raw := c.Query("role"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid role")
			return
		}
		rolePtr = &v
	}
	var statusPtr *int
	if raw := c.Query("status"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.Fail(c, 10001, "invalid status")
			return
		}
		statusPtr = &v
	}
	data, err := h.adminUserService.List(c.Request.Context(), service.AdminUserListQuery{
		Role:     rolePtr,
		Status:   statusPtr,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		switch err {
		case service.ErrAdminUserBadRole, service.ErrAdminUserBadStatus:
			response.Fail(c, 10001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, data)
}

// UpdateUserStatus godoc
// @Summary Admin update user status
// @Tags admin-user
// @Accept json
// @Produce json
// @Param id path int true "user id"
// @Param request body updateUserStatusBody true "status payload"
// @Router /admin/users/{id}/status [put]
func (h *UserHandler) UpdateUserStatus(c *gin.Context) {
	id, ok := parseUintPath(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid user id")
		return
	}
	var body updateUserStatusBody
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.adminUserService.UpdateStatus(c.Request.Context(), id, body.Status); err != nil {
		switch err {
		case service.ErrAdminUserNotFound:
			response.Fail(c, 10001, err.Error())
		case service.ErrAdminUserBadStatus:
			response.Fail(c, 10001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}
	response.Success(c, gin.H{"ok": true})
}
