package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"

	"freshmart/config"
	commonhandler "freshmart/internal/handler/common"
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
	} else {
		log.Warn("database dsn is empty, tx demo and auth endpoints disabled")
		authHandler = commonhandler.NewAuthHandler(cfg, nil)
	}

	engine := router.New(log, cfg, txDemoHandler, smsHandler, authHandler, uploadHandler)
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

func gracefulShutdown(log *zap.Logger) {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	sig := <-ch
	log.Info("shutdown signal received", zap.String("signal", sig.String()))
	os.Exit(0)
}
