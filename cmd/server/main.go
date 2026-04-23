package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.uber.org/zap"

	"freshmart/config"
	adminhandler "freshmart/internal/handler/admin"
	buyerhandler "freshmart/internal/handler/buyer"
	commonhandler "freshmart/internal/handler/common"
	sellerhandler "freshmart/internal/handler/seller"
	"freshmart/internal/pkg/db"
	"freshmart/internal/pkg/logger"
	"freshmart/internal/repository"
	"freshmart/internal/service"
	"freshmart/router"
)

// @title FreshMart API
// @version v1
// @description FreshMart backend API for B2B fresh ordering
// @BasePath /api/v1
// @schemes http https
func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log, err := logger.New(cfg.Env)
	if err != nil {
		panic(err)
	}
	defer func() {
		_ = log.Sync()
	}()

	var txDemoHandler *commonhandler.TxDemoHandler
	var authHandler *commonhandler.AuthHandler
	var buyerCategoryHandler *buyerhandler.CategoryHandler
	var buyerProductHandler *buyerhandler.ProductHandler
	var buyerAddressHandler *buyerhandler.AddressHandler
	var buyerCartHandler *buyerhandler.CartHandler
	var buyerOrderConfirmHandler *buyerhandler.OrderConfirmHandler
	var buyerOrderCreateHandler *buyerhandler.OrderCreateHandler
	var buyerOrderHandler *buyerhandler.BuyerOrderHandler
	var adminCategoryHandler *adminhandler.CategoryHandler
	var adminShopHandler *adminhandler.ShopHandler
	var adminUserHandler *adminhandler.UserHandler
	var adminProductHandler *adminhandler.ProductHandler
	var adminOrderHandler *adminhandler.OrderHandler
	var adminBannerHandler *adminhandler.BannerHandler
	var adminConfigHandler *adminhandler.ConfigHandler
	var sellerProductHandler *sellerhandler.ProductHandler
	var sellerOrderHandler *sellerhandler.OrderHandler
	var sellerShopHandler *sellerhandler.ShopHandler
	var sellerCategoryHandler *sellerhandler.CategoryHandler
	var sellerDashboardHandler *sellerhandler.DashboardHandler
	var sellerNotificationHandler *sellerhandler.NotificationHandler
	smsService := service.NewSMSService(cfg.Env)
	smsHandler := commonhandler.NewSMSHandler(smsService)
	uploadService := service.NewUploadService(cfg.UploadDir)
	uploadHandler := commonhandler.NewUploadHandler(uploadService)
	if cfg.DatabaseDSN != "" {
		dbConn, err := db.NewMySQL(cfg.DatabaseDSN)
		if err != nil {
			log.Fatal("database connection failed", zap.Error(err))
		}

		txManager := repository.NewTxManager(dbConn)
		userRepo := repository.NewUserRepository(dbConn)
		userService := service.NewUserService(txManager, userRepo)
		txDemoHandler = commonhandler.NewTxDemoHandler(userService)
		authService := service.NewAuthService(userRepo, smsService, cfg.JWTSecret)
		authHandler = commonhandler.NewAuthHandler(cfg, authService)
		categoryRepo := repository.NewCategoryRepository(dbConn)
		categoryService := service.NewCategoryService(categoryRepo)
		buyerCategoryHandler = buyerhandler.NewCategoryHandler(categoryService)
		adminCategoryHandler = adminhandler.NewCategoryHandler(categoryService)
		sellerCategoryHandler = sellerhandler.NewCategoryHandler(categoryService)

		shopRepo := repository.NewShopRepository(dbConn)
		shopSvc := service.NewShopService(shopRepo)
		adminShopHandler = adminhandler.NewShopHandler(shopSvc)
		sellerShopHandler = sellerhandler.NewShopHandler(shopSvc)
		adminUserService := service.NewAdminUserService(userRepo)
		adminUserHandler = adminhandler.NewUserHandler(adminUserService)
		productRepo := repository.NewProductRepository(dbConn)
		productService := service.NewProductService(productRepo, categoryRepo, shopRepo)
		adminProductHandler = adminhandler.NewProductHandler(productService)
		sellerProductHandler = sellerhandler.NewProductHandler(productService)
		buyerProductHandler = buyerhandler.NewProductHandler(productService)

		addressRepo := repository.NewAddressRepository(dbConn)
		addressService := service.NewAddressService(addressRepo)
		buyerAddressHandler = buyerhandler.NewAddressHandler(addressService)

		cartRepo := repository.NewCartRepository(dbConn)
		cartService := service.NewCartService(cartRepo, productRepo, shopRepo)
		buyerCartHandler = buyerhandler.NewCartHandler(cartService)

		systemConfigRepo := repository.NewSystemConfigRepository(dbConn)
		orderConfirmService := service.NewOrderConfirmService(cartRepo, productRepo, shopRepo, addressRepo, systemConfigRepo)
		buyerOrderConfirmHandler = buyerhandler.NewOrderConfirmHandler(orderConfirmService)
		orderRepo := repository.NewOrderRepository(dbConn)
		orderCreateService := service.NewOrderCreateService(txManager, cartRepo, productRepo, shopRepo, addressRepo, systemConfigRepo, orderRepo)
		buyerOrderCreateHandler = buyerhandler.NewOrderCreateHandler(orderCreateService)
		buyerOrderService := service.NewBuyerOrderService(txManager, orderRepo, productRepo, shopRepo, cartService)
		buyerOrderHandler = buyerhandler.NewBuyerOrderHandler(buyerOrderService)
		sellerOrderService := service.NewSellerOrderService(txManager, orderRepo, productRepo)
		sellerOrderHandler = sellerhandler.NewOrderHandler(sellerOrderService)
		notificationRepo := repository.NewNotificationRepository(dbConn)
		sellerNotificationService := service.NewSellerNotificationService(notificationRepo, orderRepo, productRepo, shopRepo)
		sellerNotificationHandler = sellerhandler.NewNotificationHandler(sellerNotificationService)
		sellerDashboardService := service.NewSellerDashboardService(orderRepo, productRepo, shopRepo, sellerNotificationService)
		sellerDashboardHandler = sellerhandler.NewDashboardHandler(sellerDashboardService)
		adminOrderService := service.NewAdminOrderService(txManager, orderRepo, shopRepo, productRepo)
		adminOrderHandler = adminhandler.NewOrderHandler(adminOrderService)

		bannerRepo := repository.NewBannerRepository(dbConn)
		bannerService := service.NewBannerService(bannerRepo)
		adminBannerHandler = adminhandler.NewBannerHandler(bannerService)
		adminSystemConfigService := service.NewAdminSystemConfigService(systemConfigRepo)
		adminConfigHandler = adminhandler.NewConfigHandler(adminSystemConfigService)

		if !cfg.OrderSchedulerDisabled {
			scheduleSvc := service.NewOrderScheduleService(txManager, orderRepo, productRepo, systemConfigRepo)
			log.Info("order schedule: enabled", zap.Duration("tick", time.Minute))
			go runOrderScheduleLoop(log, scheduleSvc)
		}
	} else {
		log.Warn("database dsn is empty, tx demo and auth endpoints disabled")
		authHandler = commonhandler.NewAuthHandler(cfg, nil)
	}

	engine := router.New(
		log,
		cfg,
		txDemoHandler,
		smsHandler,
		authHandler,
		uploadHandler,
		buyerCategoryHandler,
		buyerProductHandler,
		buyerAddressHandler,
		buyerCartHandler,
		buyerOrderConfirmHandler,
		buyerOrderCreateHandler,
		buyerOrderHandler,
		adminCategoryHandler,
		adminShopHandler,
		adminUserHandler,
		adminProductHandler,
		adminOrderHandler,
		adminBannerHandler,
		adminConfigHandler,
		sellerProductHandler,
		sellerOrderHandler,
		sellerShopHandler,
		sellerCategoryHandler,
		sellerDashboardHandler,
		sellerNotificationHandler,
	)
	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Info("server starting",
		zap.String("app_name", cfg.AppName),
		zap.String("env", cfg.Env),
		zap.String("addr", addr),
	)

	go gracefulShutdown(log)

	if err := engine.Run(addr); err != nil {
		log.Fatal("server stopped with error", zap.Error(err))
	}
}

func runOrderScheduleLoop(log *zap.Logger, s *service.OrderScheduleService) {
	s.RunTick(context.Background(), log)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.RunTick(context.Background(), log)
	}
}

func gracefulShutdown(log *zap.Logger) {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	sig := <-ch
	log.Info("shutdown signal received", zap.String("signal", sig.String()))
	os.Exit(0)
}
