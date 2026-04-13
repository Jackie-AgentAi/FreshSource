package common

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type SMSHandler struct {
	smsService *service.SMSService
}

type sendSMSRequest struct {
	Phone string `json:"phone"`
	Scene string `json:"scene"`
}

func NewSMSHandler(smsService *service.SMSService) *SMSHandler {
	return &SMSHandler{smsService: smsService}
}

// SendSMSCode godoc
// @Summary Send SMS verification code
// @Description Send verification code for register/login with 60s cooldown and daily limit
// @Tags common-sms
// @Accept json
// @Produce json
// @Param request body sendSMSRequest true "phone and scene(register/login)"
// @Success 200 {object} response.Envelope
// @Router /common/sms/send [post]
func (h *SMSHandler) SendSMSCode(c *gin.Context) {
	var req sendSMSRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}

	result, err := h.smsService.SendCode(c.Request.Context(), service.SendSMSInput{
		Phone: req.Phone,
		Scene: req.Scene,
	})
	if err != nil {
		switch err {
		case service.ErrSMSRateLimited, service.ErrSMSDailyLimited:
			response.Fail(c, 10004, "request too frequent")
			return
		case service.ErrSMSInvalidPhone, service.ErrSMSInvalidScene:
			response.Fail(c, 10001, "invalid request params")
			return
		default:
			c.JSON(http.StatusOK, response.Envelope{
				Code:    10000,
				Message: "system error",
				Data:    nil,
			})
			return
		}
	}

	data := gin.H{
		"phone":     result.Phone,
		"scene":     result.Scene,
		"expire_in": result.ExpireIn,
	}
	if result.MockCode != "" {
		data["mock_code"] = result.MockCode
	}

	response.Success(c, data)
}
