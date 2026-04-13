package common

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"freshmart/config"
	"freshmart/internal/pkg/auth"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

const roleBuyer = 1

type AuthHandler struct {
	cfg         config.Config
	authService *service.AuthService
}

type registerRequest struct {
	Phone    string `json:"phone"`
	Code     string `json:"code"`
	Password string `json:"password"`
}

type loginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type loginSMSRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func NewAuthHandler(cfg config.Config, authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		cfg:         cfg,
		authService: authService,
	}
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

// Register godoc
// @Summary Register account
// @Description Register by phone + sms code + password
// @Tags common-auth
// @Accept json
// @Produce json
// @Param request body registerRequest true "register payload"
// @Success 200 {object} response.Envelope
// @Router /common/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	if h.authService == nil {
		response.Fail(c, 10000, "auth service unavailable")
		return
	}

	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	tokens, user, err := h.authService.Register(c.Request.Context(), req.Phone, req.Code, req.Password)
	if err != nil {
		switch err {
		case service.ErrPhoneRegistered:
			response.Fail(c, 20001, "phone already registered")
		case service.ErrInvalidSMSCode:
			response.Fail(c, 20003, "verification code invalid or expired")
		case service.ErrInvalidPassword:
			response.Fail(c, 10001, "invalid request params")
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}

	response.Success(c, gin.H{
		"user": gin.H{
			"id":    user.ID,
			"phone": user.Phone,
			"role":  user.Role,
		},
		"access_token":       tokens.AccessToken,
		"refresh_token":      tokens.RefreshToken,
		"access_expires_in":  tokens.AccessExpiresIn,
		"refresh_expires_in": tokens.RefreshExpiresIn,
	})
}

// Login godoc
// @Summary Login by password
// @Description Login by phone + password
// @Tags common-auth
// @Accept json
// @Produce json
// @Param request body loginRequest true "login payload"
// @Success 200 {object} response.Envelope
// @Router /common/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	if h.authService == nil {
		response.Fail(c, 10000, "auth service unavailable")
		return
	}

	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	tokens, user, err := h.authService.LoginByPassword(c.Request.Context(), req.Phone, req.Password)
	if err != nil {
		if err == service.ErrInvalidCredential {
			response.Fail(c, 20002, "account or password error")
			return
		}
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}

	response.Success(c, gin.H{
		"user": gin.H{
			"id":    user.ID,
			"phone": user.Phone,
			"role":  user.Role,
		},
		"access_token":       tokens.AccessToken,
		"refresh_token":      tokens.RefreshToken,
		"access_expires_in":  tokens.AccessExpiresIn,
		"refresh_expires_in": tokens.RefreshExpiresIn,
	})
}

// LoginSMS godoc
// @Summary Login by sms code
// @Description Login by phone + sms verification code
// @Tags common-auth
// @Accept json
// @Produce json
// @Param request body loginSMSRequest true "sms login payload"
// @Success 200 {object} response.Envelope
// @Router /common/auth/login-sms [post]
func (h *AuthHandler) LoginSMS(c *gin.Context) {
	if h.authService == nil {
		response.Fail(c, 10000, "auth service unavailable")
		return
	}

	var req loginSMSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	tokens, user, err := h.authService.LoginBySMS(c.Request.Context(), req.Phone, req.Code)
	if err != nil {
		switch err {
		case service.ErrInvalidSMSCode:
			response.Fail(c, 20003, "verification code invalid or expired")
		case service.ErrInvalidCredential:
			response.Fail(c, 20002, "account or password error")
		default:
			c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		}
		return
	}

	response.Success(c, gin.H{
		"user": gin.H{
			"id":    user.ID,
			"phone": user.Phone,
			"role":  user.Role,
		},
		"access_token":       tokens.AccessToken,
		"refresh_token":      tokens.RefreshToken,
		"access_expires_in":  tokens.AccessExpiresIn,
		"refresh_expires_in": tokens.RefreshExpiresIn,
	})
}

// Refresh godoc
// @Summary Refresh tokens
// @Description Refresh access token by refresh token
// @Tags common-auth
// @Accept json
// @Produce json
// @Param request body refreshRequest true "refresh payload"
// @Success 200 {object} response.Envelope
// @Router /common/auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	if h.authService == nil {
		response.Fail(c, 10000, "auth service unavailable")
		return
	}

	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	tokens, err := h.authService.Refresh(strings.TrimSpace(req.RefreshToken))
	if err != nil {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}

	response.Success(c, gin.H{
		"access_token":       tokens.AccessToken,
		"refresh_token":      tokens.RefreshToken,
		"access_expires_in":  tokens.AccessExpiresIn,
		"refresh_expires_in": tokens.RefreshExpiresIn,
	})
}

// Logout godoc
// @Summary Logout
// @Description Invalidate refresh token
// @Tags common-auth
// @Accept json
// @Produce json
// @Param request body refreshRequest true "logout payload"
// @Success 200 {object} response.Envelope
// @Router /common/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	if h.authService == nil {
		response.Fail(c, 10000, "auth service unavailable")
		return
	}

	var req refreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	h.authService.Logout(req.RefreshToken)
	response.Success(c, gin.H{"logged_out": true})
}
