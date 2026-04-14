package admin

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type ConfigHandler struct {
	adminSystemConfigService *service.AdminSystemConfigService
}

func NewConfigHandler(adminSystemConfigService *service.AdminSystemConfigService) *ConfigHandler {
	return &ConfigHandler{adminSystemConfigService: adminSystemConfigService}
}

type configUpdateBody struct {
	ConfigValue string `json:"config_value"`
}

// ListConfigs godoc
// @Summary Admin system config list
// @Tags admin-config
// @Produce json
// @Router /admin/configs [get]
func (h *ConfigHandler) ListConfigs(c *gin.Context) {
	list, err := h.adminSystemConfigService.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
		return
	}
	response.Success(c, gin.H{"list": list})
}

// UpdateConfig godoc
// @Summary Admin update system config by key
// @Tags admin-config
// @Accept json
// @Produce json
// @Param key path string true "config_key"
// @Param request body configUpdateBody true "body"
// @Router /admin/configs/{key} [put]
func (h *ConfigHandler) UpdateConfig(c *gin.Context) {
	key := strings.TrimSpace(c.Param("key"))
	var req configUpdateBody
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, 10001, "invalid request params")
		return
	}
	if err := h.adminSystemConfigService.UpdateValue(c.Request.Context(), key, req.ConfigValue); err != nil {
		handleConfigError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

func handleConfigError(c *gin.Context, err error) {
	switch err {
	case service.ErrSystemConfigNotFound:
		response.Fail(c, 10001, err.Error())
	case service.ErrSystemConfigInvalidValue:
		response.Fail(c, 10001, err.Error())
	default:
		c.JSON(http.StatusOK, response.Envelope{Code: 10000, Message: "system error", Data: nil})
	}
}
