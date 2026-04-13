package common

import (
	"time"

	"github.com/gin-gonic/gin"

	"freshmart/config"
	"freshmart/internal/pkg/auth"
	"freshmart/internal/pkg/response"
)

const roleBuyer = 1

type AuthHandler struct {
	cfg config.Config
}

func NewAuthHandler(cfg config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

// DevToken godoc
// @Summary Development token
// @Description Generate buyer access token for local integration tests (disabled in production)
// @Tags common-auth
// @Produce json
// @Success 200 {object} response.Envelope
// @Router /common/auth/dev-token [get]
func (h *AuthHandler) DevToken(c *gin.Context) {
	if h.cfg.Env == "production" {
		response.Fail(c, 10003, "permission denied")
		return
	}

	token, err := auth.NewAccessToken(10001, roleBuyer, h.cfg.JWTSecret, 2*time.Hour)
	if err != nil {
		response.Fail(c, 10000, "system error")
		return
	}
	response.Success(c, gin.H{
		"access_token": token,
		"role":         roleBuyer,
		"user_id":      10001,
		"expires_in":   7200,
	})
}
