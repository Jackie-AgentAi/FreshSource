package seller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
	"freshmart/internal/service"
)

type DashboardHandler struct {
	dashboardService *service.SellerDashboardService
}

func NewDashboardHandler(dashboardService *service.SellerDashboardService) *DashboardHandler {
	return &DashboardHandler{dashboardService: dashboardService}
}

// GetDashboard godoc
// @Summary Seller dashboard overview
// @Tags seller-dashboard
// @Produce json
// @Param range query string false "day|week|month"
// @Router /seller/dashboard [get]
func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	userID, _, ok := middleware.GetAuthContext(c)
	if !ok {
		response.Fail(c, 10002, "token invalid or expired")
		return
	}
	data, err := h.dashboardService.Get(c.Request.Context(), userID, c.Query("range"))
	if err != nil {
		switch err {
		case service.ErrSellerShopNotFound:
			response.Fail(c, 50001, err.Error())
		default:
			c.JSON(http.StatusOK, response.Envelope{
				Code:    10000,
				Message: "system error",
				Data:    nil,
			})
		}
		return
	}
	response.Success(c, data)
}
