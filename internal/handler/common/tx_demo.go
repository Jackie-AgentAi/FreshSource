package common

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type TxDemoHandler struct {
	userService *service.UserService
}

type txDemoRequest struct {
	Phone string `json:"phone"`
}

func NewTxDemoHandler(userService *service.UserService) *TxDemoHandler {
	return &TxDemoHandler{userService: userService}
}

// Commit godoc
// @Summary Transaction commit demo
// @Description Create one user in a transaction and commit
// @Tags common-tx-demo
// @Accept json
// @Produce json
// @Param request body txDemoRequest false "optional phone for demo user"
// @Success 200 {object} response.Envelope
// @Router /common/tx-demo/commit [post]
func (h *TxDemoHandler) Commit(c *gin.Context) {
	var req txDemoRequest
	_ = c.ShouldBindJSON(&req)

	phone := normalizePhone(req.Phone)
	user, err := h.userService.DemoCreateUserCommit(c.Request.Context(), phone)
	if err != nil {
		if err == service.ErrPhoneAlreadyExists {
			response.Fail(c, 20001, "phone already registered")
			return
		}
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: err.Error(), Data: nil})
		return
	}

	response.Success(c, gin.H{
		"mode":    "commit",
		"phone":   user.Phone,
		"user_id": user.ID,
	})
}

// Rollback godoc
// @Summary Transaction rollback demo
// @Description Create one user and force rollback in one transaction
// @Tags common-tx-demo
// @Accept json
// @Produce json
// @Param request body txDemoRequest false "optional phone for demo user"
// @Success 200 {object} response.Envelope
// @Router /common/tx-demo/rollback [post]
func (h *TxDemoHandler) Rollback(c *gin.Context) {
	var req txDemoRequest
	_ = c.ShouldBindJSON(&req)

	phone := normalizePhone(req.Phone)
	err := h.userService.DemoCreateUserRollback(c.Request.Context(), phone)
	if err != nil {
		if err == service.ErrPhoneAlreadyExists {
			response.Fail(c, 20001, "phone already registered")
			return
		}
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: err.Error(), Data: nil})
		return
	}

	response.Success(c, gin.H{
		"mode":        "rollback",
		"phone":       phone,
		"rolled_back": true,
	})
}

func normalizePhone(phone string) string {
	clean := strings.TrimSpace(phone)
	if clean != "" {
		return clean
	}
	return "199" + time.Now().Format("0102150405")
}
