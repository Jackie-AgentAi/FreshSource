package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"

	"freshmart/config"
	_ "freshmart/docs/swagger"
	adminhandler "freshmart/internal/handler/admin"
	buyerhandler "freshmart/internal/handler/buyer"
	commonhandler "freshmart/internal/handler/common"
	sellerhandler "freshmart/internal/handler/seller"
	"freshmart/internal/middleware"
	"freshmart/internal/pkg/response"
)

const (
	roleBuyer  = 1
	roleSeller = 2
	roleAdmin  = 3
)

func New(
	log *zap.Logger,
	cfg config.Config,
	txDemoHandler *commonhandler.TxDemoHandler,
	smsHandler *commonhandler.SMSHandler,
	authHandler *commonhandler.AuthHandler,
	uploadHandler *commonhandler.UploadHandler,
	buyerCategoryHandler *buyerhandler.CategoryHandler,
	buyerProductHandler *buyerhandler.ProductHandler,
	buyerAddressHandler *buyerhandler.AddressHandler,
	buyerCartHandler *buyerhandler.CartHandler,
	buyerOrderConfirmHandler *buyerhandler.OrderConfirmHandler,
	buyerOrderCreateHandler *buyerhandler.OrderCreateHandler,
	buyerOrderHandler *buyerhandler.BuyerOrderHandler,
	adminCategoryHandler *adminhandler.CategoryHandler,
	adminShopHandler *adminhandler.ShopHandler,
	sellerProductHandler *sellerhandler.ProductHandler,
	sellerOrderHandler *sellerhandler.OrderHandler,
	sellerShopHandler *sellerhandler.ShopHandler,
) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Recovery(), middleware.RequestLogger(log), middleware.CORS())

	engine.GET("/health", commonhandler.Health)
	engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	engine.Static("/uploads", cfg.UploadDir)

	apiV1 := engine.Group("/api/v1")
	apiV1.Use(middleware.RateLimit(cfg.RateLimitPerMinute))
	{
		commonGroup := apiV1.Group("/common")
		commonGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "common"})
		})
		if authHandler != nil {
			commonGroup.GET("/auth/dev-token", authHandler.DevToken)
			commonGroup.POST("/auth/register", authHandler.Register)
			commonGroup.POST("/auth/login", authHandler.Login)
			commonGroup.POST("/auth/login-sms", authHandler.LoginSMS)
			commonGroup.POST("/auth/refresh", authHandler.Refresh)
			commonGroup.POST("/auth/logout", authHandler.Logout)
		}
		if smsHandler != nil {
			commonGroup.POST("/sms/send", smsHandler.SendSMSCode)
		}
		if uploadHandler != nil {
			commonGroup.POST("/upload/image", uploadHandler.UploadImage)
			commonGroup.POST("/upload/images", uploadHandler.UploadImages)
		}
		if txDemoHandler != nil {
			commonGroup.POST("/tx-demo/commit", txDemoHandler.Commit)
			commonGroup.POST("/tx-demo/rollback", txDemoHandler.Rollback)
		}

		buyerGroup := apiV1.Group("/buyer", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleBuyer))
		buyerGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "buyer"})
		})
		if buyerCategoryHandler != nil {
			buyerGroup.GET("/categories", buyerCategoryHandler.GetCategories)
		}
		if buyerProductHandler != nil {
			buyerGroup.GET("/products", buyerProductHandler.ListProducts)
			buyerGroup.GET("/products/search", buyerProductHandler.SearchProducts)
			buyerGroup.GET("/products/:id", buyerProductHandler.GetProductDetail)
			buyerGroup.GET("/shops/:id", buyerProductHandler.GetShopHomepage)
		}
		if buyerAddressHandler != nil {
			buyerGroup.GET("/addresses", buyerAddressHandler.ListAddresses)
			buyerGroup.POST("/addresses", buyerAddressHandler.CreateAddress)
			buyerGroup.PUT("/addresses/:id", buyerAddressHandler.UpdateAddress)
			buyerGroup.DELETE("/addresses/:id", buyerAddressHandler.DeleteAddress)
			buyerGroup.PUT("/addresses/:id/default", buyerAddressHandler.SetDefaultAddress)
		}
		if buyerCartHandler != nil {
			buyerGroup.GET("/cart", buyerCartHandler.ListCart)
			buyerGroup.POST("/cart", buyerCartHandler.AddToCart)
			buyerGroup.PUT("/cart/:id", buyerCartHandler.UpdateCartQuantity)
			buyerGroup.DELETE("/cart/:id", buyerCartHandler.DeleteCartItem)
			buyerGroup.DELETE("/cart/batch", buyerCartHandler.DeleteCartBatch)
			buyerGroup.PUT("/cart/select-all", buyerCartHandler.SelectAllCart)
			buyerGroup.DELETE("/cart/invalid", buyerCartHandler.ClearInvalidCart)
		}
		if buyerOrderConfirmHandler != nil {
			buyerGroup.POST("/orders/confirm", buyerOrderConfirmHandler.ConfirmOrder)
		}
		if buyerOrderCreateHandler != nil {
			buyerGroup.POST("/orders", buyerOrderCreateHandler.CreateOrders)
		}
		if buyerOrderHandler != nil {
			buyerGroup.GET("/orders", buyerOrderHandler.ListOrders)
			buyerGroup.GET("/orders/:id", buyerOrderHandler.GetOrder)
			buyerGroup.PUT("/orders/:id/cancel", buyerOrderHandler.CancelOrder)
			buyerGroup.PUT("/orders/:id/receive", buyerOrderHandler.ReceiveOrder)
			buyerGroup.POST("/orders/:id/reorder", buyerOrderHandler.Reorder)
			buyerGroup.DELETE("/orders/:id", buyerOrderHandler.DeleteOrder)
		}

		sellerGroup := apiV1.Group("/seller", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleSeller))
		sellerGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "seller"})
		})
		if sellerShopHandler != nil {
			sellerGroup.POST("/shop/apply", sellerShopHandler.ApplyShop)
			sellerGroup.GET("/shop/audit-status", sellerShopHandler.GetAuditStatus)
			sellerGroup.PUT("/shop", sellerShopHandler.UpdateShop)
			sellerGroup.PUT("/shop/status", sellerShopHandler.UpdateShopStatus)
		}
		if sellerProductHandler != nil {
			sellerGroup.GET("/products", sellerProductHandler.ListProducts)
			sellerGroup.POST("/products", sellerProductHandler.CreateProduct)
			sellerGroup.PUT("/products/:id", sellerProductHandler.UpdateProduct)
			sellerGroup.PUT("/products/:id/status", sellerProductHandler.UpdateProductStatus)
			sellerGroup.PUT("/products/batch-price", sellerProductHandler.BatchUpdatePrice)
			sellerGroup.PUT("/products/:id/stock", sellerProductHandler.AdjustStock)
			sellerGroup.DELETE("/products/:id", sellerProductHandler.DeleteProduct)
		}
		if sellerOrderHandler != nil {
			sellerGroup.GET("/orders", sellerOrderHandler.ListOrders)
			sellerGroup.GET("/orders/:id", sellerOrderHandler.GetOrder)
			sellerGroup.PUT("/orders/:id/confirm", sellerOrderHandler.ConfirmOrder)
			sellerGroup.PUT("/orders/:id/reject", sellerOrderHandler.RejectOrder)
			sellerGroup.PUT("/orders/:id/deliver", sellerOrderHandler.DeliverOrder)
			sellerGroup.PUT("/orders/:id/arrived", sellerOrderHandler.ArrivedOrder)
			sellerGroup.PUT("/orders/:id/remark", sellerOrderHandler.UpdateRemark)
		}

		adminGroup := apiV1.Group("/admin", middleware.AuthRequired(cfg.JWTSecret), middleware.RequireRole(roleAdmin))
		adminGroup.GET("/ping", func(c *gin.Context) {
			response.Success(c, gin.H{"scope": "admin"})
		})
		if adminCategoryHandler != nil {
			adminGroup.GET("/categories", adminCategoryHandler.GetCategories)
			adminGroup.POST("/categories", adminCategoryHandler.CreateCategory)
			adminGroup.PUT("/categories/:id", adminCategoryHandler.UpdateCategory)
			adminGroup.DELETE("/categories/:id", adminCategoryHandler.DeleteCategory)
		}
		if adminShopHandler != nil {
			adminGroup.GET("/shops", adminShopHandler.ListShops)
			adminGroup.GET("/shops/:id", adminShopHandler.GetShop)
			adminGroup.PUT("/shops/:id/audit", adminShopHandler.AuditShop)
			adminGroup.PUT("/shops/:id/close", adminShopHandler.CloseShop)
		}
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
