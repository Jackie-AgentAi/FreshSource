package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"

	"freshmart/config"
	_ "freshmart/docs/swagger"
	commonhandler "freshmart/internal/handler/common"
	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
)

const (
	roleBuyer  = 1
	roleSeller = 2
	roleAdmin  = 3
)

func New(log *zap.Logger, cfg config.Config, txDemoHandler *commonhandler.TxDemoHandler) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Recovery(), middleware.RequestLogger(log), middleware.CORS())

	engine.GET("/health", commonhandler.Health)
	engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	apiV1 := engine.Group("/api/v1")
	apiV1.Use(middleware.RateLimit(cfg.RateLimitPerMinute))
	{
		authHandler := commonhandler.NewAuthHandler(cfg)

		commonGroup := apiV1.Group("/common")
		commonGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "common"})
		})
		commonGroup.GET("/auth/dev-token", authHandler.DevToken)
		if txDemoHandler != nil {
			commonGroup.POST("/tx-demo/commit", txDemoHandler.Commit)
			commonGroup.POST("/tx-demo/rollback", txDemoHandler.Rollback)
		}

		buyerGroup := apiV1.Group("/buyer", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleBuyer))
		buyerGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "buyer"})
		})

		sellerGroup := apiV1.Group("/seller", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleSeller))
		sellerGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "seller"})
		})

		adminGroup := apiV1.Group("/admin", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleAdmin))
		adminGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "admin"})
		})
	}

	engine.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, response.Envelope{
			Code:    10000,
			Message: "route not found",
			Data:    nil,
		})
	})

	return engine
}
