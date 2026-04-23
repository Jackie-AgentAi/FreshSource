package seller

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type NotificationHandler struct {
	notificationService *service.SellerNotificationService
}

func NewNotificationHandler(notificationService *service.SellerNotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

// ListNotifications godoc
// @Summary Seller notification list
// @Tags seller-notification
// @Produce json
// @Param type query string false "order|product|system"
// @Param page query int false "page"
// @Param page_size query int false "page_size"
// @Router /seller/notifications [get]
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	page, pageSize := parsePagination(c)
	data, err := h.notificationService.List(c.Request.Context(), userID, service.SellerNotificationListQuery{
		Type:     c.Query("type"),
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		handleSellerNotificationError(c, err)
		return
	}
	response.Success(c, data)
}

// GetUnreadCount godoc
// @Summary Seller unread notification count
// @Tags seller-notification
// @Produce json
// @Router /seller/notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	data, err := h.notificationService.UnreadCount(c.Request.Context(), userID)
	if err != nil {
		handleSellerNotificationError(c, err)
		return
	}
	response.Success(c, data)
}

// MarkRead godoc
// @Summary Mark seller notification as read
// @Tags seller-notification
// @Produce json
// @Param id path int true "notification id"
// @Router /seller/notifications/{id}/read [put]
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	id, ok := parseID(c.Param("id"))
	if !ok {
		response.Fail(c, 10001, "invalid notification id")
		return
	}
	if err := h.notificationService.MarkRead(c.Request.Context(), userID, id); err != nil {
		handleSellerNotificationError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// MarkAllRead godoc
// @Summary Mark all seller notifications as read
// @Tags seller-notification
// @Produce json
// @Router /seller/notifications/read-all [put]
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	if err := h.notificationService.MarkAllRead(c.Request.Context(), userID); err != nil {
		handleSellerNotificationError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleSellerNotificationError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrSellerNotificationNotFound):
		response.Fail(c, 10003, err.Error())
	case errors.Is(err, service.ErrSellerShopNotFound):
		response.Fail(c, 50001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{
			Code:    10000,
			Message: "system error",
			Data:    nil,
		})
	}
}
